// packages/crypto/src/index.ts
import * as crypto from 'crypto'

// Generate keypair for agent (called once on first install)
export function generateAgentKeypair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  return { privateKey, publicKey }
}

// Agent calls this before every request
// message = what we're signing (providerId + timestamp + action)
export function signMessage(message: string, privateKeyPem: string): string {
  const privateKey = crypto.createPrivateKey(privateKeyPem)
  const signature = crypto.sign(null, Buffer.from(message), privateKey)
  return signature.toString('base64')
}

// Server calls this to verify
export function verifySignature(message: string, signature: string, publicKeyPem: string): boolean {
  try {
    const publicKey = crypto.createPublicKey(publicKeyPem)
    return crypto.verify(
      null,
      Buffer.from(message),
      publicKey,
      Buffer.from(signature, 'base64')
    )
  } catch {
    return false
  }
}

// What message to sign — timestamp prevents replay attacks
// Agent and server must agree on this exact format
export function buildMessage(providerId: string, action: string, timestamp: number): string {
  return `${providerId}:${action}:${timestamp}`
}