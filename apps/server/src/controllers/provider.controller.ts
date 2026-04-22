// src/controllers/provider.controller.ts
import type { Request, Response } from 'express'
import { prisma } from '@repo/db'
import type { HardwareInfo, HeartbeatPayload } from '@repo/types'

// ── Register ──────────────────────────────────────────────────────
export const registerProvider = async (req: Request, res: Response) => {
  const userId = (req as any).user.id  // from verifyJWT
  console.log("userid:", userId);
  const { hardwareInfo, stakeSignature, stakedAmount, pricePerHour }:
    {
      hardwareInfo: HardwareInfo
      stakeSignature: string
      stakedAmount: number
      pricePerHour: number
    } = req.body

  if (!hardwareInfo || !stakeSignature || !stakedAmount || !pricePerHour) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // One provider per user
    const existing = await prisma.provider.findFirst({ where: { userId } })
    if (existing) {
      return res.status(409).json({ error: 'Machine already registered for this account' })
    }

    const provider = await prisma.provider.create({
      data: {
        userId,
        gpuModel:          hardwareInfo.gpuModel,
        vramGB:            hardwareInfo.vramGB,
        cudaVersion:       hardwareInfo.cudaVersion,
        driverVersion:     hardwareInfo.driverVersion,
        computeCapability: hardwareInfo.computeCapability,
        downloadMbps:      hardwareInfo.downloadMbps,
        uploadMbps:        hardwareInfo.uploadMbps,
        pingMs:            hardwareInfo.pingMs,
        pricePerHour,
        stakedAmount,
        stakeSignature,
        stakeLockedUntil:  new Date(Date.now() + 48 * 60 * 60 * 1000),
        status:            'PENDING',
        tier:              0,
      }
    })

    await prisma.stakeTransaction.create({
      data: {
        providerId:  provider.id,
        type:        'DEPOSIT',
        amount:      stakedAmount,
        balanceAfter: stakedAmount,
        txSig:       stakeSignature,
        note:        'Initial stake deposit on onboarding'
      }
    })

    await prisma.providerMetric.create({
      data: { providerId: provider.id }
    })

    res.status(201).json({ success: true, providerId: provider.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Registration failed' })
  }
}

// ── Connect Agent (first launch handshake) ────────────────────────
export const connectAgent = async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  const { providerId, agentPublicKey, agentVersion } = req.body

  if (!providerId || !agentPublicKey) {
    return res.status(400).json({ error: 'providerId and agentPublicKey required' })
  }

  try {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { userId: true, agentPublicKey: true }
    })

    if (!provider) return res.status(404).json({ error: 'Provider not found' })

    // Ownership check — prevents hijacking
    if (provider.userId !== userId) {
      return res.status(403).json({ error: 'Not your provider' })
    }

    // Key already registered — prevent second machine
    if (provider.agentPublicKey) {
      return res.status(409).json({ error: 'Agent already registered' })
    }

    const updated = await prisma.provider.update({
      where: { id: providerId },
      data: {
        agentPublicKey,
        agentVersion,
        status:        'ACTIVE',
        lastHeartbeat: new Date()
      }
    })

    res.json({ success: true, tier: updated.tier })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Agent connect failed' })
  }
}

// ── Heartbeat ─────────────────────────────────────────────────────
// provider injected by verifyAgent middleware
export const heartbeat = async (req: Request, res: Response) => {
  const provider = (req as any).provider
  const { gpuUtilization, vramUsedMb, temperatureC, isBusy } = req.body

  try {
    await prisma.provider.update({
      where: { id: provider.id },
      data: {
        lastHeartbeat: new Date(),
        status:        isBusy ? 'BUSY' : 'ACTIVE'
      }
    })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Heartbeat failed' })
  }
}

// ── Set Status (agent toggles online/offline from UI) ─────────────
export const setStatus = async (req: Request, res: Response) => {
  const provider = (req as any).provider
  const { status } = req.body

  const allowed = ['ACTIVE', 'OFFLINE']
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` })
  }

  try {
    const updated = await prisma.provider.update({
      where: { id: provider.id },
      data: { status }
    })
    res.json({ success: true, provider: updated })
  } catch {
    res.status(500).json({ error: 'Status update failed' })
  }
}

// ── Get my provider (agent checks on startup) ─────────────────────
export const getMyProvider = async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  try {
    const provider = await prisma.provider.findFirst({
      where: { userId },
      include: { metrics: true }
    })
    res.json({ provider: provider ?? null })
  } catch {
    res.status(500).json({ error: 'Failed' })
  }
}

// ── Get provider by ID (dashboard polling) ───────────────────────
export const getProviderById = async (req: Request, res: Response) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: String(req.params.id) },
      include: {
        metrics: true,
        stakeTransactions: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    })
    if (!provider) return res.status(404).json({ error: 'Not found' })
    res.json({ provider })
  } catch {
    res.status(500).json({ error: 'Fetch failed' })
  }
}

// ── Get stats (dashboard numbers) ────────────────────────────────
export const getProviderStats = async (req: Request, res: Response) => {
  const provider = (req as any).provider  // from verifyAgent

  try {
    const metrics = await prisma.providerMetric.findUnique({
      where: { providerId: provider.id }
    })

    // Recent jobs
    const recentJobs = await prisma.job.findMany({
      where:   { providerId: provider.id },
      orderBy: { createdAt: 'desc' },
      take:    10,
      select: {
        id: true, type: true, status: true,
        finalCost: true, completedAt: true, createdAt: true
      }
    })

    res.json({
      success:     true,
      totalEarned: metrics?.totalEarnedSol ?? 0,
      metrics,
      recentJobs
    })
  } catch {
    res.status(500).json({ error: 'Stats fetch failed' })
  }
}

// ── Available providers (matchmaker) ─────────────────────────────
export const getAvailableProviders = async (req: Request, res: Response) => {
  const minVram = Number(req.query.minVram) || 0
  const minTier = Number(req.query.minTier) || 0

  try {
    const providers = await prisma.provider.findMany({
      where: {
        status:        'ACTIVE',
        vramGB:        { gte: minVram },
        tier:          { gte: minTier },
        lastHeartbeat: { gte: new Date(Date.now() - 60_000) }
      },
      orderBy: [
        { tier: 'desc' },
        { reputationScore: 'desc' }
      ],
      select: {
        id: true, gpuModel: true, vramGB: true,
        tier: true, reputationScore: true, pricePerHour: true,
        user: { select: { walletAddress: true } }
      }
    })
    res.json({ providers })
  } catch {
    res.status(500).json({ error: 'Query failed' })
  }
}
