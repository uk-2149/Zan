import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const candidatePaths = [
  resolve(currentDir, '../.env'),
  resolve(currentDir, '../../../.env'),
]

for (const path of candidatePaths) {
  if (existsSync(path)) {
    loadEnv({ path, override: false })
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is not set`)
  }

  return value
}

export const SOLANA_RPC_URL = requireEnv('SOLANA_RPC_URL')
export const SOLANA_AUTHORITY_KEYPAIR = requireEnv('SOLANA_AUTHORITY_KEYPAIR')
export const ESCROW_PROGRAM_ID = requireEnv('ESCROW_PROGRAM_ID')
