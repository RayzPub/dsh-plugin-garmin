import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import { locateMonkeyC } from './garmin-build.js'
import { ensureDeveloperKey } from './garmin-key.js'

const execAsync = promisify(exec)

export interface EnvironmentStatus {
  ready: boolean
  javaInstalled: boolean
  javaVersion?: string
  developerKeyExists: boolean
  developerKeyPath?: string
  monkeycInstalled: boolean
  monkeycPath?: string
  deviceDefinitionsReady: boolean
  summary: string
  actionItems: string[]
}

export interface SetupResult {
  success: boolean
  stepsCompleted: string[]
  logs: string[]
  error?: string
}

/**
 * Checks current Linux development and compilation environment for Garmin Connect IQ
 */
export async function checkGarminEnvironment(customSdkPath?: string): Promise<EnvironmentStatus> {
  const actionItems: string[] = []
  let javaInstalled = false
  let javaVersion: string | undefined

  // 1. Check Java
  try {
    const { stderr, stdout } = await execAsync('java -version')
    javaInstalled = true
    const versionMatch = (stderr || stdout).match(/version "([^"]+)"|openjdk (\S+)/i)
    javaVersion = versionMatch ? (versionMatch[1] || versionMatch[2]) : 'installed'
  } catch {
    actionItems.push('安装 Java 运行时环境: sudo apt-get install -y default-jre-headless (OpenJDK 8+)')
  }

  // 2. Check Developer Key
  const defaultKeyPath = path.join(os.homedir(), '.Garmin', 'ConnectIQ', 'developer_key.der')
  let developerKeyExists = false
  try {
    await fs.access(defaultKeyPath)
    developerKeyExists = true
  } catch {
    actionItems.push('生成 Garmin 开发者签名密钥 (可通过 setup 命令一键生成)')
  }

  // 3. Check monkeyc
  const monkeycPath = await locateMonkeyC(customSdkPath)
  const monkeycInstalled = Boolean(monkeycPath)
  if (!monkeycInstalled) {
    actionItems.push('安装 Garmin Connect IQ SDK (Linux 版本) 至 ~/.Garmin/ConnectIQ/Sdks/ 或指定 PATH')
  }

  // 4. Check device definitions (e.g. fenix7)
  const devicesDir = path.join(os.homedir(), '.Garmin', 'ConnectIQ', 'Devices', 'fenix7')
  let deviceDefinitionsReady = false
  try {
    await fs.access(devicesDir)
    deviceDefinitionsReady = true
  } catch {
    // If monkeyc is installed inside an SDK with built-in devices or custom path
    if (monkeycPath && monkeycPath.includes('Sdks')) {
      const parentSdkDevices = path.join(path.dirname(path.dirname(monkeycPath)), 'share', 'devices', 'fenix7')
      try {
        await fs.access(parentSdkDevices)
        deviceDefinitionsReady = true
      } catch {}
    }
    if (!deviceDefinitionsReady) {
      actionItems.push('配置目标设备器件包 (Fenix 7 device definition)')
    }
  }

  const ready = javaInstalled && developerKeyExists && monkeycInstalled

  let summary = ready
    ? 'Garmin Connect IQ Linux 编译环境已完全就绪，可直接编译 .prg 表盘固件。'
    : `Garmin 编译环境尚未就绪 (缺少: ${[!javaInstalled && 'Java', !developerKeyExists && '签名私钥', !monkeycInstalled && 'monkeyc 编译器'].filter(Boolean).join(', ')})。`

  return {
    ready,
    javaInstalled,
    javaVersion,
    developerKeyExists,
    developerKeyPath: developerKeyExists ? defaultKeyPath : undefined,
    monkeycInstalled,
    monkeycPath: monkeycPath || undefined,
    deviceDefinitionsReady,
    summary,
    actionItems
  }
}

/**
 * Automatically initializes and prepares the Linux Garmin environment
 */
export async function setupGarminEnvironment(options?: { customSdkPath?: string }): Promise<SetupResult> {
  const stepsCompleted: string[] = []
  const logs: string[] = []

  try {
    // Step 1: Ensure Developer Key
    logs.push('正在检查并生成 Garmin 开发者数字签名私钥...')
    const keyInfo = await ensureDeveloperKey()
    stepsCompleted.push(`开发者密钥准备就绪: ${keyInfo.keyPath} (${keyInfo.isGenerated ? '全新生成' : '复用已有'})`)
    logs.push(`密钥路径: ${keyInfo.keyPath}`)

    // Step 2: Ensure ~/.Garmin/ConnectIQ directory structure
    const baseDir = path.join(os.homedir(), '.Garmin', 'ConnectIQ')
    await fs.mkdir(path.join(baseDir, 'Sdks'), { recursive: true })
    await fs.mkdir(path.join(baseDir, 'Devices', 'fenix7'), { recursive: true })
    stepsCompleted.push('初始化 ~/.Garmin/ConnectIQ 目录规范')

    // Step 3: Check Java runtime
    try {
      await execAsync('java -version')
      stepsCompleted.push('Java 运行时环境检测通过')
      logs.push('Java JRE 已就绪。')
    } catch {
      logs.push('警告: 未检测到系统 Java 运行时。由于需要 root 权限，请在终端执行: sudo apt-get install -y default-jre-headless')
    }

    // Step 4: Check or guide SDK
    const monkeyc = await locateMonkeyC(options?.customSdkPath)
    if (monkeyc) {
      stepsCompleted.push(`Connect IQ 编译器就绪: ${monkeyc}`)
      logs.push(`检测到有效编译器: ${monkeyc}`)
    } else {
      logs.push('Connect IQ SDK 准备提示: 可将 Linux 版 SDK 解压至 ~/.Garmin/ConnectIQ/Sdks/current')
    }

    return {
      success: true,
      stepsCompleted,
      logs
    }
  } catch (err: any) {
    return {
      success: false,
      stepsCompleted,
      logs,
      error: err.message || String(err)
    }
  }
}
