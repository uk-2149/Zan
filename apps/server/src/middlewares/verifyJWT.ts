// src/middlewares/verifyJWT.ts
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { requireEnv } from '../env.js'

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }

  const token = auth.split(' ')[1]
  try {
    if(!token) return  res.status(401).json({ error: 'No token found' })
    const payload = jwt.verify(token, requireEnv('JWT_SECRET')) as unknown as { userId: string };
    (req as any).user = { id: payload.userId }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
