"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Loader2, AlertCircle, Lock, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useWalletConnection } from "@/hooks/use-wallet-connection";
import { WalletConnectButton } from "@/components/shared/wallet-connect-button";

// FUNDED = job is waiting for the matchmaker (in queue).
// Cancelled jobs become FAILED.
type JobStatus =
  | "CREATED"
  | "FUNDED"
  | "QUEUED"
  | "ASSIGNED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "DISPUTED"
  | "PAID"
  | "REFUNDED";

interface Job {
  id: string;
  title: string;
  type: string;
  status: JobStatus;
  budget: number;
  finalCost: number | null;
  createdAt: string;
  completedAt: string | null;
}

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalSpent: number;
  escrowLocked: number;
}

const STATUS_CONFIG: Record<
  JobStatus,
  { dot: string; badge: string; label: string; pulse: boolean }
> = {
  CREATED: { dot: "bg-white/40", badge: "border-white/15 bg-white/5 text-white/60", label: "Pending", pulse: false },
  FUNDED: { dot: "bg-amber-400", badge: "border-amber-500/20 bg-amber-500/10 text-amber-300", label: "In Queue", pulse: true },
  QUEUED: { dot: "bg-amber-400", badge: "border-amber-500/20 bg-amber-500/10 text-amber-300", label: "In Queue", pulse: true },
  ASSIGNED: { dot: "bg-blue-400", badge: "border-blue-500/20 bg-blue-500/10 text-blue-300", label: "Assigned", pulse: true },
  RUNNING: { dot: "bg-blue-400", badge: "border-blue-500/20 bg-blue-500/10 text-blue-300", label: "Running", pulse: true },
  COMPLETED: { dot: "bg-green-400", badge: "border-green-500/20 bg-green-500/10 text-green-400", label: "Completed", pulse: false },
  FAILED: { dot: "bg-red-400", badge: "border-red-500/20 bg-red-500/10 text-red-400", label: "Failed", pulse: false },
  DISPUTED: { dot: "bg-orange-400", badge: "border-orange-500/20 bg-orange-500/10 text-orange-300", label: "Disputed", pulse: false },
  REFUNDED: { dot: "bg-white/40", badge: "border-white/15 bg-white/5 text-white/60", label: "Refunded", pulse: false },
  PAID: { dot: "bg-green-400", badge: "border-green-500/20 bg-green-500/10 text-green-400", label: "Paid", pulse: false },
};

function StatusBadge({ status }: { status: JobStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.badge}`}>
      <span className={`relative inline-flex h-2 w-2 rounded-full ${cfg.dot}`}>
        {cfg.pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${cfg.dot} opacity-70`} />}
      </span>
      {cfg.label}
    </span>
  );
}

