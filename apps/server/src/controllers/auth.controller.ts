// src/controllers/auth.controller.ts
import type { Request, Response } from 'express'
import { prisma } from '@repo/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { requireEnv } from '../env.js'
import crypto from 'crypto'
import { PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'

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
      select: { id: true, name: true, email: true, role: true, walletAddress: true }
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
      user: { id: user.id, name: user.name, email: user.email, role: user.role, walletAddress: user.walletAddress }
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

export const getWalletChallenge = async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  
  const nonce = crypto.randomBytes(32).toString('hex')
  const message = `Zan wallet verification\nNonce: ${nonce}\nTimestamp: ${Date.now()}`
  
  await prisma.user.update({
    where: { id: userId },
    data: { 
      walletNonce: nonce,
      walletNonceExpiry: new Date(Date.now() + 5 * 60 * 1000)
    }
  })
  
  res.json({ message, nonce })
}

export const updateWallet = async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  const { walletAddress, signature, message } = req.body

  if (!walletAddress || !signature || !message) {
    return res.status(400).json({ error: 'walletAddress, signature and message required' })
  }

  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { walletNonce: true, walletNonceExpiry: true }
  })

  if (!user?.walletNonce || !user.walletNonceExpiry || user.walletNonceExpiry < new Date()) {
    return res.status(400).json({ error: 'Challenge expired — request a new one' })
  }

  if (!message.includes(user.walletNonce)) {
    return res.status(400).json({ error: 'Invalid challenge message' })
  }

  try {
    const publicKey = new PublicKey(walletAddress)
    const signatureBytes = bs58.decode(signature)
    const messageBytes = new TextEncoder().encode(message)
    
    const valid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    )

    if (!valid) {
      return res.status(401).json({ error: 'Signature verification failed' })
    }
  } catch (err) {
    return res.status(400).json({ error: 'Invalid wallet address or signature' })
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { walletAddress, NOT: { id: userId } }
    })
    if (existing) {
      return res.status(409).json({ error: 'Wallet already linked to another account' })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        walletAddress,
        walletNonce: null,
        walletNonceExpiry: null
      },
      select: { id: true, name: true, email: true, walletAddress: true }
    })

    res.json({ success: true, user: updatedUser })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update wallet' })
  }
}
