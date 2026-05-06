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
  isIntegratedGpu: boolean;
  gpuVendor: "nvidia" | "amd" | "intel" | "apple" | "unknown";
}

export interface DetectionStep {
  label: string;
  status: "pending" | "running" | "done" | "error" | "warn";
  value?: string;
  error?: string;
}

interface GpuResult {
  gpuModel: string;
  vramGB: number;
  driverVersion: string | null;
  computeCapability: string | null;
  isIntegrated: boolean;
  vendor: "nvidia" | "amd" | "intel" | "apple" | "unknown";
}

async function detectGpu(): Promise<GpuResult | null> {
  // ── 1. NVIDIA (nvidia-smi) ────────────────────────────────────
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
      isIntegrated: false,
      vendor: "nvidia",
    };
  } catch {}

  const platform = os.platform();

  // ── 2. Apple Silicon (Mac) ────────────────────────────────────
  if (platform === "darwin") {
    try {
      const { stdout } = await execAsync("system_profiler SPDisplaysDataType");
      const modelMatch = stdout.match(/Chipset Model: (.+)/);
      const vramMatch = stdout.match(/VRAM[^:]*:\s*(\d+)\s*(MB|GB)/i);
      if (modelMatch) {
        const vramVal = vramMatch ? parseInt(vramMatch[1]) : 0;
        const vramUnit = vramMatch ? vramMatch[2].toUpperCase() : "GB";
        const vramGB = vramUnit === "MB" ? Math.round(vramVal / 1024) : vramVal;
        return {
          gpuModel: modelMatch[1].trim(),
          vramGB,
          driverVersion: null,
          computeCapability: null,
          isIntegrated: true,
          vendor: "apple",
        };
      }
    } catch {}
  }

  // ── 3. Linux — Intel / AMD via lspci ─────────────────────────
  if (platform === "linux") {
    try {
      const { stdout } = await execAsync("lspci | grep -iE 'vga|3d|display'");
      const lines = stdout.trim().split("\n").filter(Boolean);

      // Prefer dedicated GPU (AMD/NVIDIA) over integrated Intel
      const gpuLine =
        lines.find((l) => /nvidia|amd|radeon/i.test(l)) ?? lines[0];

      if (gpuLine) {
        const match = gpuLine.match(/(?:VGA|3D|Display)[^:]*:\s*(.+)/i);
        const gpuModel = match ? match[1].trim() : gpuLine.trim();

        const vendor: GpuResult["vendor"] = /nvidia/i.test(gpuModel)
          ? "nvidia"
          : /amd|radeon/i.test(gpuModel)
            ? "amd"
            : /intel/i.test(gpuModel)
              ? "intel"
              : "unknown";

        const isIntegrated =
          vendor === "intel" ||
          /integrated|iris|uhd|hd graphics/i.test(gpuModel);

        // Try to get VRAM from lspci verbose for AMD/dedicated
        let vramGB = 0;
        if (!isIntegrated) {
          try {
            const { stdout: verbose } = await execAsync(
              "lspci -v 2>/dev/null | grep -A 15 'VGA\\|3D' | grep -i 'size=' | head -3",
            );
            const memMatches = [...verbose.matchAll(/\[size=(\d+)([MG])\]/gi)];
            if (memMatches.length > 0) {
              const largest = memMatches.reduce((max, m) => {
                const val =
                  parseInt(m[1]) * (m[2].toUpperCase() === "G" ? 1024 : 1);
                return val > max ? val : max;
              }, 0);
              vramGB = Math.round(largest / 1024);
            }
          } catch {}
        }

        // AMD: try rocm-smi for VRAM
        if (vendor === "amd" && vramGB === 0) {
          try {
            const { stdout: rocm } = await execAsync(
              "rocm-smi --showmeminfo vram --csv 2>/dev/null | tail -1",
            );
            const match = rocm.match(/(\d+)/);
            if (match) vramGB = Math.round(parseInt(match[1]) / (1024 * 1024));
          } catch {}
        }

        return {
          gpuModel,
          vramGB,
          driverVersion: null,
          computeCapability: null,
          isIntegrated,
          vendor,
        };
      }
    } catch {}
  }

  // ── 4. Windows — WMIC ─────────────────────────────────────────
  if (platform === "win32") {
    try {
      const { stdout } = await execAsync(
        "wmic path win32_VideoController get Name,AdapterRAM,DriverVersion /format:csv",
      );
      const lines = stdout
        .trim()
        .split("\n")
        .filter((l) => l.includes(",") && !l.startsWith("Node"));

      // Prefer dedicated GPU
      const gpuLine =
        lines.find((l) => /nvidia|amd|radeon/i.test(l)) ?? lines[0];

      if (gpuLine) {
        const parts = gpuLine.split(",");
        // CSV: Node, AdapterRAM, DriverVersion, Name
        const gpuModel = (parts[3] ?? "Unknown GPU").trim();
        const ramBytes = parseInt(parts[1]?.trim() ?? "0") || 0;
        const vramGB = Math.round(ramBytes / (1024 * 1024 * 1024));
        const driverVersion = parts[2]?.trim() ?? null;

        const vendor: GpuResult["vendor"] = /nvidia/i.test(gpuModel)
          ? "nvidia"
          : /amd|radeon/i.test(gpuModel)
            ? "amd"
            : /intel/i.test(gpuModel)
              ? "intel"
              : "unknown";

        const isIntegrated =
          vendor === "intel" ||
          /integrated|iris|uhd|hd graphics/i.test(gpuModel);

        return {
          gpuModel,
          vramGB,
          driverVersion,
          computeCapability: null,
          isIntegrated,
          vendor,
        };
      }
    } catch {}
  }

  return null;
}

