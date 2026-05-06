import { spawn } from "child_process";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import axios from "axios";
import { store } from "./store";
import { agentRequest } from "./api-client";
import { getGpuMetrics } from "./detect";

const execAsync = promisify(exec);

export interface JobPayload {
  jobId: string;
  title: string;
  type: string;
  dockerImage: string;
  inputUri: string;
  jobParams: Record<string, any>;
  timeLimitSecs: number;
  budget: number;
}

interface ExecutionMetadata {
  executionTimeMs: number;
  vramUsedMb: number;
  avgUtilization: number;
  peakUtilization: number;
  tempDeltaC: number;
  powerDrawW: number;
  exitCode: number;
}

// ── Helpers ────────────────────────────────────────────────────────

async function downloadInput(
  inputUri: string,
  destPath: string
): Promise<void> {
  if (inputUri.startsWith("http")) {
    const response = await axios.get(inputUri, { responseType: "stream" });
    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  }
  // TODO: handle ipfs:// via public gateway
  throw new Error(`Unsupported input URI scheme: ${inputUri}`);
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ── Main runner ────────────────────────────────────────────────────

export async function runJob(
  payload: JobPayload,
  onProgress?: (msg: string) => void
): Promise<void> {
  const log = (msg: string) => {
    console.log(`[JobRunner] ${msg}`);
    onProgress?.(msg);
  };

  const workDir = path.join(os.tmpdir(), `gnet-job-${payload.jobId}`);
  const inputPath = path.join(workDir, "input");
  const outputPath = path.join(workDir, "output");

  fs.mkdirSync(outputPath, { recursive: true });

  const startTime = Date.now();
  const initialMetrics = await getGpuMetrics();
  const initialTemp = initialMetrics?.temperatureC ?? 0;

  let exitCode = 1;
  const metricsSamples: {
    utilization: number;
    vramUsedMb: number;
    temperatureC: number;
    powerDrawW: number;
  }[] = [];

  // Metrics collector — runs in background while container executes
  let collectingMetrics = true;
  const metricsCollector = (async () => {
    while (collectingMetrics) {
      const m = await getGpuMetrics();
      if (m) metricsSamples.push(m);
      await new Promise((r) => setTimeout(r, 1000));
    }
  })();

  try {
    // ── Step 1: Download input ──────────────────────────────
    log("Downloading input...");
    await downloadInput(payload.inputUri, inputPath);
    log("Input downloaded");

    // ── Step 2: Pull Docker image ───────────────────────────
    log(`Pulling image: ${payload.dockerImage}`);
    await execAsync(`docker pull ${payload.dockerImage}`);
    log("Image ready");

    // ── Step 3: Build docker run command ────────────────────
    const envFlags = Object.entries(payload.jobParams)
      .map(([k, v]) => `-e JOB_${k.toUpperCase()}="${v}"`)
      .join(" ");

    const dockerCmd = [
      "docker run --rm",
      "--gpus all",
      `-v "${inputPath}":/input:ro`,
      `-v "${outputPath}":/output`,
      `-e JOB_ID="${payload.jobId}"`,
      `-e JOB_TYPE="${payload.type}"`,
      envFlags,
      `--memory="8g"`,
      `--stop-timeout ${payload.timeLimitSecs}`,
      payload.dockerImage,
    ].join(" ");

    // ── Step 4: Run container ───────────────────────────────
    log("Starting execution...");

    const containerPromise = new Promise<number>((resolve, reject) => {
      const proc = spawn("sh", ["-c", dockerCmd], { stdio: "pipe" });

      proc.stdout.on("data", (d) => log(`[Docker] ${d.toString().trim()}`));
      proc.stderr.on("data", (d) =>
        console.error(`[Docker stderr] ${d.toString().trim()}`)
      );

      proc.on("close", (code) => resolve(code ?? 1));
      proc.on("error", reject);
    });

    const timeoutPromise = new Promise<number>((_, reject) =>
      setTimeout(
        () => reject(new Error("Job timed out")),
        payload.timeLimitSecs * 1000
      )
    );

    exitCode = await Promise.race([containerPromise, timeoutPromise]);
    log(`Container exited with code ${exitCode}`);
  } catch (err: any) {
    log(`Execution error: ${err.message}`);
    exitCode = 1;
  } finally {
    // Stop metrics collection
    collectingMetrics = false;
    await metricsCollector;
  }

  // ── Step 5: Calculate metadata ──────────────────────────────
  const executionTimeMs = Date.now() - startTime;
  const finalMetrics = await getGpuMetrics();
  const finalTemp = finalMetrics?.temperatureC ?? initialTemp;

  const metadata: ExecutionMetadata = {
    executionTimeMs,
    vramUsedMb: Math.round(
      average(metricsSamples.map((m) => m.vramUsedMb))
    ),
    avgUtilization: Math.round(
      average(metricsSamples.map((m) => m.utilization))
    ),
    peakUtilization: Math.max(
      0,
      ...metricsSamples.map((m) => m.utilization)
    ),
    tempDeltaC: Math.max(0, finalTemp - initialTemp),
    powerDrawW: Math.round(
      average(metricsSamples.map((m) => m.powerDrawW))
    ),
    exitCode,
  };

  log(`Metadata: ${JSON.stringify(metadata)}`);

  // ── Step 6: Upload output ───────────────────────────────────
  // TODO: upload outputPath contents to S3/IPFS and get real URI
  const outputUri = `output://${payload.jobId}`;
  log(`Output URI: ${outputUri}`);

  // ── Step 7: Report completion to server ─────────────────────
  try {
    await agentRequest("post", `/jobs/${payload.jobId}/complete`, {
      jobId: payload.jobId,
      outputUri,
      executionMetadata: metadata,
      success: exitCode === 0,
      errorMessage:
        exitCode !== 0
          ? `Container exited with code ${exitCode}`
          : undefined,
    });
    log("Completion reported to server ✓");
  } catch (err: any) {
    log(`Failed to report completion: ${err.message}`);
  }

  // ── Step 8: Cleanup ─────────────────────────────────────────
  try {
    fs.rmSync(workDir, { recursive: true, force: true });
    log("Temp files cleaned up");
  } catch {
    // Non-fatal — OS will clean tmp eventually
  }

  store.set("currentJobId", null);
}