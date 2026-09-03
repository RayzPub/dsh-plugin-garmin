import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import * as crypto from 'node:crypto'
import { promisify } from 'node:util'

const generateKeyPairAsync = promisify(crypto.generateKeyPair)

export interface KeyInfo {
  keyPath: string
  isGenerated: boolean
}

/**
 * Ensures a valid Garmin Connect IQ developer_key.der exists on Linux/macOS.
 * Default location: ~/.Garmin/ConnectIQ/developer_key.der
 * Generated in-process using node:crypto without openssl child process or shell execution.
 */
export async function ensureDeveloperKey(customKeyDir?: string): Promise<KeyInfo> {
  const targetDir = customKeyDir || path.join(os.homedir(), '.Garmin', 'ConnectIQ')
  const keyPath = path.join(targetDir, 'developer_key.der')

  // Check if .der key already exists
  try {
    await fs.access(keyPath)
    return { keyPath, isGenerated: false }
  } catch {
    // Key does not exist, need to create directory and generate it
  }

  await fs.mkdir(targetDir, { recursive: true })

  // Generate RSA-4096 key in-process using node:crypto
  try {
    const { privateKey } = await generateKeyPairAsync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' }
    })
    await fs.writeFile(keyPath, privateKey, { mode: 0o600 })
    return { keyPath, isGenerated: true }
  } catch (err: any) {
    throw new Error(`Failed to generate Garmin developer key: ${err.message || err}`)
  }
}
