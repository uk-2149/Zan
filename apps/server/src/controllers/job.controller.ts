import type { Request, Response } from "express";
import { prisma } from "@repo/db";
import * as solanaService from "../services/solana.service.js";
import { enqueueJob } from "../queues/jobQueue.js";
import { JOB_TYPES } from "../config/jobTypes.js";
import type { JobTypeKey } from "../config/jobTypes.js";
import { CONTAINERS, generateReadSASUrl } from "../lib/azure.js";
import { sendCancelToProvider } from "../ws/server.js";

const LAMPORTS_PER_SOL = 1_000_000_000;

function extractAzureBlobName(uri: string, container: string): string | null {
  try {
    const parsed = new URL(uri);
    const prefix = `/${container}/`;
    if (!parsed.pathname.startsWith(prefix)) return null;
    return parsed.pathname.slice(prefix.length);
  } catch {
    return null;
  }
}

async function maybePresignAzureUri(uri: string | null, container: string): Promise<string | null> {
  if (!uri) return null;
  const blobName = extractAzureBlobName(uri, container);
  if (!blobName) return uri;
  try {
    return await generateReadSASUrl(container, blobName);
  } catch {
    return uri;
  }
}

// prepareJobSubmit
export const prepareJobSubmit = async (req: Request, res: Response) => {
  const clientId = (req as any).user.id;
  const {
    title,
    type,
    dockerImage,
    inputUri,
    clientWalletAddress,
    jobParams,
    requiredVramGB,
    requiredGpuTier,
    budget,
    timeLimitSecs,
  } = req.body;

  if (!title?.trim() || !type || !dockerImage?.trim() || !inputUri?.trim() || !jobParams || !budget || !clientWalletAddress?.trim()) {
    return res.status(400).json({
      error: "title, type, dockerImage, inputUri, jobParams, budget, and clientWalletAddress are required",
    });
  }

  const budgetNum = Number(budget);
  if (isNaN(budgetNum) || budgetNum <= 0) {
    return res.status(400).json({ error: "budget must be a positive number" });
  }

  const typeConfig = JOB_TYPES[type as JobTypeKey];
  if (!typeConfig) {
    return res.status(400).json({ error: "Unsupported job type" });
  }

  const requestedRequiredVramGB =
    requiredVramGB === undefined || requiredVramGB === null || requiredVramGB === ""
      ? typeConfig.minVramGB
      : Number(requiredVramGB);

  if (Number.isNaN(requestedRequiredVramGB) || requestedRequiredVramGB < 0) {
    return res.status(400).json({ error: "requiredVramGB must be >= 0" });
  }
  const parsedRequiredVramGB = Math.max(typeConfig.minVramGB, requestedRequiredVramGB);

  const parsedRequiredGpuTier =
    requiredGpuTier === undefined || requiredGpuTier === null || requiredGpuTier === ""
      ? 0
      : Number(requiredGpuTier);

  if (!Number.isInteger(parsedRequiredGpuTier) || parsedRequiredGpuTier < 0 || parsedRequiredGpuTier > 2) {
    return res.status(400).json({ error: "requiredGpuTier must be 0, 1, or 2" });
  }

  try {
    const job = await prisma.job.create({
      data: {
        clientId,
        title: title.trim(),
        type,
        dockerImage: dockerImage.trim(),
        inputUri: inputUri.trim(),
        jobParams,
        budget: budgetNum,
        status: "CREATED",
        requiredVramGB: parsedRequiredVramGB,
        requiredGpuTier: parsedRequiredGpuTier,
        timeLimitSecs: timeLimitSecs ? Number(timeLimitSecs) : 3600,
      },
    });

    await prisma.jobEvent.create({
      data: {
        jobId: job.id,
        type: "CREATED",
        metadata: { clientId, clientWalletAddress, jobType: type, budget: budgetNum },
      },
    });

    res.status(201).json({ success: true, jobId: job.id, jobNumericId: job.jobNumericId.toString() });
  } catch (err) {
    console.error("[prepareJobSubmit]", err);
    res.status(500).json({ error: "Could not prepare job submission" });
  }
};

