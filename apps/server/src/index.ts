// src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { authRouter } from "./routes/auth.routes.js";
import { providerRouter } from "./routes/provider.routes.js";
import { jobRouter } from "./routes/job.routes.js";
import { setupWebSocketServer } from "./ws/server.js";
import { startHeartbeatMonitor } from "./jobs/heartbeatMonitor.js";
import { startMatchmakerWorker } from "./workers/matchmaker.worker.js";
import { jobQueue } from "./queues/jobQueue.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "*" }));
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/providers", providerRouter);
app.use("/api/jobs", jobRouter);

// Health check
app.get("/health", (_, res) =>
  res.json({ ok: true, ts: new Date().toISOString() }),
);

// Health - queue stats (proves Redis is live and jobs are flowing)
app.get("/health/queue", async (_, res) => {
  try {
    const counts = await jobQueue.getJobCounts(
      "waiting",
      "active",
      "failed",
      "delayed",
    );
    res.json({ ok: true, queue: "job-matching", counts });
  } catch (err) {
    res.status(503).json({ ok: false, error: (err as Error).message });
  }
});

// 404
app.use((_, res) => res.status(404).json({ error: "Not found" }));

const server = createServer(app);
setupWebSocketServer(server);
startHeartbeatMonitor();
const matchmakerWorker = startMatchmakerWorker();

const PORT = process.env.PORT ?? 3001;
server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});

// Graceful shutdown - lets in-flight BullMQ jobs finish before the process exits.
// Without this, jobs being actively matched are orphaned and re-enqueued as failures.
async function shutdown(signal: string) {
  console.log(`[Server] ${signal} received — shutting down gracefully…`);
  server.close();                  // stop accepting new HTTP/WS connections
  await matchmakerWorker.close();  // wait for in-flight matchmaker jobs to complete
  await jobQueue.close();          // close queue Redis connection
  console.log("[Server] Clean exit");
  process.exit(0);
}

const forceExitAfterMs = 10_000;
process.on("SIGTERM", () => {
  shutdown("SIGTERM");
  setTimeout(() => { console.error("[Server] Force exit after timeout"); process.exit(1); }, forceExitAfterMs).unref();
});
process.on("SIGINT", () => {
  shutdown("SIGINT");
  setTimeout(() => { console.error("[Server] Force exit after timeout"); process.exit(1); }, forceExitAfterMs).unref();
});
