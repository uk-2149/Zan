import { spawn } from "child_process";
import { exec } from "child_process";
import type { ChildProcessWithoutNullStreams } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import axios from "axios";
import { store } from "./store";
import { agentRequest } from "./api-client";
import { getGpuMetrics } from "./detect";
import { uploadOutputDirectory, uploadLogs } from "./storage";

const execAsync = promisify(exec);

interface ActiveJob {
  containerName: string;
  proc?: ChildProcessWithoutNullStreams;
  cancelled: boolean;
  cancelReason?: string;
}

const activeJobs = new Map<string, ActiveJob>();

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
  logsUri: string;
  outputFiles: { filename: string; uri: string; size: number }[];
}

async function downloadInput(inputUri: string, destPath: string): Promise<void> {
  if (inputUri.startsWith("http")) {
    const response = await axios.get(inputUri, { responseType: "stream" });
    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  }
  throw new Error(`Unsupported input URI scheme: ${inputUri}`);
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function safeDockerName(jobId: string): string {
  return `gnet-job-${jobId.replace(/[^a-zA-Z0-9_.-]/g, "-").slice(0, 48)}`;
}

function isBlenderJob(payload: JobPayload): boolean {
  return (
    payload.type === "blender_render" ||
    payload.type === "render" ||
    payload.inputUri.split("?")[0].endsWith(".blend") ||
    payload.dockerImage.includes("blender")
  );
}

function isFfmpegJob(payload: JobPayload): boolean {
  return payload.type === "ffmpeg_transcode" || payload.dockerImage.includes("ffmpeg");
}

function isStableDiffusionJob(payload: JobPayload): boolean {
  return payload.type === "stable_diffusion" || payload.dockerImage.includes("stable-diffusion");
}

function isCudaPythonJob(payload: JobPayload): boolean {
  return payload.type === "python_gpu";
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function dockerPlatformFlag(payload: JobPayload): string {
  if (process.platform === "darwin" && process.arch === "arm64" && isBlenderJob(payload)) {
    return "--platform linux/amd64";
  }
  return "";
}

async function stopContainer(containerName: string): Promise<void> {
  try {
    await execAsync(`docker stop ${containerName}`);
  } catch {}
}

export async function cancelRunningJob(jobId: string, reason = "Job cancelled by client"): Promise<boolean> {
  const active = activeJobs.get(jobId);
  if (!active) return false;

  active.cancelled = true;
  active.cancelReason = reason;
  active.proc?.kill("SIGTERM");
  await stopContainer(active.containerName);
  return true;
}

function buildDockerCmd(payload: JobPayload, inputPath: string, outputPath: string, containerName: string): string {
  const envFlags = Object.entries(payload.jobParams)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `-e JOB_${k.toUpperCase()}="${String(v).replace(/"/g, '\\"')}"`)
    .join(" ");

  const baseFlags = [
    "docker run --rm",
    `--name ${containerName}`,
    dockerPlatformFlag(payload),
    isBlenderJob(payload) || isStableDiffusionJob(payload) ? "--entrypoint sh" : "",
    process.env.HAS_GPU === "true" || isCudaPythonJob(payload) || isStableDiffusionJob(payload) ? "--gpus all" : "",
    `-v "${inputPath}":/input:ro`,
    `-v "${outputPath}":/output`,
    `-w /output`,
    `-e JOB_ID="${payload.jobId}"`,
    `-e JOB_TYPE="${payload.type}"`,
    envFlags,
    "--memory=8g",
    `--stop-timeout ${payload.timeLimitSecs}`,
  ].filter(Boolean).join(" ");

  const isPythonScript =
    payload.type === "python_script" ||
    payload.type === "python_gpu" ||
    payload.inputUri.endsWith(".py");

  if (isPythonScript) {
    const filename = path.basename(payload.inputUri.split("?")[0]);
    const scriptPath = filename.endsWith(".py") ? `/input/${filename}` : "/input/script.py";
    const rawPackages = payload.jobParams?.packages;
    const extraPackages = Array.isArray(rawPackages)
      ? rawPackages.map(String)
      : typeof rawPackages === "string"
        ? rawPackages.split(/[,\s]+/).filter(Boolean)
        : [];
    const packages = payload.type === "python_gpu"
      ? [
          "diffusers",
          "transformers",
          "accelerate",
          "safetensors",
          "pillow",
          "huggingface_hub",
          ...extraPackages,
        ]
      : extraPackages;

    if (packages.length > 0) {
      const install = `python -m pip install --no-cache-dir --upgrade ${packages.map(shellQuote).join(" ")}`;
      const script = `${install} && python ${shellQuote(scriptPath)}`;
      return `${baseFlags} ${payload.dockerImage} sh -lc ${shellQuote(script)}`;
    }

    return `${baseFlags} ${payload.dockerImage} python ${shellQuote(scriptPath)}`;
  }

  if (isBlenderJob(payload)) {
    const filename = path.basename(payload.inputUri.split("?")[0]) || "project.blend";
    const blendPath = `/input/${filename}`;
    // -b:   run in background (headless — Xvfb in the container handles the display)
    // -o:   output path prefix (renders to /output/render_0001.png etc.)
    // -F:   output format PNG (explicit, override .blend setting)
    // -a:   render full animation (uses frame range from .blend file)
    const outputFormat = payload.jobParams?.outputFormat || "PNG";
    // -E CYCLES: forces Cycles render engine (EEVEE requires OpenGL display context which fails headlessly on some setups)
    let renderArgs = `-b ${shellQuote(blendPath)} -E CYCLES -o /output/render_ -F ${shellQuote(outputFormat)} -a`;

    // Allow optional frame range override via jobParams
    const frameStart = payload.jobParams?.frameStart;
    const frameEnd = payload.jobParams?.frameEnd;
    if (frameStart !== undefined && frameStart !== null && frameStart !== "") {
      renderArgs = `-b ${shellQuote(blendPath)} -E CYCLES -o /output/render_ -F ${shellQuote(outputFormat)} -s ${Number(frameStart)} -e ${Number(frameEnd || frameStart)} -a`;
    }

    const script = [
      'BLENDER_BIN=$(command -v blender || true)',
      'if [ -z "$BLENDER_BIN" ]; then',
      '  if [ -x /home/headless/blender/blender ]; then BLENDER_BIN=/home/headless/blender/blender;',
      '  elif [ -x /home/headless/blender ]; then BLENDER_BIN=/home/headless/blender;',
      '  else echo "Blender binary not found in image" >&2; exit 127;',
      '  fi',
      'fi',
      `"$BLENDER_BIN" ${renderArgs}`,
    ].join("; ");

    return `${baseFlags} ${payload.dockerImage} -lc ${shellQuote(script)}`;
  }

  if (isFfmpegJob(payload)) {
    const filename = path.basename(payload.inputUri.split("?")[0]) || "input";
    const inputFile = `/input/${filename}`;
    const outputFormat = String(payload.jobParams?.outputFormat || "mp4")
      .replace(/^\./, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase() || "mp4";
    return `${baseFlags} ${payload.dockerImage} -y -i ${shellQuote(inputFile)} ${shellQuote(`/output/output.${outputFormat}`)}`;
  }

  if (isStableDiffusionJob(payload)) {
    const script = [
      'echo "Stable Diffusion image is pullable, but this job type needs a model-backed runtime and batch script before execution." >&2',
      'echo "Use a custom image with checkpoints baked in or mounted, then implement the batch command for /output." >&2',
      "exit 2",
    ].join("; ");
    return `${baseFlags} ${payload.dockerImage} -lc ${shellQuote(script)}`;
  }

  return `${baseFlags} ${payload.dockerImage}`;
}

export async function runJob(payload: JobPayload, onProgress?: (msg: string) => void): Promise<void> {
  const log = (msg: string) => {
    console.log(`[JobRunner] ${msg}`);
    onProgress?.(msg);
  };

  const workDir = path.join(os.tmpdir(), `gnet-job-${payload.jobId}`);
  const inputDir = path.join(workDir, "input");
  const outputPath = path.join(workDir, "output");

  fs.mkdirSync(inputDir, { recursive: true });
  fs.mkdirSync(outputPath, { recursive: true });

  const inputFilename = path.basename(payload.inputUri.split("?")[0]) || "input";
  const inputPath = path.join(inputDir, inputFilename);

  const startTime = Date.now();
  const initialMetrics = await getGpuMetrics();
  const initialTemp = initialMetrics?.temperatureC ?? 0;

  let exitCode = 1;
  let capturedLogs = "";
  const activeJob: ActiveJob = {
    containerName: safeDockerName(payload.jobId),
    cancelled: false,
  };
  activeJobs.set(payload.jobId, activeJob);

  const metricsSamples: {
    utilization: number;
    vramUsedMb: number;
    temperatureC: number;
    powerDrawW: number;
  }[] = [];

  let collectingMetrics = true;
  const metricsCollector = (async () => {
    while (collectingMetrics) {
      const m = await getGpuMetrics();
      if (m) metricsSamples.push(m);
      await new Promise((r) => setTimeout(r, 1000));
    }
  })();

  try {
    log(`Downloading input: ${payload.inputUri}`);
    await downloadInput(payload.inputUri, inputPath);
    log(`Input saved to ${inputPath}`);
    if (activeJob.cancelled) {
      throw new Error(activeJob.cancelReason ?? "Job cancelled before execution started");
    }

    log(`Pulling image: ${payload.dockerImage}`);
    try {
      const platformFlag = dockerPlatformFlag(payload);
      if (platformFlag) {
        log("Apple Silicon detected: using linux/amd64 Docker platform for Blender image compatibility");
      }
      await execAsync(`docker pull ${platformFlag} ${payload.dockerImage}`);
      log("Image ready");
    } catch (err) {
      log(`Warning: Failed to pull image (might be a local image). Continuing...`);
    }
    if (activeJob.cancelled) {
      throw new Error(activeJob.cancelReason ?? "Job cancelled before execution started");
    }

    const dockerCmd = buildDockerCmd(payload, inputDir, outputPath, activeJob.containerName);
    log(`Running: ${dockerCmd}`);

    const containerPromise = new Promise<number>((resolve, reject) => {
      const proc = spawn("sh", ["-c", dockerCmd], { stdio: "pipe" });
      activeJob.proc = proc;

      proc.stdout.on("data", (d) => {
        const line = d.toString();
        capturedLogs += line;
        log(`[stdout] ${line.trim()}`);
      });

      proc.stderr.on("data", (d) => {
        const line = d.toString();
        capturedLogs += `[stderr] ${line}`;
        log(`[stderr] ${line.trim()}`);
      });

      proc.on("close", (code) => resolve(code ?? 1));
      proc.on("error", reject);
    });

    let timeoutHandle: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<number>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        void cancelRunningJob(payload.jobId, `Job timed out after ${payload.timeLimitSecs}s`).finally(() => {
          reject(new Error(`Job timed out after ${payload.timeLimitSecs}s`));
        });
      }, payload.timeLimitSecs * 1000);
    });

    exitCode = await Promise.race([containerPromise, timeoutPromise]);
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (activeJob.cancelled) exitCode = 130;
    log(`Container exited with code ${exitCode}`);
  } catch (err: any) {
    if (!activeJob.cancelled) {
      await stopContainer(activeJob.containerName);
    }
    const errMsg = activeJob.cancelled
      ? activeJob.cancelReason ?? "Job cancelled before completion"
      : `Execution error: ${err.message}`;
    log(errMsg);
    capturedLogs += `\n${errMsg}\n`;
    exitCode = activeJob.cancelled ? 130 : 1;
  } finally {
    collectingMetrics = false;
    await metricsCollector;
  }

  const executionTimeMs = Date.now() - startTime;
  const finalMetrics = await getGpuMetrics();
  const finalTemp = finalMetrics?.temperatureC ?? initialTemp;

  log("Uploading execution logs...");
  let logsUri = "";
  try {
    logsUri = await uploadLogs(payload.jobId, capturedLogs);
    log(`Logs uploaded: ${logsUri}`);
  } catch (err: any) {
    log(`Warning: Failed to upload logs: ${err.message}`);
  }

  log("Uploading output files...");
  let outputFiles: { filename: string; uri: string; size: number }[] = [];
  try {
    outputFiles = await uploadOutputDirectory(payload.jobId, outputPath);
    log(`Uploaded ${outputFiles.length} output file(s)`);
    outputFiles.forEach((f) => log(`  → ${f.filename} (${f.size} bytes): ${f.uri}`));
  } catch (err: any) {
    log(`Warning: Failed to upload outputs: ${err.message}`);
  }

  const metadata: ExecutionMetadata = {
    executionTimeMs,
    vramUsedMb: Math.round(average(metricsSamples.map((m) => m.vramUsedMb))),
    avgUtilization: Math.round(average(metricsSamples.map((m) => m.utilization))),
    peakUtilization: Math.max(0, ...metricsSamples.map((m) => m.utilization)),
    tempDeltaC: Math.max(0, finalTemp - initialTemp),
    powerDrawW: Math.round(average(metricsSamples.map((m) => m.powerDrawW))),
    exitCode,
    logsUri,
    outputFiles,
  };

  const primaryOutputUri = outputFiles.length > 0 ? outputFiles[0].uri : logsUri;

  try {
    if (activeJob.cancelled) {
      log("Skipping completion report because the job was cancelled");
      return;
    }

    await agentRequest("post", `/jobs/${payload.jobId}/complete`, {
      jobId: payload.jobId,
      outputUri: primaryOutputUri,
      executionMetadata: metadata,
      success: exitCode === 0,
      errorMessage:
        exitCode !== 0
          ? `Container exited with code ${exitCode}. Check logs: ${logsUri}`
          : undefined,
    });
    log("Completion reported to server ✓");
  } catch (err: any) {
    log(`Failed to report completion: ${err.message}`);
  } finally {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
      log("Temp files cleaned up");
    } catch {}

    activeJobs.delete(payload.jobId);
    store.set("currentJobId", null);
  }
}