// submitJob
export const submitJob = async (req: Request, res: Response) => {
  const clientId = (req as any).user.id;
  const { jobId, stakeSignature, clientWalletAddress } = req.body;

  if (!jobId?.trim() || !stakeSignature?.trim() || !clientWalletAddress?.trim()) {
    return res.status(400).json({ error: "jobId, stakeSignature, and clientWalletAddress are required" });
  }

  try {
    const job = await prisma.job.findUnique({ where: { id: String(jobId) } });
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    if (job.clientId !== clientId) {
      return res.status(403).json({ error: "Not your job" });
    }
    if (job.status !== "CREATED") {
      return res.status(400).json({ error: "Job can only be funded from CREATED state" });
    }

    const escrowOk = await solanaService.verifyJobEscrow(
      Number(job.jobNumericId),
      clientWalletAddress,
      Math.round(Number(job.budget) * LAMPORTS_PER_SOL),
    );

    if (!escrowOk) {
      return res.status(400).json({ error: 'Invalid or missing escrow transaction on Solana' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: job.id },
        data: { 
          status: "FUNDED",
          clientWalletAddress: clientWalletAddress.trim(), // Save for refunds
        },
      });

      await tx.escrow.create({
        data: {
          jobId: job.id,
          amount: Number(job.budget),
          token: "SOL",
          depositTxSig: stakeSignature.trim(),
          status: "LOCKED",
        },
      });

      await tx.jobEvent.create({
        data: {
          jobId: job.id,
          type: "FUNDED",
          metadata: { stakeSignature: stakeSignature.trim(), clientWalletAddress },
        },
      });
    });

    await enqueueJob(job.id);

    res.json({ success: true, jobId: job.id });
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

    const responseJob: any = { 
      ...job,
      jobNumericId: job.jobNumericId?.toString()
    };
    responseJob.outputUri = await maybePresignAzureUri(job.outputUri, CONTAINERS.outputs);

    if (responseJob.executionMetadata && typeof responseJob.executionMetadata === "object") {
      const meta: any = { ...responseJob.executionMetadata };
      meta.logsUri = await maybePresignAzureUri(meta.logsUri ?? null, CONTAINERS.outputs);

      if (Array.isArray(meta.outputFiles)) {
        meta.outputFiles = await Promise.all(
          meta.outputFiles.map(async (file: any) => ({
            ...file,
            uri: await maybePresignAzureUri(file?.uri ?? null, CONTAINERS.outputs),
          })),
        );
      }
      responseJob.executionMetadata = meta;
    }

    res.json({ job: responseJob });
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

