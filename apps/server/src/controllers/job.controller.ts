import type { Request, Response } from "express";
import { prisma } from "@repo/db";
import { enqueueJob } from "../queues/jobQueue.js";
import { JOB_TYPES } from "../config/jobTypes.js";
import type { JobTypeKey } from "../config/jobTypes.js";

// submitJob
export const submitJob = async (req: Request, res: Response) => {
  const clientId = (req as any).user.id;
  const {
    title,
    type,
    dockerImage,
    inputUri,
    jobParams,
    requiredVramGB,
    budget,
    stakeSignature,
    timeLimitSecs,
  } = req.body;

  if (!title?.trim() || !type || !dockerImage?.trim() || !inputUri?.trim() || !jobParams || !budget || !stakeSignature?.trim()) {
    return res.status(400).json({
      error: "title, type, dockerImage, inputUri, jobParams, budget, and stakeSignature are required",
    });
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
          title: title.trim(),
          type,
          dockerImage: dockerImage.trim(),
          inputUri: inputUri.trim(),
          jobParams,
          budget: budgetNum,
          status: "FUNDED",
          requiredVramGB: requiredVramGB ? Number(requiredVramGB) : 4,
          timeLimitSecs: timeLimitSecs ? Number(timeLimitSecs) : 3600,
        },
      });

      await tx.escrow.create({
        data: {
          jobId: newJob.id,
          amount: budgetNum,
          token: "SOL",
          depositTxSig: stakeSignature.trim(),
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

// getJobById
export const getJobById = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
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
    
    // Security: only return job if req.user.id === job.clientId or assigned provider
    // Wait, getJobById requires JWT auth (so it's a User, not a Provider Agent)
    // To check if the user is the assigned provider, we'd need to fetch their provider record.
    // The spec says: Security: only return job if req.user.id === job.clientId (providers can also see their own assigned jobs)
    
    let isProvider = false;
    if (job.providerId) {
      const provider = await prisma.provider.findFirst({ where: { id: job.providerId, userId: userId }});
      if (provider) isProvider = true;
    }

    if (job.clientId !== userId && !isProvider) {
      return res.status(403).json({ error: "Not your job" });
    }

    res.json({ job });
  } catch (err) {
    console.error("[getJobById]", err);
    res.status(500).json({ error: "Failed to fetch job" });
  }
};

// getMyJobs
export const getMyJobs = async (req: Request, res: Response) => {
  const clientId = (req as any).user.id;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 20;
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
          finalCost: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      prisma.job.count({ where: { clientId } }),
    ]);

    res.json({ jobs, total, page, limit });
  } catch (err) {
    console.error("[getMyJobs]", err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
};

// jobComplete
export const jobComplete = async (req: Request, res: Response) => {
  const providerId = (req as any).provider.id;
  const jobId = String(req.params.id);
  const { outputUri, executionMetadata, success, errorMessage } = req.body;

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { providerId: true, retryCount: true, maxRetries: true, status: true },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.providerId !== providerId) {
      return res.status(403).json({ error: "Not your assigned job" });
    }
    if (job.status !== "RUNNING" && job.status !== "ASSIGNED") {
      return res.status(400).json({ error: `Cannot complete job in ${job.status} state` });
    }

    if (success) {
      // TODO: trigger verification system here
      // For now just mark completed and release payment
      await prisma.job.update({
        where: { id: jobId },
        data: { 
          status: 'COMPLETED',
          outputUri,
          executionMetadata,
          completedAt: new Date()
        }
      });

      // TODO: call Anchor escrow release instruction here
      // For now just update escrow status in DB
      await prisma.escrow.update({
        where: { jobId },
        data: { status: 'RELEASED', releasedAt: new Date() }
      });

      await prisma.jobEvent.create({
        data: {
          jobId,
          type: "COMPLETED",
          metadata: { providerId, outputUri },
        },
      });

    } else {
      const newRetryCount = job.retryCount + 1;
      const isPermanentFail = newRetryCount >= job.maxRetries;
      
      const newStatus = isPermanentFail ? "FAILED" : "FUNDED";

      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: newStatus,
          retryCount: newRetryCount,
          executionMetadata: executionMetadata || { error: errorMessage },
          completedAt: isPermanentFail ? new Date() : null,
          providerId: isPermanentFail ? job.providerId : null // clear provider if we push back to queue
        },
      });

      if (isPermanentFail) {
        await prisma.escrow.update({
          where: { jobId },
          data: { status: 'REFUNDED', refundedAt: new Date() } // Refund client if fails permanently
        });
      } else {
        await enqueueJob(jobId);
      }

      await prisma.jobEvent.create({
        data: {
          jobId,
          type: isPermanentFail ? "FAILED" : "RETRY",
          metadata: { providerId, error: errorMessage, retryCount: newRetryCount },
        },
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[jobComplete]", err);
    res.status(500).json({ error: "Job completion failed" });
  }
};

// updateJobStatus (internal matchmaker)
export const updateJobStatus = async (req: Request, res: Response) => {
  const jobId = String(req.params.id);
  const { status, providerId } = req.body;

  try {
    const updateData: any = { status };
    if (status === "ASSIGNED" && providerId) {
      updateData.providerId = providerId;
      updateData.startedAt = new Date();
    }

    await prisma.$transaction([
      prisma.job.update({ where: { id: jobId }, data: updateData }),
      prisma.jobEvent.create({
        data: {
          jobId,
          type: "STATUS_UPDATE",
          metadata: { status, providerId },
        },
      }),
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error("[updateJobStatus]", err);
    res.status(500).json({ error: "Failed to update status" });
  }
};

// cancelJob
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

    if (job.status !== "CREATED" && job.status !== "FUNDED") {
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