async function detectCuda(vendor: string): Promise<string | null> {
  // CUDA only exists on NVIDIA
  if (vendor !== "nvidia") return null;

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

  // ── CPU & RAM ─────────────────────────────────────────────────
  emit({ label: "CPU & Memory", status: "running" });
  const cpuModel = os.cpus()[0]?.model || "Unknown";
  const ramGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  const platform = os.platform();
  emit({
    label: "CPU & Memory",
    status: "done",
    value: `${cpuModel} · ${ramGB}GB RAM`,
  });

  // ── GPU ───────────────────────────────────────────────────────
  emit({ label: "GPU Detection", status: "running" });
  const gpu = await detectGpu();

  if (gpu) {
    const vendorLabel =
      gpu.vendor === "nvidia"
        ? "NVIDIA"
        : gpu.vendor === "amd"
          ? "AMD"
          : gpu.vendor === "apple"
            ? "Apple"
            : gpu.vendor === "intel"
              ? "Intel"
              : "";

    const label = gpu.isIntegrated
      ? `${gpu.gpuModel} (Integrated)`
      : `${gpu.gpuModel} (${gpu.vramGB}GB)`;

    emit({
      label: "GPU Detection",
      status: gpu.isIntegrated ? "warn" : "done",
      value: label,
      error: gpu.isIntegrated
        ? `${vendorLabel} integrated GPU — limited job compatibility`
        : undefined,
    });
  } else {
    emit({
      label: "GPU Detection",
      status: "error",
      error: "No GPU detected",
    });
  }

  // ── CUDA ──────────────────────────────────────────────────────
  emit({ label: "CUDA Version", status: "running" });
  const cuda = gpu ? await detectCuda(gpu.vendor) : null;

  if (gpu?.vendor === "nvidia") {
    emit({
      label: "CUDA Version",
      status: cuda ? "done" : "error",
      value: cuda ?? undefined,
      error: cuda ? undefined : "CUDA not found",
    });
  } else if (gpu?.vendor === "amd") {
    emit({
      label: "CUDA Version",
      status: "warn",
      error: "N/A — AMD uses ROCm, not CUDA",
    });
  } else if (gpu?.vendor === "apple") {
    emit({
      label: "CUDA Version",
      status: "warn",
      error: "N/A — Apple Silicon uses Metal",
    });
  } else {
    emit({
      label: "CUDA Version",
      status: "error",
      error: "Not available on Intel GPU",
    });
  }

  // ── Docker ────────────────────────────────────────────────────
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
    isIntegratedGpu: gpu?.isIntegrated ?? false,
    gpuVendor: gpu?.vendor ?? "unknown",
  };
}

export async function getGpuMetrics() {
  // NVIDIA
  try {
    const { stdout } = await execAsync(
      `nvidia-smi --query-gpu=utilization.gpu,memory.used,temperature.gpu,power.draw --format=csv,noheader,nounits`,
    );
    const [util, vram, temp, power] = stdout
      .trim()
      .split(",")
      .map((s) => parseFloat(s.trim()));
    return { utilization: util, vramUsedMb: vram, temperatureC: temp, powerDrawW: power };
  } catch {}

  // AMD via rocm-smi
  try {
    const { stdout } = await execAsync(
      "rocm-smi --showuse --showmeminfo vram --showtemp --csv 2>/dev/null | tail -1",
    );
    const parts = stdout.split(",");
    return {
      utilization: parseFloat(parts[1] ?? "0"),
      vramUsedMb: Math.round(parseFloat(parts[2] ?? "0") / (1024 * 1024)),
      temperatureC: parseFloat(parts[3] ?? "0"),
      powerDrawW: 0,
    };
  } catch {}

  return null;
}