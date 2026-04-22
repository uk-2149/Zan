// src/controllers/auth.controller.ts
import type { Request, Response } from 'express'
import { prisma } from '@repo/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { requireEnv } from '../env.js'

function signToken(userId: string) {
  return jwt.sign({ userId }, requireEnv('JWT_SECRET'), { expiresIn: '30d' })
}

export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password required' })
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: 'PROVIDER' },
      select: { id: true, name: true, email: true, role: true }
    })

    const token = signToken(user.id)
    res.status(201).json({ token, userId: user.id, user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Registration failed' })
  }
}

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = signToken(user.id)
    res.json({
      token,
      userId: user.id,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Login failed' })
  }
}

export const getMe = async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, walletAddress: true }
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ user })
  } catch {
    res.status(500).json({ error: 'Failed' })
  }
}
