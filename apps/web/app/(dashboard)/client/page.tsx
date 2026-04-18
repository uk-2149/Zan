"use client";

import { motion } from "framer-motion";
import {
  Terminal,
  Cpu,
  Wallet,
  Plus,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";

const MOCK_JOBS = [
  {
    id: "job_9x2af",
    name: "Llama-3 70B Finetune",
    status: "Computing",
    progress: 68,
    cost: "4.20 USDC",
    node: "Tokyo-01 (RTX 4090)",
  },
  {
    id: "job_3b8cp",
    name: "Stable Diffusion Batch",
    status: "Verifying",
    progress: 95,
    cost: "1.15 USDC",
    node: "Frankfurt-04 (A100)",
  },
  {
    id: "job_7m1zq",
    name: "Blender Frame Render",
    status: "Completed",
    progress: 100,
    cost: "0.85 USDC",
    node: "SF-09 (RTX 3090)",
  },
];

export default function ClientDashboard() {
  return (
    <div className="min-h-screen bg-brand-dark pt-10 pb-24 relative overflow-hidden">
      {/*Background*/}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-cyan/5 blur-[120px] rounded-full pointer-events-none" />

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

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="group px-6 py-3 rounded-full bg-brand-cyan text-brand-dark font-bold hover:bg-white hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(0,255,209,0.2)] flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Deploy Workload
          </motion.button>
        </div>

        {/*Quick Metrics*/}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            {
              label: "Active Deployments",
              value: "2",
              icon: Terminal,
              color: "text-brand-cyan",
            },
            {
              label: "Compute Hours",
              value: "142.5h",
              icon: Cpu,
              color: "text-white",
            },
            {
              label: "Escrow Locked",
              value: "$5.35",
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

        {/*Active Jobs*/}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="rounded-3xl border border-white/10 bg-brand-gray/20 backdrop-blur-xl overflow-hidden shadow-2xl"
        >
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan"></span>
              </span>
              Active Workloads
            </h2>
            <button className="text-sm text-white/50 hover:text-brand-cyan transition-colors flex items-center gap-1">
              View History <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col">
            {MOCK_JOBS.map((job, idx) => (
              <div
                key={job.id}
                className="p-8 border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-xs text-brand-cyan bg-brand-cyan/10 px-2 py-1 rounded border border-brand-cyan/20">
                        {job.id}
                      </span>
                      <span className="text-xs text-white/40">{job.node}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">{job.name}</h3>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-white/40 mb-1">Escrow</p>
                      <p className="font-mono text-white">{job.cost}</p>
                    </div>
                    <div
                      className={`px-4 py-2 rounded-full border text-sm font-medium flex items-center gap-2
                      ${
                        job.status === "Completed"
                          ? "bg-green-500/10 border-green-500/20 text-green-400"
                          : job.status === "Verifying"
                            ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                            : "bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan"
                      }`}
                    >
                      {job.status === "Completed" ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {job.status}
                    </div>
                  </div>
                </div>

                {/*Progress Bar*/}
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${job.progress}%` }}
                    transition={{
                      duration: 1.5,
                      delay: 0.5 + idx * 0.2,
                      ease: "easeOut",
                    }}
                    className={`absolute top-0 left-0 h-full rounded-full ${job.status === "Completed" ? "bg-green-400" : "bg-brand-cyan shadow-[0_0_10px_#00ffd1]"}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
