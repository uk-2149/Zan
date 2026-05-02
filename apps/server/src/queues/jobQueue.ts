import { Queue } from "bullmq";
import { makeRedisConnection } from "../lib/redis.js";

export const QUEUE_NAME = "job-matching";

export interface JobMatchPayload {
  jobId: string;
}

export const jobQueue = new Queue<JobMatchPayload>(QUEUE_NAME, {
  connection: makeRedisConnection(),
  prefix: "zan",// Redis keys: gnet:bull:job-matching:*
  defaultJobOptions: {
    attempts: 15,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: { age: 3600 }, // keep completed jobs for 1 hour
    removeOnFail: { count: 200 },
  },
});

/**
 * Push a FUNDED job into the matching queue.
 * Using jobId as the BullMQ job ID prevents the same job from being
 * enqueued twice if the HTTP handler is somehow called more than once.
 */
export async function enqueueJob(jobId: string): Promise<void> {
  await jobQueue.add("match", { jobId }, { jobId });
  console.log(`[Queue] Enqueued job ${jobId}`);
}
