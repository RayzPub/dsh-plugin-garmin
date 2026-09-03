import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export interface KeyInfo {
  keyPath: string
  isGenerated: boolean
}

/**
 * Ensures a valid Garmin Connect IQ developer_key.der exists on Linux.
 * Default location: ~/.Garmin/ConnectIQ/developer_key.der
 */
export async function ensureDeveloperKey(customKeyDir?: string): Promise<KeyInfo> {
  const targetDir = customKeyDir || path.join(os.homedir(), '.Garmin', 'ConnectIQ')
  const keyPath = path.join(targetDir, 'developer_key.der')
  const pemPath = path.join(targetDir, 'developer_key.pem')

  // Check if .der key already exists
  try {
    await fs.access(keyPath)
    return { keyPath, isGenerated: false }
  } catch {
    // Key does not exist, need to create directory and generate it
  }

  await fs.mkdir(targetDir, { recursive: true })

  // Try generating with openssl CLI
  try {
    // 1. Generate RSA 4096 PEM private key
    await execAsync(`openssl genrsa -out "${pemPath}" 4096`)
    // 2. Convert to unencrypted PKCS#8 DER format required by monkeyc
    await execAsync(`openssl pkcs8 -topk8 -inform PEM -outform DER -in "${pemPath}" -out "${keyPath}" -nocrypt`)
    // Clean up temporary PEM file for security
    await fs.unlink(pemPath).catch(() => {})
    return { keyPath, isGenerated: true }
  } catch (err: any) {
    throw new Error(`Failed to generate Garmin developer key: ${err.message || err}`)
  }
}
