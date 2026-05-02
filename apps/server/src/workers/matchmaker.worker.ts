import { Worker, type Job as BullJob } from "bullmq";
import { prisma } from "@repo/db";
import { makeRedisConnection } from "../lib/redis.js";
import { sendJobToProvider } from "../ws/server.js";
import { QUEUE_NAME, type JobMatchPayload } from "../queues/jobQueue.js";

async function processJob(bullJob: BullJob<JobMatchPayload>): Promise<void> {
  const { jobId } = bullJob.data;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      title: true,
      type: true,
      inputUri: true,
      budget: true,
      requiredVramGB: true,
      requiredGpuTier: true,
    },
  });

  if (!job) {
    console.warn(`[Matchmaker] Job ${jobId} not found, discarding`);
    return;
  }

  if (job.status !== "FUNDED") {
    console.log(`[Matchmaker] Job ${jobId} is ${job.status}, skipping`);
    return;
  }

  // Filter by VRAM and tier requirements; prefer higher-tier, most-recently-active provider
  const provider = await prisma.provider.findFirst({
    where: {
      status: "ACTIVE",
      ...(job.requiredVramGB ? { vramGB: { gte: job.requiredVramGB } } : {}),
      ...(job.requiredGpuTier ? { tier: { gte: job.requiredGpuTier } } : {}),
    },
    orderBy: [{ tier: "desc" }, { lastHeartbeat: "desc" }],
    select: { id: true, gpuModel: true, vramGB: true, location: true, tier: true },
  });

  if (!provider) {
    throw new Error("NO_PROVIDER_AVAILABLE");
  }

  await prisma.$transaction([
    prisma.job.update({
      where: { id: jobId },
      data: { status: "ASSIGNED", providerId: provider.id },
    }),
    prisma.provider.update({
      where: { id: provider.id },
      data: { status: "BUSY" },
    }),
    prisma.jobEvent.create({
      data: {
        jobId,
        type: "ASSIGNED",
        metadata: { providerId: provider.id, gpuModel: provider.gpuModel, tier: provider.tier },
      },
    }),
  ]);

  const delivered = sendJobToProvider(provider.id, {
    jobId: job.id,
    title: job.title,
    type: job.type,
    inputUri: job.inputUri,
    budget: Number(job.budget),
  });

  if (!delivered) {
    console.warn(
      `[Matchmaker] Provider ${provider.id} offline — job ${jobId} assigned in DB, awaiting WS reconnect`,
    );
  } else {
    console.log(
      `[Matchmaker] Job ${jobId} → Provider ${provider.id} (${provider.gpuModel}, tier ${provider.tier}) ✓`,
    );
  }
}

export function startMatchmakerWorker(): Worker<JobMatchPayload> {
  const worker = new Worker<JobMatchPayload>(QUEUE_NAME, processJob, {
    connection: makeRedisConnection(),
    prefix: "zan",
    concurrency: 5,
  });

  worker.on("completed", (job) => {
    console.log(`[Matchmaker] ✓ job ${job.data.jobId} matched`);
  });

  worker.on("failed", (job, err) => {
    if (err.message === "NO_PROVIDER_AVAILABLE") {
      console.log(
        `[Matchmaker] No provider for job ${job?.data.jobId} — attempt ${job?.attemptsMade}/15, retrying…`,
      );
    } else {
      console.error(`[Matchmaker] ✗ job ${job?.data.jobId} failed:`, err.message);
    }
  });

  worker.on("error", (err) => {
    console.error("[Matchmaker] Worker error:", err.message);
  });

  console.log("[Matchmaker] Worker started (concurrency=5)");
  return worker;
}
