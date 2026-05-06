"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Cpu,
  ExternalLink,
  RefreshCw,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";

// QUEUED and REFUNDED don't exist in the current generated Prisma client.
// Cancelled jobs become FAILED with escrow.status = 'RELEASED'.
type JobStatus =
  | "CREATED"
  | "FUNDED"
  | "ASSIGNED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "DISPUTED"
  | "PAID";

interface JobEvent {
  id: string;
  type: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Job {
  id: string;
  title: string;
  type: string;
  status: JobStatus;
  inputUri: string;
  outputUri: string | null;
  budget: number;
  createdAt: string;
  provider: {
    gpuModel: string;
    vramGB: number;
    location: string | null;
    tier: number;
  } | null;
  escrow: {
    status: string;
    amount: number;
  } | null;
  events: JobEvent[];
}

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  CREATED: {
    label: "Created",
    color: "text-white/50",
    bg: "bg-white/5",
    border: "border-white/10",
  },
  FUNDED: {
    label: "In Queue",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  ASSIGNED: {
    label: "Assigned",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  RUNNING: {
    label: "Running",
    color: "text-brand-cyan",
    bg: "bg-brand-cyan/10",
    border: "border-brand-cyan/20",
  },
  COMPLETED: {
    label: "Completed",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  FAILED: {
    label: "Failed",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  DISPUTED: {
    label: "Disputed",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  PAID: {
    label: "Paid",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
};

const TERMINAL = new Set<JobStatus>(["COMPLETED", "FAILED", "PAID"]);
const CANCELLABLE = new Set<JobStatus>(["CREATED", "FUNDED"]);

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusIcon({ status }: { status: JobStatus }): React.ReactElement {
  if (status === "COMPLETED" || status === "PAID")
    return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === "FAILED") return <XCircle className="w-4 h-4 text-red-400" />;
  return <Loader2 className="w-4 h-4 animate-spin" />;
}

export default function JobDetailPage(): React.ReactElement {
  useSession({ required: true });
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const fetchJob = useCallback(async () => {
    try {
      const data = await api.get(`/api/jobs/${jobId}`);
      setJob(data.job);
    } catch (err: any) {
      if (err.message.includes("404") || err.message.includes("403")) {
        router.push("/client");
        return;
      }
      setFetchError("Failed to load job.");
    } finally {
      setLoading(false);
    }
  }, [jobId, router]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  useEffect(() => {
    if (!job || TERMINAL.has(job.status)) return;
    const timer = setInterval(fetchJob, 5_000);
    return () => clearInterval(timer);
  }, [job, fetchJob]);

  const handleCancel = async (): Promise<void> => {
    if (!job || !CANCELLABLE.has(job.status)) return;
    setCancelling(true);
    try {
      await api.patch(`/api/jobs/${jobId}/cancel`, {});
      await fetchJob();
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-cyan" />
      </div>
    );
  }

  if (fetchError || !job) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center gap-4 px-6">
        <XCircle className="w-12 h-12 text-red-400" />
        <p className="text-white/50">{fetchError || "Job not found."}</p>
        <Link
          href="/client"
          className="text-brand-cyan hover:underline text-sm"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[job.status];
  const isTerminal = TERMINAL.has(job.status);
  const canCancel = CANCELLABLE.has(job.status);

  return (
    <div className="min-h-screen bg-brand-dark pt-10 pb-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      <div className="container mx-auto px-6 max-w-3xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/client"
            className="inline-flex items-center gap-2 text-white/40 hover:text-white mb-8 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1.5">
                {job.title}
              </h1>
              <p className="font-mono text-xs text-white/25">{job.id}</p>
            </div>
            <div
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full border shrink-0 ${cfg.bg} ${cfg.border}`}
            >
              <StatusIcon status={job.status} />
              <span className={`text-sm font-semibold ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
          </div>

          {/* Metrics strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {[
              {
                label: "Type",
                value: job.type.charAt(0).toUpperCase() + job.type.slice(1),
              },
              {
                label: "Budget",
                value: `${Number(job.budget).toFixed(3)} SOL`,
              },
              { label: "Submitted", value: fmtDate(job.createdAt) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/5 bg-brand-gray/20 p-4"
              >
                <p className="text-xs text-white/30 mb-1">{label}</p>
                <p className="text-white font-medium text-sm truncate">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Assigned node */}
          {job.provider && (
            <div className="rounded-3xl border border-white/10 bg-brand-gray/20 backdrop-blur-xl p-6 mb-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5 text-brand-cyan" />
              </div>
              <div>
                <p className="text-xs text-white/30 mb-0.5">Assigned Node</p>
                <p className="text-white font-semibold">
                  {job.provider.gpuModel}
                </p>
                <p className="text-xs text-white/30 mt-0.5">
                  {job.provider.vramGB} GB VRAM &nbsp;·&nbsp; Tier{" "}
                  {job.provider.tier}
                  {job.provider.location && (
                    <>&nbsp;·&nbsp;{job.provider.location}</>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* I/O URIs */}
          <div className="rounded-3xl border border-white/10 bg-brand-gray/20 backdrop-blur-xl p-6 mb-6 space-y-4">
            <div>
              <p className="text-xs text-white/30 uppercase tracking-widest mb-2">
                Input
              </p>
              <p className="font-mono text-sm text-white/60 break-all">
                {job.inputUri}
              </p>
            </div>
            {job.outputUri && (
              <div>
                <p className="text-xs text-white/30 uppercase tracking-widest mb-2">
                  Output
                </p>
                <a
                  href={job.outputUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-brand-cyan break-all hover:underline inline-flex items-center gap-1.5"
                >
                  {job.outputUri}
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            )}
          </div>

          {/* Event timeline */}
          <div className="rounded-3xl border border-white/10 bg-brand-gray/20 backdrop-blur-xl p-8 mb-6">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-8">
              Timeline
            </h2>

            {job.events.length === 0 ? (
              <p className="text-white/25 text-sm">No events yet.</p>
            ) : (
              <div className="relative">
                {job.events.map((ev, i) => {
                  const isLast = i === job.events.length - 1;
                  return (
                    <div key={ev.id} className="flex gap-5">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                            isLast
                              ? "bg-brand-cyan shadow-[0_0_8px_#00ffd1]"
                              : "bg-white/20"
                          }`}
                        />
                        {!isLast && (
                          <div className="w-px flex-1 bg-white/8 mt-1 mb-1" />
                        )}
                      </div>
                      <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
                        <p className="text-white text-sm font-medium">
                          {ev.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {fmtDate(ev.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {!isTerminal && (
              <button
                type="button"
                onClick={fetchJob}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {cancelling ? "Cancelling…" : "Cancel Job"}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
