import { Queue } from "bullmq";
import { Redis } from "ioredis";

// Must match apps/server/src/queues/jobQueue.ts exactly - same queue name,
// same job options, same jobId dedup key - so the matchmaker worker sees these jobs.
const QUEUE_NAME = "job-matching";

let _redis: Redis | null = null;
let _queue: Queue | null = null;

function getQueue(): Queue {
  if (!_queue) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("[jobQueue] REDIS_URL is not set");

    _redis = new Redis(url, { maxRetriesPerRequest: null, enableReadyCheck: false });
    _queue = new Queue(QUEUE_NAME, {
      connection: _redis,
      prefix: "zan",
      defaultJobOptions: {
        attempts: 15,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { count: 200 },
      },
    });
  }
  return _queue;
}

// jobId is used as both the BullMQ job ID and the dedup key
// adding the same jobId twice returns the existing BullMQ job (no double-queue).
export async function enqueueJob(jobId: string): Promise<void> {
  await getQueue().add("match", { jobId }, { jobId });
  console.log(`[jobQueue] Enqueued job ${jobId}`);
}
