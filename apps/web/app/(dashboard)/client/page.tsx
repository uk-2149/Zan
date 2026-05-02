"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Terminal,
  Cpu,
  Wallet,
  Plus,
  CheckCircle2,
  Loader2,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

// FUNDED = job is waiting for the matchmaker (in queue).
// Cancelled jobs become FAILED.
type JobStatus =
  | "CREATED"
  | "FUNDED"
  | "ASSIGNED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "DISPUTED"
  | "PAID";

interface Job {
  id: string;
  title: string;
  type: string;
  status: JobStatus;
  budget: number;
  createdAt: string;
  provider: { gpuModel: string; location: string | null } | null;
  escrow: { status: string; amount: number } | null;
}

const ACTIVE_STATUSES = new Set<JobStatus>(["FUNDED", "ASSIGNED", "RUNNING"]);
const DONE_STATUSES = new Set<JobStatus>(["COMPLETED", "PAID"]);

function statusLabel(s: JobStatus): string {
  const MAP: Record<JobStatus, string> = {
    CREATED: "Pending",
    FUNDED: "In Queue",
    ASSIGNED: "Assigned",
    RUNNING: "Computing",
    COMPLETED: "Completed",
    FAILED: "Failed",
    DISPUTED: "Disputed",
    PAID: "Paid",
  };
  return MAP[s];
}

function jobProgress(s: JobStatus): number {
  const MAP: Record<JobStatus, number> = {
    CREATED: 5,
    FUNDED: 20,
    ASSIGNED: 40,
    RUNNING: 65,
    COMPLETED: 100,
    PAID: 100,
    FAILED: 100,
    DISPUTED: 100,
  };
  return MAP[s];
}

function statusColors(s: JobStatus): string {
  if (DONE_STATUSES.has(s))
    return "bg-green-500/10 border-green-500/20 text-green-400";
  if (s === "FAILED") return "bg-red-500/10 border-red-500/20 text-red-400";
  if (s === "DISPUTED")
    return "bg-orange-500/10 border-orange-500/20 text-orange-400";
  return "bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan";
}

export default function ClientDashboard(): React.JSX.Element {
  useSession({ required: true });
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch("/api/jobs?limit=10")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setJobs(d.jobs ?? []))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  const activeCount = jobs.filter((j) => ACTIVE_STATUSES.has(j.status)).length;
  const lockedAmount = jobs
    .filter((j) => j.escrow?.status === "LOCKED")
    .reduce((sum, j) => sum + Number(j.escrow?.amount ?? 0), 0);

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

        {/*Quick Metrics*/}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            {
              label: "Active Deployments",
              value: loading ? "—" : String(activeCount),
              icon: Terminal,
              color: "text-brand-cyan",
            },
            {
              label: "Total Jobs",
              value: loading ? "—" : String(jobs.length),
              icon: Cpu,
              color: "text-white",
            },
            {
              label: "Escrow Locked",
              value: loading ? "—" : `${lockedAmount.toFixed(2)} SOL`,
              icon: Wallet,
              color: "text-brand-teal",
            },
          ].map((metric, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="p-6 rounded-3xl border border-white/5 bg-brand-gray/30 backdrop-blur-xl flex items-center gap-6 group hover:border-brand-cyan/30 transition-colors"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-brand-cyan/10 transition-colors">
                <metric.icon className={`w-6 h-6 ${metric.color}`} />
              </div>
              <div>
                <p className="text-white/50 text-sm font-light mb-1">
                  {metric.label}
                </p>
                <p className="text-3xl font-bold text-white tracking-tight">
                  {metric.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Jobs table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="rounded-3xl border border-white/10 bg-brand-gray/20 backdrop-blur-xl overflow-hidden shadow-2xl"
        >
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan" />
              </span>
              Recent Workloads
            </h2>
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
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <p className="text-white/30 text-sm">No jobs yet.</p>
              <Link
                href="/client/submit"
                className="px-5 py-2.5 rounded-full bg-brand-cyan text-brand-dark text-sm font-bold hover:bg-white transition-all"
              >
                Deploy your first workload
              </Link>
            </div>
          )}

          {!loading && !fetchError && jobs.length > 0 && (
            <div className="flex flex-col">
              {jobs.map((job, idx) => (
                <Link
                  key={job.id}
                  href={`/client/jobs/${job.id}`}
                  className="p-8 border-b border-white/5 hover:bg-white/2 transition-colors group block"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-xs text-brand-cyan bg-brand-cyan/10 px-2 py-1 rounded border border-brand-cyan/20">
                          {job.id.slice(0, 12)}…
                        </span>
                        <span className="text-xs text-white/40 capitalize">
                          {job.type}
                        </span>
                        {job.provider && (
                          <span className="text-xs text-white/30">
                            {job.provider.gpuModel}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        {job.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-white/40 mb-1">Budget</p>
                        <p className="font-mono text-white">
                          {Number(job.budget).toFixed(3)} SOL
                        </p>
                      </div>
                      <div
                        className={`px-4 py-2 rounded-full border text-sm font-medium flex items-center gap-2 ${statusColors(job.status)}`}
                      >
                        {DONE_STATUSES.has(job.status) ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        {statusLabel(job.status)}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${jobProgress(job.status)}%` }}
                      transition={{
                        duration: 1.2,
                        delay: 0.4 + idx * 0.1,
                        ease: "easeOut",
                      }}
                      className={`absolute top-0 left-0 h-full rounded-full ${
                        DONE_STATUSES.has(job.status)
                          ? "bg-green-400"
                          : job.status === "FAILED"
                            ? "bg-red-400"
                            : "bg-brand-cyan shadow-[0_0_8px_#00ffd1]"
                      }`}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
