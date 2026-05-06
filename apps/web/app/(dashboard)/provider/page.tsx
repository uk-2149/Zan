"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Power,
  Activity,
  HardDrive,
  Thermometer,
  Zap,
  Layers,
  Loader2,
  Server,
  Download,
} from "lucide-react";
import { api } from "@/lib/api";

export default function ProviderDashboard(): React.JSX.Element {
  const { data: session } = useSession({ required: true });
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [hasProvider, setHasProvider] = useState(false);
  const [providerData, setProviderData] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (session?.user && (session.user as any).role === "CLIENT") {
      router.push("/client");
    }
  }, [session, router]);

  useEffect(() => {
    if (!session?.user) return;

    api.get("/api/providers/me")
      .then((data: any) => {
        if (data.hasProvider) {
          setHasProvider(true);
          setProviderData(data);
          setIsOnline(data.provider.status === "ACTIVE" || data.provider.status === "BUSY");
        } else {
          setHasProvider(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch provider data:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [session]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center relative overflow-hidden">
        <Loader2 className="w-8 h-8 text-brand-cyan animate-spin mb-4" />
        <p className="text-white/50 font-mono text-sm">Loading Node Telemetry...</p>
      </div>
    );
  }

  if (!hasProvider) {
    return (
      <div className="min-h-screen bg-brand-dark pt-20 pb-24 relative overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-cyan/5 blur-[150px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 max-w-lg w-full p-10 rounded-3xl border border-white/10 bg-brand-gray/50 backdrop-blur-xl shadow-2xl text-center"
        >
          <div className="w-24 h-24 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(0,255,209,0.15)]">
            <Server className="w-10 h-10 text-brand-cyan" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">No Node Connected</h2>
          <p className="text-white/50 font-light mb-10 leading-relaxed">
            Your account is ready, but we haven't detected any attached GPU hardware. To start accepting workloads and earning SOL, you need to launch the GNet Desktop Agent.
          </p>

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="group relative flex items-center justify-center gap-3 w-full py-4 rounded-xl bg-brand-cyan text-brand-dark font-bold hover:bg-white transition-all shadow-[0_0_20px_rgba(0,255,209,0.3)]"
          >
            <Download className="w-5 h-5" />
            Download Desktop Agent
            <div className="absolute inset-0 rounded-xl ring-2 ring-white/20 scale-105 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all" />
          </a>
          
          <p className="mt-6 text-xs text-white/30 font-mono">
            Already have the agent? Just launch it and sign in.
          </p>
        </motion.div>
      </div>
    );
  }

  const { provider, metrics } = providerData;

  return (
    <div className="min-h-screen bg-brand-dark pt-10 pb-24 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />

      {/* Dynamic Glow */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] blur-[150px] rounded-full pointer-events-none transition-colors duration-1000 ${isOnline ? "bg-brand-cyan/10" : "bg-red-500/10"}`}
      />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        {/* Header & Master Switch */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6 border-b border-white/5 pb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                Node Control Panel
              </h1>
              <span className="font-mono text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/50">
                ID: {provider.id.slice(0, 10).toUpperCase()}
              </span>
            </div>
            <p className="text-white/50 font-light">
              Manage your GPU availability and track Solana earnings.
            </p>
          </motion.div>

          {/* Toggle Switch */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onClick={() => setIsOnline(!isOnline)}
            className={`group relative flex items-center gap-4 px-6 py-3 rounded-full border transition-all duration-500 overflow-hidden
              ${
                isOnline
                  ? "border-brand-cyan/40 bg-brand-cyan/10 shadow-[0_0_30px_rgba(0,255,209,0.2)]"
                  : "border-red-500/40 bg-red-500/10 shadow-[0_0_30px_rgba(255,0,0,0.1)]"
              }`}
          >
            <div
              className={`p-2 rounded-full transition-colors ${isOnline ? "bg-brand-cyan text-brand-dark" : "bg-red-500 text-white"}`}
            >
              <Power className="w-4 h-4" />
            </div>
            <span
              className={`font-bold tracking-wider uppercase text-sm ${isOnline ? "text-brand-cyan" : "text-red-500"}`}
            >
              {isOnline ? "Accepting Jobs" : "Node Offline"}
            </span>
          </motion.button>
        </div>

        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              label: "Tier Level",
              value: `Tier ${provider.tier}`,
              icon: Zap,
              border: "border-brand-cyan/20",
            },
            {
              label: "Total Earned",
              value: `${Number(metrics?.totalEarnedSol || 0).toFixed(2)} SOL`,
              icon: Layers,
              border: "border-white/5",
            },
            {
              label: "Uptime",
              value: `${Number(metrics?.uptimePercent || 0).toFixed(1)}%`,
              icon: Activity,
              border: "border-white/5",
            },
            {
              label: "Tasks Completed",
              value: (metrics?.successfulJobs || 0).toLocaleString(),
              icon: HardDrive,
              border: "border-white/5",
            },
          ].map((metric, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`p-6 rounded-3xl border ${metric.border} bg-brand-gray/40 backdrop-blur-xl flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-8">
                <p className="text-white/50 text-sm font-light">
                  {metric.label}
                </p>
                <metric.icon className="w-5 h-5 text-white/30" />
              </div>
              <p className="text-3xl font-bold text-white tracking-tight">
                {metric.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Hardware Telemetry HUD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="rounded-3xl border border-white/10 bg-brand-gray/20 backdrop-blur-xl overflow-hidden shadow-2xl relative"
        >
          {/* Scanning Line Effect */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-brand-cyan/50 shadow-[0_0_15px_#00ffd1] animate-[scanline_4s_ease-in-out_infinite]" />

          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              Hardware Telemetry
            </h2>
            <div
              className={`px-3 py-1 rounded-full text-xs font-mono border flex items-center gap-2 ${isOnline ? "bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan" : "bg-white/5 border-white/10 text-white/40"}`}
            >
              {isOnline && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
              )}
              {provider.gpuModel || "Unknown GPU"} ({provider.vramGB || 0}GB)
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* VRAM Gauge */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/50 text-sm flex items-center gap-2">
                  <HardDrive className="w-4 h-4" /> VRAM Capacity
                </span>
                <span className="font-mono text-brand-cyan">{provider.vramGB || 0} GB</span>
              </div>
              <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden relative border border-white/10">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: isOnline ? "77%" : "5%" }}
                  transition={{ duration: 1.5, type: "spring" }}
                  className={`absolute top-0 left-0 h-full rounded-full transition-colors duration-500 ${isOnline ? "bg-brand-cyan shadow-[0_0_15px_#00ffd1]" : "bg-white/20"}`}
                />
              </div>
            </div>

            {/* Temperature Gauge */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/50 text-sm flex items-center gap-2">
                  <Thermometer className="w-4 h-4" /> Core Temp
                </span>
                <span
                  className={`font-mono ${isOnline ? "text-orange-400" : "text-white/40"}`}
                >
                  {isOnline ? "68°C" : "32°C"}
                </span>
              </div>
              <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden relative border border-white/10">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: isOnline ? "65%" : "10%" }}
                  transition={{ duration: 1.5, type: "spring" }}
                  className={`absolute top-0 left-0 h-full rounded-full transition-colors duration-500 ${isOnline ? "bg-gradient-to-r from-brand-cyan to-orange-500" : "bg-white/20"}`}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
