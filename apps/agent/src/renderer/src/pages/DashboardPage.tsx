import { useState, useEffect } from "react";

interface Props {
  user: any;
  provider: any;
  onAddMachine: () => void;
  onProviderUpdate: (p: any) => void;
  onLogout: () => void;
}

interface WalletSectionProps {
  walletAddress: string | null;
  walletBalance?: number | null;
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
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    setProvider(initP);
  }, [initP]);

  useEffect(() => {
    if (!provider) return;

    const refresh = async () => {
      const r = await window.api.getStats();
      if (r.success) setStats(r);
    };

    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [provider?.status, provider?.id]);

  useEffect(() => {
    const u1 = window.api.onWsStatus((s: string) => setWsStatus(s as any));
    const u2 = window.api.onJobAssigned((job: any) => {
      setCurrentJob(job);
      window.api.getStats().then((r: any) => {
        if (r.success) setStats(r);
      });
    });
    const u3 = window.api.onJobCancelled(() => setCurrentJob(null));
    const u4 = window.api.onJobFinished(() => {
      setCurrentJob(null);
      window.api.getStats().then((r: any) => {
        if (r.success) setStats(r);
      });
    });
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, []);

  useEffect(() => {
    window.api.getWalletBalance?.().then((r: any) => {
      if (r?.success) setWalletBalance(r.balance);
    });
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
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-g">Z</span>AN
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

        {!provider ? (
          <div className="empty" style={{ gap: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div className="empty-icon">
                <IMonitor />
              </div>
              <h2>No machine registered</h2>
              <p>Add your GPU to start earning SOL from compute jobs</p>
            </div>

            <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 24, textAlign: "left" }}>
              <WalletSection
                walletAddress={user.walletAddress ?? null}
              />
              <button 
                className="btn-primary" 
                onClick={onAddMachine}
                disabled={!user.walletAddress}
                style={{ 
                  opacity: user.walletAddress ? 1 : 0.5, 
                  cursor: user.walletAddress ? "pointer" : "not-allowed",
                  alignSelf: "center",
                  padding: "12px 32px"
                }}
              >
                + Add this machine
              </button>
            </div>
          </div>
        ) : (
          <div className="dash-content">
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

            <div className="stats-grid">
              <StatCard
                icon="◎"
                accent="#f59e0b"
                label="Total Earned"
                val={`${Number(stats?.totalEarned ?? 0).toFixed(4)} SOL`}
                sub={`${stats?.successfulJobs ?? 0} of ${stats?.totalJobs ?? 0} successful`}
              />
              <StatCard
                icon="✓"
                accent="#10b981"
                label="Jobs Completed"
                val={stats?.totalJobs ?? provider.metrics?.totalJobs ?? 0}
                sub={`${stats?.successfulJobs ?? provider.metrics?.successfulJobs ?? 0} successful`}
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

            {/* Wallet section — passes onUserUpdate up to App */}
            <WalletSection
              walletAddress={user.walletAddress ?? null}
              walletBalance={walletBalance}
            />
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

function WalletSection({
  walletAddress,
  walletBalance,
}: WalletSectionProps) {
  const [copied, setCopied] = useState(false);

  const openWalletWeb = async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const url = await window.api.getVerifyUrl();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.api.openExternal(url);
  };

  const copyUrl = async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const url = await window.api.getVerifyUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (walletAddress) {
    return (
      <div className="wallet-card connected">
        <div className="wallet-card-left">
          <div className="wallet-icon">◎</div>
          <div>
            <span className="wallet-label">Solana Wallet</span>
            <span className="wallet-address">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
            </span>
            <span className="wallet-sub">
              Wallet Balance: {typeof walletBalance === "number" ? `${walletBalance.toFixed(3)} SOL` : "—"}
            </span>
          </div>
        </div>
        <div className="wallet-connected-badge">✓ Connected</div>
      </div>
    );
  }

  return (
    <div className="wallet-card">
      <div className="wallet-card-header">
        <div className="wallet-icon">◎</div>
        <div>
          <span className="wallet-label">Verify Solana Wallet</span>
          <span className="wallet-sub">Required to receive payments</span>
        </div>
      </div>
      <div className="wallet-steps">
        <div className="wallet-step">
          <span className="step-num">1</span>
          <span>Click the button below to open your browser</span>
        </div>
        <div className="wallet-step">
          <span className="step-num">2</span>
          <span>Connect Phantom and sign the verification message</span>
        </div>
        <div className="wallet-step">
          <span className="step-num">3</span>
          <span>Refresh this app after successful verification</span>
        </div>
      </div>
      <div className="wallet-input-row" style={{ justifyContent: "flex-start", marginTop: 12, gap: 12, display: "flex" }}>
        <button className="btn-primary" onClick={openWalletWeb}>
          Verify Wallet in Browser ↗
        </button>
        <button 
          className="btn-secondary" 
          onClick={copyUrl}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0 16px', borderRadius: 8, cursor: 'pointer' }}
        >
          {copied ? "✓ Copied" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}

// Icons
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