export default function ClientDashboard(): React.JSX.Element {
  const { data: session, status } = useSession({ required: true });
  const router = useRouter();
  const { connected, balance, shortAddress } = useWalletConnection();

  useEffect(() => {
    if (session?.user && (session.user as any).role === "PROVIDER") {
      router.push("/provider");
    }
  }, [session, router]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeJobs: 0,
    totalSpent: 0,
    escrowLocked: 0,
  });
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    setFetchError(false);
    Promise.all([
      api.get(`/api/jobs/my-jobs?page=${page}`),
      api.get("/api/jobs/my-stats"),
    ])
      .then(([jobsRes, statsRes]) => {
        setJobs(jobsRes.jobs ?? []);
        setStats(statsRes);
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [page, status]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(stats.totalJobs / limit)),
    [stats.totalJobs],
  );

  return (
    <div className="min-h-screen bg-brand-dark pt-10 pb-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-100 bg-brand-cyan/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        {/*Header*/}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
              Compute Console
            </h1>
            <p className="text-white/50 font-light">
              Deploy AI workloads to decentralized GPU clusters instantly.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link
              href="/client/submit"
              className="group px-6 py-3 rounded-full bg-brand-cyan text-brand-dark font-bold hover:bg-white hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(0,255,209,0.2)] flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Deploy Workload
            </Link>
          </motion.div>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 text-lg">◎</div>
            <div>
              <p className="text-xs text-white/40">Wallet Balance</p>
              <p className="text-lg font-bold text-white font-mono">
                {connected && balance !== null ? `${balance.toFixed(3)} SOL` : "—"}
              </p>
            </div>
          </div>
          {connected ? (
            <span className="text-xs text-green-400 font-mono">{shortAddress}</span>
          ) : (
            <WalletConnectButton showBalance={false} />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[
            ["🖥️", "Active Deployments", String(stats.activeJobs)],
            ["📦", "Total Jobs", String(stats.totalJobs)],
            ["◎", "Total Spent", `${stats.totalSpent.toFixed(3)} SOL`],
          ].map(([icon, label, value], idx) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="p-5 rounded-2xl border border-white/8 bg-white/[0.025]"
            >
              <p className="text-2xl">{icon}</p>
              <p className="mt-2 text-xs text-white/40">{label}</p>
              <p className="text-xl font-bold text-white font-mono">{value}</p>
            </motion.div>
          ))}
        </div>

        {stats.escrowLocked > 0 && (
          <div className="mb-6 flex items-center gap-2 text-sm text-amber-400">
            <Lock className="h-4 w-4" />
            {stats.escrowLocked.toFixed(3)} SOL locked in escrow
          </div>
        )}

        {stats.activeJobs > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-2 w-2 rounded-full bg-blue-400 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-blue-400" />
            </span>
            <p className="text-sm text-blue-300">
              <strong>{stats.activeJobs}</strong> job{stats.activeJobs > 1 ? "s" : ""} currently running on the network
            </p>
          </div>
        )}

        {/* Jobs table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="rounded-3xl border border-white/10 bg-brand-gray/20 backdrop-blur-xl overflow-hidden shadow-2xl"
        >
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">Recent Workloads</h2>
            <button
              onClick={() => router.push("/client/submit")}
              className="text-sm text-white/50 hover:text-brand-cyan transition-colors flex items-center gap-1"
            >
              New Job <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20 gap-3 text-white/30">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading jobs…
            </div>
          )}

          {!loading && fetchError && (
            <div className="flex items-center justify-center py-20 gap-3 text-red-400/60">
              <AlertCircle className="w-5 h-5" />
              Failed to load jobs. Refresh to try again.
            </div>
          )}

          {!loading && !fetchError && jobs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-cyan/5 border border-brand-cyan/20 text-3xl">
                🚀
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No workloads yet</h3>
              <p className="text-white/40 text-sm max-w-xs mb-8">
                Deploy your first compute job to get started. Upload a Python script or connect to a render pipeline.
              </p>
              <Link
                href="/client/submit"
                className="px-5 py-2.5 rounded-full bg-brand-cyan text-brand-dark text-sm font-bold hover:bg-white transition-all"
              >
                + Deploy Workload
              </Link>
            </div>
          )}

          {!loading && !fetchError && jobs.length > 0 && (
            <div className="grid grid-cols-1 gap-4 p-6">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/client/jobs/${job.id}`}
                  className="group rounded-2xl border border-white/8 bg-white/[0.025] p-5 transition-all hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="rounded-lg bg-white/8 px-2.5 py-1 text-xs font-mono text-white/50">
                      {job.type}
                    </span>
                    <StatusBadge status={job.status} />
                  </div>

                  <h3 className="text-base font-semibold text-white mb-1 truncate">{job.title}</h3>
                  <p className="text-xs font-mono text-white/25 mb-4 truncate">{job.id}</p>

                  <div className="flex items-end justify-between">
                    <div>
                      {job.status === "COMPLETED" && job.finalCost ? (
                        <>
                          <p className="text-xs text-white/30">Spent</p>
                          <p className="text-base font-bold text-green-400 font-mono">
                            ◎ {Number(job.finalCost).toFixed(3)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-white/30">Budget</p>
                          <p className="text-base font-semibold text-white/70 font-mono">
                            ◎ {Number(job.budget).toFixed(3)}
                          </p>
                        </>
                      )}
                      {job.status === "FAILED" && (
                        <p className="text-xs text-green-400/70 mt-1">
                          Refunded: ◎ {Number(job.budget).toFixed(3)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/25">
                        {new Date(job.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {job.completedAt && (
                        <p className="text-xs text-white/20">
                          Completed {new Date(job.completedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {stats.totalJobs > limit && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/50 disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-sm text-white/30">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/50 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
