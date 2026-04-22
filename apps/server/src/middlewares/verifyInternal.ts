// src/middlewares/verifyInternal.ts
import type { Request, Response, NextFunction } from 'express'
import { requireEnv } from '../env.js'

export function verifyInternal(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers['x-internal-secret']
  if (!secret || secret !== requireEnv('INTERNAL_SECRET')) {
    return res.status(403).json({ error: 'Internal only' })
  }
  next()
}
