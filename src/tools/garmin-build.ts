import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import { ensureDeveloperKey } from './garmin-key.js'

const execFileAsync = promisify(execFile)

export const ALLOWED_GARMIN_DEVICES = ['fenix7', 'fenix7solar', 'fenix7pro'] as const
export type GarminDevice = (typeof ALLOWED_GARMIN_DEVICES)[number]

/**
 * Quotes a string safely for POSIX sh/bash using single quotes.
 * Any embedded single quote is escaped as '\''.
 */
export function quoteSh(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`
}

export interface BuildGarminOptions {
  projectDir: string
  device?: string
  outputPrg?: string
  sdkPath?: string
  developerKeyPath?: string
  signal?: AbortSignal
}

export interface BuildGarminResult {
  success: boolean
  prgPath?: string
  error?: string
  stdout: string
  stderr: string
  diagnostics: string[]
}

/**
 * Builds the exact shell command string for monkeyc using POSIX single-quote escaping.
 */
export function buildMonkeycCommand(options: {
  monkeycPath: string
  jungleFile: string
  outputPrg: string
  device: string
  keyPath: string
}): string {
  return `${quoteSh(options.monkeycPath)} -f ${quoteSh(options.jungleFile)} -o ${quoteSh(options.outputPrg)} -d ${quoteSh(options.device)} -y ${quoteSh(options.keyPath)} -w`
}

/**
 * Finds monkeyc executable in PATH or standard Garmin SDK paths on Linux / macOS
 * using filesystem inspections without child process execution.
 */
export async function locateMonkeyC(customSdkPath?: string): Promise<string | null> {
  // 1. Check customSdkPath
  if (customSdkPath) {
    const candidate = path.join(customSdkPath, 'bin', 'monkeyc')
    try {
      await fs.access(candidate)
      return candidate
    } catch {}
  }

  // 2. Check if monkeyc is in system PATH using filesystem access
  const pathEnv = process.env.PATH || ''
  const pathDirs = pathEnv.split(path.delimiter)
  for (const dir of pathDirs) {
    if (!dir) continue
    const candidate = path.join(dir, 'monkeyc')
    try {
      await fs.access(candidate)
      return candidate
    } catch {}
  }

  // 3. Check common Linux and macOS SDK installation directories
  const home = os.homedir()
  const sdksBases = [
    path.join(home, '.Garmin', 'ConnectIQ', 'Sdks'),
    path.join(home, 'Library', 'Application Support', 'Garmin', 'ConnectIQ', 'Sdks')
  ]
  for (const sdksBase of sdksBases) {
    try {
      const dirs = await fs.readdir(sdksBase)
      for (const d of dirs.reverse()) {
        const candidate = path.join(sdksBase, d, 'bin', 'monkeyc')
        try {
          await fs.access(candidate)
          return candidate
        } catch {}
      }
    } catch {}
  }

  return null
}

/**
 * Compiles a Garmin project to a runnable/installable .prg binary.
 * Validates device against allowed hardware target enum and uses execFile with explicit argv
 * to prevent command injection.
 */
export async function buildGarminProject(options: BuildGarminOptions): Promise<BuildGarminResult> {
  const device = options.device || 'fenix7'

  // Validate device against structural whitelist enum
  if (!ALLOWED_GARMIN_DEVICES.includes(device as any)) {
    return {
      success: false,
      error: `Invalid or untrusted device ID: "${device}". Allowed devices: ${ALLOWED_GARMIN_DEVICES.join(', ')}`,
      stdout: '',
      stderr: '',
      diagnostics: [`Please specify a valid device from: ${ALLOWED_GARMIN_DEVICES.join(', ')}`]
    }
  }

  const resolvedProjectDir = path.resolve(options.projectDir)
  const resolvedOutputPrg = options.outputPrg
    ? (path.isAbsolute(options.outputPrg) ? path.resolve(options.outputPrg) : path.resolve(resolvedProjectDir, options.outputPrg))
    : path.join(resolvedProjectDir, 'bin', `${device}.prg`)

  await fs.mkdir(path.dirname(resolvedOutputPrg), { recursive: true })

  // 1. Ensure developer key exists
  let keyPath = options.developerKeyPath
  if (!keyPath) {
    try {
      const keyInfo = await ensureDeveloperKey()
      keyPath = keyInfo.keyPath
    } catch (err: any) {
      return {
        success: false,
        error: `Developer key setup failed: ${err.message}`,
        stdout: '',
        stderr: '',
        diagnostics: ['Failed to create or find developer_key.der']
      }
    }
  }

  // 2. Locate monkeyc compiler
  const monkeycPath = await locateMonkeyC(options.sdkPath)
  if (!monkeycPath) {
    return {
      success: false,
      error: 'Garmin Connect IQ SDK compiler (monkeyc) not found. Please install the Linux/macOS SDK or set Garmin SDK path.',
      stdout: '',
      stderr: '',
      diagnostics: [
        'monkeyc is not in PATH and not found in ~/.Garmin/ConnectIQ/Sdks/ or macOS Application Support',
        'Tip: Download the Connect IQ SDK Manager or install the SDK to ~/.Garmin/ConnectIQ/Sdks/'
      ]
    }
  }

  // 3. Verify Java runtime exists using execFile (no shell)
  try {
    await execFileAsync('java', ['-version'])
  } catch {
    return {
      success: false,
      error: 'Java Runtime (JRE) not found in Linux environment. Connect IQ compiler requires JRE 8+.',
      stdout: '',
      stderr: '',
      diagnostics: [
        'Run: sudo apt-get install -y default-jre-headless (or openjdk-17-jre-headless) to enable Connect IQ builds.'
      ]
    }
  }

  // 4. Execute monkeyc via execFile directly passing arguments array (no shell interpolation)
  const jungleFile = path.join(resolvedProjectDir, 'monkey.jungle')
  const args = [
    '-f', jungleFile,
    '-o', resolvedOutputPrg,
    '-d', device,
    '-y', keyPath,
    '-w'
  ]

  try {
    const { stdout, stderr } = await execFileAsync(monkeycPath, args, {
      cwd: resolvedProjectDir,
      signal: options.signal
    })
    return {
      success: true,
      prgPath: resolvedOutputPrg,
      stdout: String(stdout || ''),
      stderr: String(stderr || ''),
      diagnostics: []
    }
  } catch (err: any) {
    const stdout = String(err.stdout || '')
    const stderr = String(err.stderr || '')
    const combined = `${stdout}\n${stderr}\n${err.message || ''}`

    // Parse diagnostic messages from monkeyc
    const diagnostics: string[] = []
    const lines = combined.split('\n')
    for (const line of lines) {
      if (line.includes('ERROR:') || line.includes('WARNING:') || line.includes('Out of memory')) {
        diagnostics.push(line.trim())
      }
    }

    return {
      success: false,
      error: `monkeyc compilation failed with exit code ${err.code ?? 'unknown'}`,
      stdout,
      stderr,
      diagnostics: diagnostics.length > 0 ? diagnostics : [combined.slice(0, 500)]
    }
  }
}
