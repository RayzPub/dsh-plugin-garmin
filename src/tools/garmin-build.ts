import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import { ensureDeveloperKey } from './garmin-key.js'

const execAsync = promisify(exec)

export interface BuildGarminOptions {
  projectDir: string
  device?: string
  outputPrg?: string
  sdkPath?: string
  developerKeyPath?: string
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
 * Finds monkeyc executable in PATH or standard Garmin SDK paths on Linux
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

  // 2. Check if monkeyc is in system PATH
  try {
    const { stdout } = await execAsync('which monkeyc')
    if (stdout.trim()) {
      return stdout.trim()
    }
  } catch {}

  // 3. Check common Linux SDK installation directories (~/.Garmin/ConnectIQ/Sdks/*/bin/monkeyc)
  const home = os.homedir()
  const sdksBase = path.join(home, '.Garmin', 'ConnectIQ', 'Sdks')
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

  return null
}

/**
 * Compiles a Garmin project to a runnable/installable .prg binary on Linux
 */
export async function buildGarminProject(options: BuildGarminOptions): Promise<BuildGarminResult> {
  const device = options.device || 'fenix7'
  const outputPrg = options.outputPrg || path.join(options.projectDir, 'bin', `${device}.prg`)
  await fs.mkdir(path.dirname(outputPrg), { recursive: true })

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
      error: 'Garmin Connect IQ SDK compiler (monkeyc) not found. Please install the Linux SDK or set Garmin SDK path.',
      stdout: '',
      stderr: '',
      diagnostics: [
        'monkeyc is not in PATH and not found in ~/.Garmin/ConnectIQ/Sdks/',
        'Tip: Download the Connect IQ SDK Manager or install the SDK to ~/.Garmin/ConnectIQ/Sdks/'
      ]
    }
  }

  // 3. Verify Java runtime exists
  try {
    await execAsync('java -version')
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

  // 4. Execute monkeyc
  const jungleFile = path.join(options.projectDir, 'monkey.jungle')
  const cmd = `"${monkeycPath}" -f "${jungleFile}" -o "${outputPrg}" -d ${device} -y "${keyPath}" -w`

  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd: options.projectDir })
    return {
      success: true,
      prgPath: outputPrg,
      stdout,
      stderr,
      diagnostics: []
    }
  } catch (err: any) {
    const stdout = err.stdout || ''
    const stderr = err.stderr || ''
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