export const getMyStats = async (req: Request, res: Response) => {
  const clientId = (req as any).user.id;

  try {
    const [totalJobs, activeJobs, spentResult, lockedResult] = await Promise.all([
      prisma.job.count({ where: { clientId } }),
      prisma.job.count({
        where: { clientId, status: { in: ["FUNDED", "ASSIGNED", "RUNNING"] } },
      }),
      prisma.job.aggregate({
        where: { clientId, status: "COMPLETED" },
        _sum: { finalCost: true },
      }),
      prisma.escrow.aggregate({
        where: { job: { clientId }, status: "LOCKED" },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      totalJobs,
      activeJobs,
      totalSpent: Number(spentResult._sum.finalCost ?? 0),
      escrowLocked: Number(lockedResult._sum.amount ?? 0),
    });
  } catch (err) {
    console.error("[getMyStats]", err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
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
      select: { providerId: true, retryCount: true, maxRetries: true, status: true, budget: true },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.providerId !== providerId) {
      return res.status(403).json({ error: "Not your assigned job" });
    }
    if (job.status !== "RUNNING" && job.status !== "ASSIGNED") {
      return res.status(400).json({ error: `Cannot complete job in ${job.status} state` });
    }

    if (success) {
      const jobDetails = await prisma.job.findUnique({
        where: { id: jobId },
        select: {
          clientWalletAddress: true,
          provider: { select: { user: { select: { walletAddress: true } } } },
          jobNumericId: true,
        },
      });

      if (!jobDetails?.clientWalletAddress || !jobDetails?.provider?.user?.walletAddress) {
        throw new Error('Missing on-chain wallet addresses for settle (clientWalletAddress or provider wallet)');
      }

      const settleTxSig = await solanaService.settleJob(
        Number(jobDetails.jobNumericId),
        Math.round(Number(job.budget) * LAMPORTS_PER_SOL),
        jobDetails.provider.user.walletAddress,
        jobDetails.clientWalletAddress,
      );

      const providerEarnings = Number(job.budget) * 0.95;

      await prisma.$transaction([
        prisma.job.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            finalCost: providerEarnings,
            outputUri,
            executionMetadata,
            completedAt: new Date(),
          },
        }),
        prisma.escrow.update({
          where: { jobId },
          data: { status: "RELEASED", releasedAt: new Date(), releaseTxSig: settleTxSig },
        }),
        prisma.providerMetric.update({
          where: { providerId },
          data: {
            totalJobs: { increment: 1 },
            successfulJobs: { increment: 1 },
            totalEarnedSol: { increment: providerEarnings },
          },
        }),
        prisma.provider.update({
          where: { id: providerId },
          data: { status: "ACTIVE", jobsCompleted: { increment: 1 } },
        }),
        prisma.jobEvent.create({
          data: {
            jobId,
            type: "COMPLETED",
            metadata: { providerId, outputUri, earnings: providerEarnings, settleTxSig },
          },
        }),
      ]);

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
        const jobDetails = await prisma.job.findUnique({
          where: { id: jobId },
          select: { clientWalletAddress: true, jobNumericId: true },
        });

        if (jobDetails?.clientWalletAddress && jobDetails.jobNumericId) {
          try {
            await solanaService.refundJob(Number(jobDetails.jobNumericId), jobDetails.clientWalletAddress);
          } catch (refundErr) {
            console.error(`[reportJobFailed] On-chain refund failed for job ${jobId}`, refundErr);
          }
        }

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

      // Provider should be available again after the attempt
      await prisma.provider.update({
        where: { id: providerId },
        data: isPermanentFail
          ? { status: "ACTIVE", jobsCompleted: { increment: 1 } }
          : { status: "ACTIVE" },
      }).catch(() => {});

      if (isPermanentFail) {
        await prisma.providerMetric.update({
          where: { providerId },
          data: {
            totalJobs: { increment: 1 },
            successfulJobs: { increment: 0 },
            failedJobs: { increment: 1 },
          },
        }).catch(() => {});
      }
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
      select: {
        clientId: true,
        status: true,
        providerId: true,
        clientWalletAddress: true,
        jobNumericId: true,
      },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.clientId !== clientId)
      return res.status(403).json({ error: "Not your job" });

    const cancellableStatuses = ["CREATED", "FUNDED", "QUEUED", "ASSIGNED", "RUNNING"];
    if (!cancellableStatuses.includes(job.status)) {
      return res
        .status(409)
        .json({ error: `Cannot cancel a job in ${job.status} state` });
    }

    if (job.status !== "CREATED") {
      if (job.clientWalletAddress && job.jobNumericId) {
        try {
          const refundTxSig = await solanaService.refundJob(
            Number(job.jobNumericId),
            job.clientWalletAddress
          );
          await prisma.escrow.update({
            where: { jobId },
            data: { refundTxSig, refundedAt: new Date() }
          }).catch(() => {});
          console.log(`[cancelJob] On-chain refund successful: ${refundTxSig}`);
        } catch (refundErr) {
          console.error(`[cancelJob] On-chain refund failed for job ${jobId}:`, refundErr);
          return res.status(502).json({
            error: "Cancel failed because the on-chain refund could not be confirmed",
          });
        }
      } else {
        console.warn(`[cancelJob] Missing clientWalletAddress or jobNumericId for job ${jobId}, skipping on-chain refund`);
      }
    }

    const writes: any[] = [
      prisma.job.update({
        where: { id: jobId },
        data: { status: "REFUNDED", completedAt: new Date() },
      }),
      prisma.jobEvent.create({
        data: { jobId, type: "CANCELLED", metadata: { cancelledBy: clientId } },
      }),
    ];

    if (job.status !== "CREATED") {
      writes.push(
        prisma.escrow.update({
          where: { jobId },
          data: { status: "REFUNDED", refundedAt: new Date() },
        }),
      );
    }

    if (job.providerId) {
      writes.push(
        prisma.provider.update({
          where: { id: job.providerId },
          data: { status: "ACTIVE" },
        }),
      );
    }

    await prisma.$transaction(writes);

    if (job.providerId) {
      sendCancelToProvider(job.providerId, { jobId, cancelledBy: clientId });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[cancelJob]", err);
    res.status(500).json({ error: "Cancel failed" });
  }
};
