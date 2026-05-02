import type { Request, Response } from "express";
import { prisma } from "@repo/db";
import { enqueueJob } from "../queues/jobQueue.js";

const ALLOWED_TYPES = [
  "inference", "training", "fine-tune", "embedding",
  "render", "image-gen", "video-gen", "pipeline",
] as const;
type JobType = (typeof ALLOWED_TYPES)[number];

// FUNDED = job is funded and waiting for the matchmaker to pick it up.
// Cancel sets status to FAILED; escrow release is tracked via status: 'RELEASED'.
const CANCELLABLE_STATUSES = new Set(["CREATED", "FUNDED"]);

// Submit job
export const submitJob = async (req: Request, res: Response) => {
  const clientId = (req as any).user.id;
  const { title, type, inputUri, budget, escrowTxSig, requiredVramGB, requiredGpuTier } = req.body;

  if (
    !title?.trim() ||
    !type ||
    !inputUri?.trim() ||
    !budget ||
    !escrowTxSig?.trim()
  ) {
    return res
      .status(400)
      .json({
        error: "title, type, inputUri, budget, and escrowTxSig are required",
      });
  }

  if (!ALLOWED_TYPES.includes(type as JobType)) {
    return res
      .status(400)
      .json({ error: `type must be one of: ${ALLOWED_TYPES.join(", ")}` });
  }

  const budgetNum = Number(budget);
  if (isNaN(budgetNum) || budgetNum <= 0) {
    return res.status(400).json({ error: "budget must be a positive number" });
  }

  try {
    const job = await prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          clientId,
          title:           title.trim(),
          type,
          inputUri:        inputUri.trim(),
          budget:          budgetNum,
          status:          "FUNDED",
          requiredGpuTier: requiredGpuTier ? Number(requiredGpuTier) : 0,
          ...(requiredVramGB ? { requiredVramGB: Number(requiredVramGB) } : {}),
        },
      });

      await tx.escrow.create({
        data: {
          jobId: newJob.id,
          amount: budgetNum,
          token: "SOL",
          depositTxSig: escrowTxSig.trim(),
          status: "LOCKED",
        },
      });

      await tx.jobEvent.create({
        data: {
          jobId: newJob.id,
          type: "CREATED",
          metadata: { clientId, jobType: type, budget: budgetNum },
        },
      });

      return newJob;
    });

    await enqueueJob(job.id);

    res.status(201).json({ success: true, jobId: job.id });
  } catch (err) {
    console.error("[submitJob]", err);
    res.status(500).json({ error: "Submission failed" });
  }
};

// List client jobs
export const listClientJobs = async (req: Request, res: Response) => {
  const clientId = (req as any).user.id;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  try {
    const [jobs, total] = await prisma.$transaction([
      prisma.job.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          budget: true,
          createdAt: true,
          provider: { select: { gpuModel: true, location: true } },
          escrow: { select: { status: true, amount: true } },
        },
      }),
      prisma.job.count({ where: { clientId } }),
    ]);

    res.json({ jobs, total, page, limit });
  } catch (err) {
    console.error("[listClientJobs]", err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
};

// Get single job
export const getJob = async (req: Request, res: Response) => {
  const clientId = (req as any).user.id;
  const jobId = String(req.params.id);

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        events: { orderBy: { createdAt: "asc" } },
        escrow: true,
        provider: {
          select: { gpuModel: true, vramGB: true, location: true, tier: true },
        },
      },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.clientId !== clientId)
      return res.status(403).json({ error: "Not your job" });

    res.json({ job });
  } catch (err) {
    console.error("[getJob]", err);
    res.status(500).json({ error: "Failed to fetch job" });
  }
};

// Cancel job
export const cancelJob = async (req: Request, res: Response) => {
  const clientId = (req as any).user.id;
  const jobId = String(req.params.id);

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { clientId: true, status: true },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.clientId !== clientId)
      return res.status(403).json({ error: "Not your job" });

    if (!CANCELLABLE_STATUSES.has(job.status)) {
      return res
        .status(409)
        .json({ error: `Cannot cancel a job in ${job.status} state` });
    }

    await prisma.$transaction([
      prisma.job.update({ where: { id: jobId }, data: { status: "FAILED" } }),
      prisma.escrow.update({
        where: { jobId },
        data: { status: "RELEASED" },
      }),
      prisma.jobEvent.create({
        data: { jobId, type: "CANCELLED", metadata: { cancelledBy: clientId } },
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("[cancelJob]", err);
    res.status(500).json({ error: "Cancel failed" });
  }
};

// Job Events (audit trail)
export const getJobEvents = async (req: Request, res: Response) => {
  const clientId = (req as any).user.id;
  const jobId = String(req.params.id);

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { clientId: true },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.clientId !== clientId)
      return res.status(403).json({ error: "Not your job" });

    const events = await prisma.jobEvent.findMany({
      where: { jobId },
      orderBy: { createdAt: "asc" },
    });

    res.json({ events });
  } catch (err) {
    console.error("[getJobEvents]", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};
