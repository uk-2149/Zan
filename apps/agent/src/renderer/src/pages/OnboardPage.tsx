import { useState, useEffect } from "react";

interface Props {
  onComplete: (provider: any) => void;
  onBack: () => void;
}

type Step = "detecting" | "review" | "registering" | "done";
type StepStatus = "pending" | "running" | "done" | "error" | "warn";

interface DetectStep {
  label: string;
  status: StepStatus;
  value?: string;
  error?: string;
}

const INIT_STEPS: DetectStep[] = [
  { label: "CPU & Memory",  status: "pending" },
  { label: "GPU Detection", status: "pending" },
  { label: "CUDA Version",  status: "pending" },
  { label: "Docker",        status: "pending" },
];

export default function OnboardPage({ onComplete, onBack }: Props) {
  const [step, setStep]         = useState<Step>("detecting");
  const [steps, setSteps]       = useState<DetectStep[]>(INIT_STEPS);
  const [hardware, setHardware] = useState<any>(null);
  const [price, setPrice]       = useState("0.0010");
  const [error, setError]       = useState("");

  const updateStep = (incoming: DetectStep) => {
    setSteps((prev) =>
      prev.map((s) => (s.label === incoming.label ? incoming : s)),
    );
  };

  const runDetection = async () => {
    setStep("detecting");
    setSteps(INIT_STEPS);
    const unsub = window.api.onDetectStep(updateStep);
    try {
      const info = await window.api.detectMachine();
      setHardware(info);
      setStep("review");
    } catch (e: any) {
      setError("Detection failed: " + e.message);
    } finally {
      unsub();
    }
  };

  useEffect(() => { runDetection() }, []);

  const handleRegister = async () => {
    setError("");
    setStep("registering");
    const res = await window.api.registerMachine({
      hardwareInfo:   hardware,
      pricePerHour:   parseFloat(price) || 0.001,
      stakeSignature: "mock_stake_" + Date.now(), // TODO: real Solana tx
      stakedAmount:   3,
    });

    if (res.success) {
      setStep("done");
      setTimeout(() => {
        onComplete({
          id:             res.providerId,
          gpuModel:       hardware.gpuModel,
          vramGB:         hardware.vramGB,
          status:         "ACTIVE",
          tier:           0,
          reputationScore: 0,
          stakedAmount:   3,
          pricePerHour:   parseFloat(price),
          metrics: { totalJobs: 0, successfulJobs: 0, totalEarnedSol: 0, uptimePercent: 0 },
        });
      }, 1600);
    } else {
      setError(res.error ?? "Registration failed");
      setStep("review");
    }
  };

  // Determine if GPU is suitable for jobs
  const isIntegrated   = hardware?.isIntegratedGpu ?? false;
  const hasNoGpu       = !hardware || hardware.gpuModel === "Unknown GPU";
  const gpuVendor      = hardware?.gpuVendor ?? "unknown";
  const isNvidia       = gpuVendor === "nvidia";
  const canRunHeavyJobs = isNvidia && !isIntegrated && (hardware?.vramGB ?? 0) >= 6;

  return (
    <div className="onboard-root">
      <div className="onboard-wrap">
        <button className="back-btn" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <div className="ob-logo"><span className="logo-g">G</span>NET</div>
        <h2 className="ob-title">Add this machine</h2>
        <p className="ob-sub">We'll detect your hardware automatically</p>

        {/* ── Detecting ── */}
        {step === "detecting" && (
          <div className="detect-list">
            {steps.map((s) => (
              <div key={s.label} className={`d-item ${s.status}`}>
                <div className="d-ind">
                  {s.status === "pending" && <span className="d-pending" />}
                  {s.status === "running" && <span className="d-spinner" />}
                  {s.status === "done"    && <span className="d-check">✓</span>}
                  {s.status === "warn"    && <span className="d-warn">⚠</span>}
                  {s.status === "error"   && <span className="d-x">✗</span>}
                </div>
                <div className="d-info">
                  <span className="d-label">{s.label}</span>
                  {s.value && <span className="d-val">{s.value}</span>}
                  {s.error && (
                    <span className={s.status === "warn" ? "d-warn-txt" : "d-err"}>
                      {s.error}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Review ── */}
        {step === "review" && hardware && (
          <div className="review">
            <div className="hw-table">
              <HwRow
                k="GPU"
                v={hardware.gpuModel}
                hi={isNvidia && !isIntegrated}
                warn={isIntegrated || hasNoGpu}
              />
              <HwRow
                k="VRAM"
                v={hardware.vramGB > 0 ? `${hardware.vramGB} GB` : "Shared (integrated)"}
                warn={hardware.vramGB === 0}
              />
              <HwRow
                k="CUDA"
                v={hardware.cudaVersion ?? (isNvidia ? "Not found" : "N/A")}
                warn={isNvidia && !hardware.cudaVersion}
              />
              <HwRow k="Driver" v={hardware.driverVersion ?? "—"} />
              <HwRow k="CPU"    v={hardware.cpuModel} />
              <HwRow k="RAM"    v={`${hardware.ramGB} GB`} />
              <HwRow
                k="Docker"
                v={hardware.dockerInstalled ? `v${hardware.dockerVersion}` : "Not installed"}
                warn={!hardware.dockerInstalled}
              />
            </div>

            {/* ── GPU compatibility warnings ── */}
            {hasNoGpu && (
              <div className="warn-box warn-box--red">
                ✗ No GPU detected. A dedicated GPU is required to run compute jobs on GNet.
              </div>
            )}

            {!hasNoGpu && isIntegrated && (
              <div className="warn-box warn-box--amber">
                ⚠ Integrated {gpuVendor === "intel" ? "Intel" : gpuVendor === "amd" ? "AMD" : ""} GPU detected.
                This machine can only receive lightweight jobs. Most ML, rendering,
                and AI jobs require a dedicated NVIDIA GPU with 6GB+ VRAM.
                You can still register, but job availability will be limited.
              </div>
            )}

            {!hasNoGpu && !isIntegrated && !isNvidia && (
              <div className="warn-box warn-box--amber">
                ⚠ {gpuVendor === "amd" ? "AMD" : "Non-NVIDIA"} GPU detected.
                CUDA-based jobs won't be compatible. ROCm-compatible jobs will be assigned.
                Support is limited during beta.
              </div>
            )}

            {!hasNoGpu && isNvidia && !isIntegrated && (hardware?.vramGB ?? 0) < 6 && (
              <div className="warn-box warn-box--amber">
                ⚠ Low VRAM ({hardware.vramGB}GB). Jobs requiring 6GB+ VRAM won't be assigned.
                Lightweight inference jobs will still be available.
              </div>
            )}

            {canRunHeavyJobs && (
              <div className="info-box--green">
                ✓ Your GPU is compatible with all job types including ML training, rendering, and image generation.
              </div>
            )}

            {!hardware.dockerInstalled && (
              <div className="warn-box warn-box--red">
                ✗ Docker is required to run jobs.{" "}
                <a href="https://docs.docker.com/get-docker/" target="_blank" rel="noreferrer">
                  Install Docker →
                </a>
              </div>
            )}

            <div className="price-wrap">
              <div className="field">
                <label>Your hourly rate (SOL)</label>
                <div className="price-row">
                  <span className="price-sym">◎</span>
                  <input
                    className="price-inp"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <span className="price-unit">/hr</span>
                </div>
              </div>
              <span className="price-hint">
                Average is 0.0010 SOL/hr. Competitive rates get more jobs.
              </span>
            </div>

            <div className="stake-box">
              <div className="sb-top">
                <div>
                  <div className="sb-title">Required stake</div>
                  <div className="sb-sub">Partially refunded as your tier increases</div>
                </div>
                <div className="sb-amount">3 SOL</div>
              </div>
              <div className="sb-rows">
                <div className="sb-row"><span>Entry stake</span><span>3 SOL</span></div>
                <div className="sb-row muted"><span>Returned at Tier 1</span><span>−1 SOL</span></div>
                <div className="sb-row muted"><span>Returned at Tier 2</span><span>−1 SOL</span></div>
                <div className="sb-row muted"><span>Final locked stake</span><span>1 SOL</span></div>
              </div>
            </div>

            {error && <div className="err">{error}</div>}

            <button
              className="btn-primary btn-full"
              onClick={handleRegister}
              disabled={!hardware.dockerInstalled}
              title={!hardware.dockerInstalled ? "Docker required to register" : ""}
            >
              Stake 3 SOL & Register Machine
            </button>

            <button className="btn-ghost btn-full" onClick={runDetection}>
              Re-detect hardware
            </button>
          </div>
        )}

        {/* ── Registering ── */}
        {step === "registering" && (
          <div className="reg-state">
            <div className="reg-spin" />
            <p>Registering your machine on the network…</p>
          </div>
        )}

        {/* ── Done ── */}
        {step === "done" && (
          <div className="done-state">
            <div className="done-circle">✓</div>
            <h3>Machine registered!</h3>
            <p>Your GPU is now live on the GNet network</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HwRow({ k, v, hi, warn }: { k: string; v: string; hi?: boolean; warn?: boolean }) {
  return (
    <div className={`hw-row ${warn ? "warn-row" : ""}`}>
      <span className="hw-k">{k}</span>
      <span className={`hw-v ${hi ? "hi" : ""} ${warn ? "warn-val" : ""}`}>{v}</span>
    </div>
  );
}