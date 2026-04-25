import { useState, useEffect } from "react";

interface Props {
  user: any;
  provider: any;
  onAddMachine: () => void;
  onProviderUpdate: (p: any) => void;
  onLogout: () => void;
}

export default function DashboardPage({
  user,
  provider: initP,
  onAddMachine,
  onProviderUpdate,
  onLogout,
}: Props) {
  const [provider, setProvider] = useState(initP);
  const [wsStatus, setWsStatus] = useState<"connected" | "disconnected">(
    "disconnected",
  );
  const [toggling, setToggling] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    setProvider(initP);
  }, [initP]);

  useEffect(() => {
    const u1 = window.api.onWsStatus((s: string) => setWsStatus(s as any));
    const u2 = window.api.onJobAssigned((job: any) => setCurrentJob(job));
    const u3 = window.api.onJobCancelled(() => setCurrentJob(null));
    if (provider)
      window.api.getStats().then((r: any) => {
        if (r.success) setStats(r);
      });
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  const toggleStatus = async () => {
    if (!provider || toggling) return;
    setToggling(true);
    setStatusError("");
    const next = provider.status === "ACTIVE" ? "OFFLINE" : "ACTIVE";
    const res = await window.api.setStatus(next);
    if (res.success) {
      const updated = { ...provider, status: res.provider.status };
      setProvider(updated);
      onProviderUpdate(updated);
    } else {
      setStatusError(res.error ?? "Failed to update status");
    }
    setToggling(false);
  };

  const doLogout = async () => {
    await window.api.logout();
    onLogout();
  };

  const isOnline = provider?.status === "ACTIVE" || provider?.status === "BUSY";
  const tierInfo = [
    { label: "New", color: "#f59e0b" },
    { label: "Trusted", color: "#3b82f6" },
    { label: "Verified", color: "#10b981" },
  ][provider?.tier ?? 0] ?? { label: "New", color: "#f59e0b" };

  return (
    <div className="dash-root">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-g">G</span>NET
        </div>
        <nav className="sidebar-nav">
          <div className="nav-item active">
            <IGrid /> Dashboard
          </div>
          <div className="nav-item">
            <IChart /> Earnings
          </div>
          <div className="nav-item">
            <ISettings /> Settings
          </div>
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar">{user.name?.[0]?.toUpperCase() ?? "U"}</div>
          <div className="user-info">
            <span className="u-name">{user.name}</span>
            <span className="u-email">{user.email}</span>
          </div>
          <button className="logout-btn" onClick={doLogout} title="Sign out">
            <ILogout />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="dash-main">
        <div className="dash-header">
          <div>
            <h1>Dashboard</h1>
            <p>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          {provider && (
            <div className={`ws-pill ${wsStatus}`}>
              <span className="ws-dot" />
              {wsStatus === "connected" ? "Connected" : "Offline"}
            </div>
          )}
        </div>

        {/* No machine */}
        {!provider ? (
          <div className="empty">
            <div className="empty-icon">
              <IMonitor />
            </div>
            <h2>No machine registered</h2>
            <p>Add your GPU to start earning SOL from compute jobs</p>
            <button className="btn-primary" onClick={onAddMachine}>
              + Add this machine
            </button>
          </div>
        ) : (
          <div className="dash-content">
            {/* Machine card */}
            <div className="machine-card">
              <div className="mc-left">
                <div className="gpu-icon">
                  <IGpu />
                </div>
                <div className="mc-info">
                  <h3>{provider.gpuModel}</h3>
                  <span className="mc-vram">{provider.vramGB} GB VRAM</span>
                </div>
              </div>
              <div className="mc-right">
                <div
                  className="tier-badge"
                  style={{ borderColor: tierInfo.color, color: tierInfo.color }}
                >
                  {tierInfo.label}
                </div>
                <div className="stake-info">
                  <span className="stake-lbl">Staked</span>
                  <span className="stake-val">
                    {Number(provider.stakedAmount).toFixed(2)} SOL
                  </span>
                </div>
                <button
                  className={`toggle-btn ${isOnline ? "on" : "off"}`}
                  onClick={toggleStatus}
                  disabled={toggling || provider.status === "BUSY"}
                >
                  {toggling ? (
                    <span
                      className="spin"
                      style={{ borderTopColor: "currentColor" }}
                    />
                  ) : isOnline ? (
                    <>
                      <span className="t-dot" /> Online
                    </>
                  ) : (
                    <>
                      <span className="t-dot" /> Go Online
                    </>
                  )}
                </button>
              </div>
            </div>
            {statusError && <div className="warn-box">{statusError}</div>}

            {/* Active job */}
            {currentJob && (
              <div className="job-banner">
                <div className="j-pulse" />
                <div className="j-info">
                  <span className="j-lbl">Running job</span>
                  <span className="j-id">{currentJob.jobId}</span>
                </div>
                <span className="j-type">{currentJob.type}</span>
              </div>
            )}

            {/* Stats */}
            <div className="stats-grid">
              <StatCard
                icon="◎"
                accent="#f59e0b"
                label="Total Earned"
                val={`${Number(stats?.totalEarned ?? 0).toFixed(3)} SOL`}
                sub="Lifetime"
              />
              <StatCard
                icon="✓"
                accent="#10b981"
                label="Jobs Completed"
                val={provider.metrics?.totalJobs ?? 0}
                sub={`${provider.metrics?.successfulJobs ?? 0} successful`}
              />
              <StatCard
                icon="★"
                accent="#3b82f6"
                label="Reputation"
                val={Number(provider.reputationScore ?? 0).toFixed(1)}
                sub="Out of 100"
              />
              <StatCard
                icon="↑"
                accent="#8b5cf6"
                label="Uptime"
                val={`${Number(provider.metrics?.uptimePercent ?? 0).toFixed(1)}%`}
                sub="Last 30 days"
              />
            </div>

            {/* Live metrics (only when online) */}
            {isOnline && (
              <div className="live-card">
                <div className="card-head">
                  <h3>Live Metrics</h3>
                  <span className="live-badge">● LIVE</span>
                </div>
                <div className="metrics-grid">
                  <MBar
                    label="GPU Utilization"
                    val={0}
                    max={100}
                    unit="%"
                    color="#10b981"
                  />
                  <MBar
                    label="VRAM Used"
                    val={0}
                    max={provider.vramGB * 1024}
                    unit=" MB"
                    color="#3b82f6"
                  />
                  <MBar
                    label="Temperature"
                    val={0}
                    max={100}
                    unit="°C"
                    color="#f59e0b"
                  />
                  <MBar
                    label="Power Draw"
                    val={0}
                    max={400}
                    unit="W"
                    color="#8b5cf6"
                  />
                </div>
              </div>
            )}

            {/* Rate + tier progress */}
            <div className="bottom-row">
              <div className="info-card">
                <span className="ic-label">Your rate</span>
                <span className="ic-val">
                  {Number(provider.pricePerHour).toFixed(4)} SOL/hr
                </span>
              </div>
              <div className="info-card">
                <span className="ic-label">Tier progress</span>
                <TierBar
                  tier={provider.tier}
                  jobs={provider.metrics?.totalJobs ?? 0}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, accent, label, val, sub }: any) {
  return (
    <div className="stat-card">
      <div className="s-icon" style={{ color: accent }}>
        {icon}
      </div>
      <div className="s-val">{val}</div>
      <div className="s-label">{label}</div>
      <div className="s-sub">{sub}</div>
    </div>
  );
}

function MBar({ label, val, max, unit, color }: any) {
  const pct = Math.min(100, (val / max) * 100);
  return (
    <div className="m-wrap">
      <div className="m-head">
        <span>{label}</span>
        <span style={{ color }}>
          {val}
          {unit}
        </span>
      </div>
      <div className="m-track">
        <div
          className="m-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function TierBar({ tier, jobs }: { tier: number; jobs: number }) {
  const milestones = [0, 50, 500];
  const next = milestones[Math.min(tier + 1, 2)];
  const prev = milestones[Math.min(tier, 2)];
  const pct =
    tier >= 2 ? 100 : Math.min(100, ((jobs - prev) / (next - prev)) * 100);
  const hints = [
    "→ Tier 1 at 50 jobs",
    "→ Tier 2 at 500 jobs",
    "Max tier reached ✓",
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="tier-track">
        <div className="tier-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="tier-hint">{hints[tier] ?? hints[0]}</span>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────
const IGrid = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const IChart = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const ISettings = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
  </svg>
);
const ILogout = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IMonitor = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);
const IGpu = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <line x1="6" y1="6" x2="6" y2="3" />
    <line x1="10" y1="6" x2="10" y2="3" />
    <line x1="14" y1="6" x2="14" y2="3" />
    <line x1="18" y1="6" x2="18" y2="3" />
    <line x1="6" y1="21" x2="6" y2="18" />
    <line x1="10" y1="21" x2="10" y2="18" />
    <line x1="14" y1="21" x2="14" y2="18" />
    <line x1="18" y1="21" x2="18" y2="18" />
    <rect x="8" y="9" width="8" height="6" rx="1" />
  </svg>
);
