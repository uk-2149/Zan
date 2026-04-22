import { exec } from "child_process";
import { promisify } from "util";
import * as os from "os";

const execAsync = promisify(exec);

export interface HardwareInfo {
  gpuModel: string;
  vramGB: number;
  cudaVersion: string | null;
  driverVersion: string | null;
  computeCapability: string | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
  pingMs: number | null;
  cpuModel: string;
  ramGB: number;
  platform: string;
  dockerInstalled: boolean;
  dockerVersion: string | null;
}

export interface DetectionStep {
  label: string;
  status: "pending" | "running" | "done" | "error";
  value?: string;
  error?: string;
}

async function detectGpu() {
  try {
    const { stdout } = await execAsync(
      `nvidia-smi --query-gpu=name,memory.total,driver_version,compute_cap --format=csv,noheader,nounits`,
    );
    const [gpuModel, vramMb, driverVersion, computeCapability] = stdout
      .trim()
      .split(",")
      .map((s) => s.trim());
    return {
      gpuModel,
      vramGB: Math.round(parseInt(vramMb) / 1024),
      driverVersion,
      computeCapability,
    };
  } catch {
    return null;
  }
}

async function detectCuda(): Promise<string | null> {
  try {
    const { stdout } = await execAsync("nvcc --version");
    const match = stdout.match(/release (\d+\.\d+)/);
    return match ? match[1] : null;
  } catch {
    try {
      const { stdout } = await execAsync("nvidia-smi");
      const match = stdout.match(/CUDA Version: (\d+\.\d+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}

async function detectDocker(): Promise<{
  installed: boolean;
  version: string | null;
}> {
  try {
    const { stdout } = await execAsync("docker --version");
    const match = stdout.match(/version ([\d.]+)/);
    return { installed: true, version: match ? match[1] : "unknown" };
  } catch {
    return { installed: false, version: null };
  }
}

export async function detectHardware(
  onStep?: (step: DetectionStep) => void,
): Promise<HardwareInfo> {
  const emit = (step: DetectionStep) => onStep?.(step);

  // CPU & RAM
  emit({ label: "CPU & Memory", status: "running" });
  const cpuModel = os.cpus()[0]?.model || "Unknown";
  const ramGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  const platform = os.platform();
  emit({
    label: "CPU & Memory",
    status: "done",
    value: `${cpuModel} · ${ramGB}GB RAM`,
  });

  // GPU
  emit({ label: "GPU Detection", status: "running" });
  const gpu = await detectGpu();
  if (gpu) {
    emit({
      label: "GPU Detection",
      status: "done",
      value: `${gpu.gpuModel} (${gpu.vramGB}GB)`,
    });
  } else {
    emit({
      label: "GPU Detection",
      status: "error",
      error: "No NVIDIA GPU detected",
    });
  }

  // CUDA
  emit({ label: "CUDA Version", status: "running" });
  const cuda = await detectCuda();
  emit({
    label: "CUDA Version",
    status: cuda ? "done" : "error",
    value: cuda ?? undefined,
    error: cuda ? undefined : "CUDA not found",
  });

  // Docker
  emit({ label: "Docker", status: "running" });
  const docker = await detectDocker();
  emit({
    label: "Docker",
    status: docker.installed ? "done" : "error",
    value: docker.version ?? undefined,
    error: docker.installed ? undefined : "Docker not installed",
  });

  return {
    gpuModel: gpu?.gpuModel ?? "Unknown GPU",
    vramGB: gpu?.vramGB ?? 0,
    cudaVersion: cuda,
    driverVersion: gpu?.driverVersion ?? null,
    computeCapability: gpu?.computeCapability ?? null,
    downloadMbps: null,
    uploadMbps: null,
    pingMs: null,
    cpuModel,
    ramGB,
    platform,
    dockerInstalled: docker.installed,
    dockerVersion: docker.version,
  };
}

export async function getGpuMetrics() {
  try {
    const { stdout } = await execAsync(
      `nvidia-smi --query-gpu=utilization.gpu,memory.used,temperature.gpu,power.draw --format=csv,noheader,nounits`,
    );
    const [util, vram, temp, power] = stdout
      .trim()
      .split(",")
      .map((s) => parseFloat(s.trim()));
    return {
      utilization: util,
      vramUsedMb: vram,
      temperatureC: temp,
      powerDrawW: power,
    };
  } catch {
    return null;
  }
}
