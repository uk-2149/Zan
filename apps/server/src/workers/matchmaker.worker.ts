import { Worker, type Job as BullJob } from "bullmq";
import { prisma } from "@repo/db";
import { makeRedisConnection } from "../lib/redis.js";
import { getConnectedProviderIds, sendJobToProvider } from "../ws/server.js";
import { QUEUE_NAME, type JobMatchPayload } from "../queues/jobQueue.js";
import { CONTAINERS, generateReadSASUrl } from "../lib/azure.js";

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
      dockerImage: true,
      jobParams: true,
      timeLimitSecs: true,
      jobNumericId: true,
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

  const connectedProviderIds = getConnectedProviderIds();
  const heartbeatCutoff = new Date(Date.now() - 60_000);
  const enforceVramFilter = job.type !== "python_script";
  const needsNativeGpu =
    job.type === "blender_render" ||
    job.type === "stable_diffusion" ||
    job.type === "python_gpu";
  const needsCudaGpu = job.type === "stable_diffusion" || job.type === "python_gpu";
  const providerWhere: any = {
    status: "ACTIVE",
    ...(connectedProviderIds.length > 0
      ? {
          OR: [
            { lastHeartbeat: { gte: heartbeatCutoff } },
            { id: { in: connectedProviderIds } },
          ],
        }
      : { lastHeartbeat: { gte: heartbeatCutoff } }),
    ...(enforceVramFilter && job.requiredVramGB
      ? { vramGB: { gte: job.requiredVramGB } }
      : {}),
    ...(job.requiredGpuTier ? { tier: { gte: job.requiredGpuTier } } : {}),
  };

  if (needsNativeGpu) {
    providerWhere.NOT = [
      { gpuModel: { contains: "Apple" } },
      { gpuModel: { contains: "Intel" } },
      { gpuModel: { contains: "Iris" } },
      { gpuModel: { contains: "UHD" } },
    ];

    if (needsCudaGpu) {
      providerWhere.NOT.push(
        { gpuModel: { contains: "AMD" } },
        { gpuModel: { contains: "Radeon" } },
      );
    }
  }

  // Filter by VRAM and tier requirements; prefer higher-tier, most-recently-active provider.
  // Consider WS-connected providers even if heartbeat state is stale.
  const provider: any = await prisma.provider.findFirst({
    where: providerWhere,
    orderBy: [{ tier: "desc" }, { lastHeartbeat: "desc" }],
    select: { id: true, gpuModel: true, vramGB: true, location: true, tier: true, user: { select: { walletAddress: true } } },
  });

  if (!provider) {
    const onlineCount = await prisma.provider.count({
      where: { status: "ACTIVE" },
    });
    const heartbeatFreshCount = await prisma.provider.count({
      where: { status: "ACTIVE", lastHeartbeat: { gte: heartbeatCutoff } },
    });
    console.log(
      `[Matchmaker] no eligible provider for ${jobId} (need vram>=${enforceVramFilter ? (job.requiredVramGB ?? 0) : 0}, tier>=${job.requiredGpuTier ?? 0}, active=${onlineCount}, freshHeartbeat=${heartbeatFreshCount}, wsConnected=${connectedProviderIds.length}, type=${job.type})`,
    );
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

  if (job.jobNumericId && provider.user?.walletAddress) {
    try {
      // Import dynamic so we don't circular depend if not needed, or just import at top
      const solanaService = await import("../services/solana.service.js");
      await solanaService.assignProviderToEscrow(Number(job.jobNumericId), provider.user.walletAddress);
    } catch (err) {
      console.error(`[Matchmaker] Failed to assign provider on-chain for job ${jobId}`, err);
      // We might want to handle this, but for now just log it
    }
  }

  // Presign the inputUri so the agent can download the file
  let downloadableInputUri = job.inputUri;
  try {
    try {
      const parsed = new URL(job.inputUri);
      const prefix = `/${CONTAINERS.inputs}/`;
      if (parsed.pathname.startsWith(prefix)) {
        const blobName = parsed.pathname.slice(prefix.length);
        downloadableInputUri = await generateReadSASUrl(CONTAINERS.inputs, blobName, 21600); // 6 hours
      }
    } catch (e) {
      console.warn(`[Matchmaker] Error parsing inputUri URL:`, e);
    }
  } catch (err) {
    console.warn(`[Matchmaker] Failed to presign inputUri, using original`, err);
  }

  const delivered = sendJobToProvider(provider.id, {
    jobId: job.id,
    title: job.title,
    type: job.type,
    inputUri: downloadableInputUri,
    budget: Number(job.budget),
    dockerImage: job.dockerImage,
    jobParams: job.jobParams,
    timeLimitSecs: job.timeLimitSecs,
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
