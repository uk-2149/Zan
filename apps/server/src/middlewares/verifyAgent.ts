// apps/server/src/middleware/verifyAgent.ts
import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@repo/db'
import { verifySignature, buildMessage } from '@repo/crypto'

const TIMESTAMP_WINDOW_MS = 60_000 // reject requests older than 60s

export async function verifyAgent(req: Request, res: Response, next: NextFunction) {
  const providerId = req.headers['x-agent-id'] as string
  const signature  = req.headers['x-agent-sig'] as string
  const tsRaw      = req.headers['x-agent-timestamp'] as string

  // 1. All headers must be present
  if (!providerId || !signature || !tsRaw) {
    return res.status(401).json({ error: 'Missing agent auth headers' })
  }

  // 2. Timestamp must be recent — kills replay attacks
  const timestamp = parseInt(tsRaw)
  if (isNaN(timestamp) || Math.abs(Date.now() - timestamp) > TIMESTAMP_WINDOW_MS) {
    return res.status(401).json({ error: 'Request timestamp expired' })
  }

  // 3. Look up provider and their registered public key
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true, agentPublicKey: true, status: true }
  })

  if (!provider) {
    return res.status(401).json({ error: 'Unknown provider' })
  }

  if (!provider.agentPublicKey) {
    return res.status(401).json({ error: 'Agent not registered — run /agent/connect first' })
  }

  if (provider.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Provider suspended' })
  }

  // 4. Verify the signature
  const action  = req.path.replace(/\//g, '_')
  const message = buildMessage(providerId, action, timestamp)
  const valid   = verifySignature(message, signature, provider.agentPublicKey)

  if (!valid) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // 5. Attach provider to request for controllers to use
  ;(req as any).provider = provider
  next()
}