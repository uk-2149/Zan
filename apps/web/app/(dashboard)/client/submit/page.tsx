"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, Brain, Monitor, Zap, Upload, Coins, Cpu, Loader2,
  AlertCircle, Lock, ShieldCheck, CheckCircle2, FileText,
  Database, Film, Activity, Image as ImageIcon, Clock, Sparkles,
} from "lucide-react";

//Job type definitions
const JOB_TYPE_DEFS = [
  {
    value:       "inference",
    label:       "LLM Inference",
    icon:        Brain,
    desc:        "Batch inference, model serving, and agent pipelines at scale.",
    vramDefault: 16,
    ratePerHour: 0.004,
    frameworks:  ["LLaMA-3 70B", "Mistral 7B", "Qwen 2.5", "GPT-2", "Custom"],
    inputHint:   "s3://bucket/prompts.jsonl",
    category:    "AI & Machine Learning",
  },
  {
    value:       "training",
    label:       "Model Training",
    icon:        Zap,
    desc:        "Full training runs on custom datasets — highest-value, long-running jobs.",
    vramDefault: 40,
    ratePerHour: 0.020,
    frameworks:  ["LLaMA-3", "Stable Diffusion XL", "BERT", "ResNet", "Custom"],
    inputHint:   "s3://bucket/training-data.tar.gz",
    category:    "AI & Machine Learning",
  },
  {
    value:       "fine-tune",
    label:       "Fine-tuning",
    icon:        Sparkles,
    desc:        "LoRA, QLoRA, and instruction-tuning on foundation models.",
    vramDefault: 24,
    ratePerHour: 0.12,
    frameworks:  ["LLaMA-3-8B", "LLaMA-3-70B", "Mistral 7B", "Phi-3", "Custom"],
    inputHint:   "ipfs://Qm.../finetune-pairs.jsonl",
    category:    "AI & Machine Learning",
  },
  {
    value:       "embedding",
    label:       "Embeddings",
    icon:        Database,
    desc:        "Vectorize documents, images, or code for RAG and semantic search.",
    vramDefault: 8,
    ratePerHour: 0.002,
    frameworks:  ["text-embedding-3", "BGE-M3", "E5-mistral", "CLIP", "Custom"],
    inputHint:   "s3://bucket/documents.jsonl",
    category:    "AI & Machine Learning",
  },
  {
    value:       "render",
    label:       "3D Rendering",
    icon:        Monitor,
    desc:        "GPU render farms for Blender, Unreal, and Cinema 4D scene batches.",
    vramDefault: 16,
    ratePerHour: 0.008,
    frameworks:  ["Blender", "Cinema 4D", "Unreal Engine", "V-Ray", "Custom"],
    inputHint:   "s3://bucket/scene.blend",
    category:    "Creative & Media",
  },
  {
    value:       "image-gen",
    label:       "Image Generation",
    icon:        ImageIcon,
    desc:        "Stable Diffusion, FLUX, and ControlNet batch pipelines.",
    vramDefault: 12,
    ratePerHour: 0.006,
    frameworks:  ["SDXL", "FLUX.1-dev", "SD 1.5", "ControlNet", "Custom"],
    inputHint:   "ipfs://Qm.../prompts.txt",
    category:    "Creative & Media",
  },
  {
    value:       "video-gen",
    label:       "Video & Upscaling",
    icon:        Film,
    desc:        "AI video generation, frame interpolation, and 4K upscaling.",
    vramDefault: 24,
    ratePerHour: 0.015,
    frameworks:  ["AnimateDiff", "RIFE", "Real-ESRGAN", "FILM", "Custom"],
    inputHint:   "s3://bucket/source-frames.tar.gz",
    category:    "Creative & Media",
  },
  {
    value:       "pipeline",
    label:       "Data Pipeline",
    icon:        Activity,
    desc:        "GPU-accelerated ETL, RAPIDS feature engineering, and ML preprocessing.",
    vramDefault: 8,
    ratePerHour: 0.004,
    frameworks:  ["RAPIDS cuDF", "CuPy", "Spark GPU", "Dask-CUDA", "Custom"],
    inputHint:   "s3://bucket/raw-data.parquet",
    category:    "Scientific & Data",
  },
] as const;

type JobTypeValue = (typeof JOB_TYPE_DEFS)[number]["value"];

const CATEGORIES = ["AI & Machine Learning", "Creative & Media", "Scientific & Data"] as const;

const DURATION_OPTIONS = [
  { value: "short",    label: "< 1 hour"      },
  { value: "medium",   label: "1 – 4 hours"   },
  { value: "long",     label: "4 – 12 hours"  },
  { value: "extended", label: "12 – 48 hours" },
  { value: "batch",    label: "48+ hours"     },
] as const;
type DurationValue = (typeof DURATION_OPTIONS)[number]["value"];

const TIER_INFO: Record<0 | 1 | 2, { label: string; hint: string }> = {
  0: { label: "Any",      hint: "No preference"    },
  1: { label: "Trusted",  hint: "Staked providers" },
  2: { label: "Verified", hint: "HW attested"      },
};

type Priority = "standard" | "rush";

// Helpers
function FieldLabel({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}): React.ReactElement {
  return (
    <label className="mb-2.5 flex items-center justify-between gap-4 text-sm font-medium text-white/70">
      <span>
        {children}{required && <span className="ml-1 text-red-400">*</span>}
      </span>
      {hint && <span className="text-xs font-normal text-white/30">{hint}</span>}
    </label>
  );
}

// Page
export default function SubmitJobPage(): React.ReactElement {
  useSession({ required: true });
  const router = useRouter();

  const [jobType,         setJobType]         = useState<JobTypeValue>("inference");
  const [framework,       setFramework]       = useState("");
  const [customFramework, setCustomFramework] = useState("");
  const [title,           setTitle]           = useState("");
  const [inputUri,        setInputUri]        = useState("");
  const [budget,          setBudget]          = useState("");
  const [duration,        setDuration]        = useState<DurationValue>("medium");
  const [requiredVram,    setRequiredVram]     = useState("16");
  const [gpuTier,         setGpuTier]         = useState<0 | 1 | 2>(1);
  const [priority,        setPriority]        = useState<Priority>("standard");
  const [notes,           setNotes]           = useState("");
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState("");

  const typeDef = JOB_TYPE_DEFS.find((t) => t.value === jobType)!;

  const handleTypeChange = (v: JobTypeValue) => {
    setJobType(v);
    setFramework("");
    setCustomFramework("");
    const def = JOB_TYPE_DEFS.find((t) => t.value === v)!;
    setRequiredVram(String(def.vramDefault));
  };

  const handleFrameworkClick = (fw: string) => {
    const next = fw === framework ? "" : fw;
    setFramework(next);
    if (next && next !== "Custom" && !title.trim()) {
      const def = JOB_TYPE_DEFS.find((t) => t.value === jobType)!;
      setTitle(`${next} ${def.label.toLowerCase()}`);
    }
  };

  const budgetNum   = Number(budget);
  const validBudget = !Number.isNaN(budgetNum) && budgetNum > 0;
  const estHours    = validBudget ? budgetNum / typeDef.ratePerHour : 0;
  const effectiveFw = framework === "Custom" ? customFramework : framework;

  const readiness = useMemo(
    () =>
      [
        title.trim()    && "Job named",
        inputUri.trim() && "Input attached",
        validBudget     && "Budget set",
        effectiveFw     && `Framework: ${effectiveFw}`,
      ].filter(Boolean) as string[],
    [title, inputUri, validBudget, effectiveFw],
  );

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !inputUri.trim() || !budget) {
      setError("Please fill in title, input URI, and budget.");
      return;
    }
    if (!validBudget) {
      setError("Budget must be a positive number.");
      return;
    }
    setSubmitting(true);
    const escrowTxSig = `dev_${crypto.randomUUID()}`;
    try {
      const res = await fetch("/api/jobs", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:           title.trim(),
          type:            jobType,
          inputUri:        inputUri.trim(),
          budget:          budgetNum,
          requiredVramGB:  requiredVram ? Number(requiredVram) : undefined,
          requiredGpuTier: gpuTier,
          escrowTxSig,
          metadata: {
            framework: effectiveFw || undefined,
            duration,
            priority,
            notes: notes.trim() || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push(`/client/jobs/${data.jobId}`);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark pt-8 pb-20 relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="absolute left-1/2 top-0 h-80 w-[900px] -translate-x-1/2 rounded-full bg-brand-cyan/10 blur-[140px] pointer-events-none" />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/client"
            className="mb-8 inline-flex items-center gap-2 text-sm text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="mb-10">
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              Deploy Workload
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/50">
              Choose a compute class, define requirements, attach your payload URI,
              and lock escrow. The matchmaker routes it to the right GPU.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]"
          >
            <div className="space-y-8">

              {/*Workload class*/}
              <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl backdrop-blur-xl md:p-8">
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/35">Step 1</p>
                  <h2 className="mt-1 text-2xl font-bold text-white">Workload Class</h2>
                  <p className="mt-1 text-sm text-white/40">
                    Select the compute pattern that matches your job.
                  </p>
                </div>

                {CATEGORIES.map((cat) => (
                  <div key={cat} className="mb-6 last:mb-0">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
                      {cat}
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {JOB_TYPE_DEFS.filter((t) => t.category === cat).map(
                        ({ value, label, icon: Icon, desc, vramDefault }) => {
                          const selected = jobType === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => handleTypeChange(value)}
                              aria-pressed={selected}
                              className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                                selected
                                  ? "border-brand-cyan bg-brand-cyan/10 shadow-[0_0_24px_rgba(0,255,209,0.10)]"
                                  : "border-white/10 bg-black/30 hover:border-white/25 hover:bg-white/[0.04]"
                              }`}
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <Icon
                                  className={`h-5 w-5 ${selected ? "text-brand-cyan" : "text-white/35"}`}
                                />
                                {selected && <CheckCircle2 className="h-4 w-4 text-brand-cyan" />}
                              </div>
                              <p className="text-sm font-bold text-white">{label}</p>
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/40">
                                {desc}
                              </p>
                              <p className="mt-2 text-xs text-white/25">{vramDefault}+ GB VRAM</p>
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                ))}
              </section>

              {/* Job details*/}
              <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl backdrop-blur-xl md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <FileText className="h-5 w-5 text-brand-cyan" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/35">Step 2</p>
                    <h2 className="mt-0.5 text-2xl font-bold text-white">Job Details</h2>
                  </div>
                </div>

                <div className="grid gap-6">
                  {/* Title */}
                  <div>
                    <FieldLabel required hint={`${title.length}/100`}>Title</FieldLabel>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={`${typeDef.frameworks[0]} ${typeDef.label.toLowerCase()} run`}
                      maxLength={100}
                      className="h-14 w-full rounded-2xl border border-white/10 bg-black/45 px-5 text-base text-white outline-none transition-all placeholder:text-white/25 focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20"
                    />
                  </div>

                  {/* Framework */}
                  <div>
                    <FieldLabel hint="Optional">Framework / Model</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {typeDef.frameworks.map((fw) => (
                        <button
                          key={fw}
                          type="button"
                          onClick={() => handleFrameworkClick(fw)}
                          className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                            framework === fw
                              ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                              : "border-white/10 bg-black/30 text-white/50 hover:border-white/25 hover:text-white"
                          }`}
                        >
                          {fw}
                        </button>
                      ))}
                    </div>
                    {framework === "Custom" && (
                      <input
                        type="text"
                        value={customFramework}
                        onChange={(e) => setCustomFramework(e.target.value)}
                        placeholder="e.g. my-fine-tuned-llama3"
                        className="mt-3 h-12 w-full rounded-2xl border border-white/10 bg-black/45 px-5 text-sm text-white outline-none transition-all placeholder:text-white/25 focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20"
                      />
                    )}
                  </div>

                  {/* Input URI */}
                  <div>
                    <FieldLabel required hint="S3 · IPFS · HTTPS">Input URI</FieldLabel>
                    <div className="relative">
                      <Upload className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                      <input
                        type="text"
                        value={inputUri}
                        onChange={(e) => setInputUri(e.target.value)}
                        placeholder={typeDef.inputHint}
                        className="h-14 w-full rounded-2xl border border-white/10 bg-black/45 pl-14 pr-36 font-mono text-sm text-white outline-none transition-all placeholder:text-white/20 focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setInputUri(
                            `ipfs://Qm${Math.random().toString(36).slice(2, 14)}/${jobType}-input.json`,
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-colors hover:text-white"
                      >
                        Use test URI
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-white/25">
                      Upload your dataset to S3 or IPFS first, then paste the URI here.
                    </p>
                  </div>

                  {/* Notes */}
                  <div>
                    <FieldLabel hint="Optional">Run Notes</FieldLabel>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Container image, model checkpoints, expected output path, hyperparameters, or verifier instructions."
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black/45 px-5 py-4 text-sm leading-relaxed text-white outline-none transition-all placeholder:text-white/25 focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20"
                    />
                  </div>
                </div>
              </section>

              {/* Requirements */}
              <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl backdrop-blur-xl md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <Cpu className="h-5 w-5 text-brand-cyan" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/35">Step 3</p>
                    <h2 className="mt-0.5 text-2xl font-bold text-white">Requirements</h2>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Budget */}
                  <div>
                    <FieldLabel required hint="SOL">Budget</FieldLabel>
                    <div className="relative">
                      <Coins className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                      <input
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        placeholder="0.500"
                        min="0.001"
                        step="0.001"
                        className="h-14 w-full rounded-2xl border border-white/10 bg-black/45 pl-14 pr-5 text-base text-white outline-none transition-all placeholder:text-white/25 focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20"
                      />
                    </div>
                    {validBudget && (
                      <p className="mt-1.5 text-xs text-white/30">
                        ≈ {estHours.toFixed(1)} hrs at {typeDef.ratePerHour} SOL/hr
                      </p>
                    )}
                  </div>

                  {/* Duration */}
                  <div>
                    <FieldLabel hint="Expected runtime">Estimated Duration</FieldLabel>
                    <div className="relative">
                      <Clock className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value as DurationValue)}
                        className="h-14 w-full appearance-none rounded-2xl border border-white/10 bg-black/45 pl-14 pr-10 text-base text-white outline-none transition-all focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20"
                      >
                        {DURATION_OPTIONS.map(({ value, label }) => (
                          <option key={value} value={value} className="bg-gray-900">
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Min VRAM */}
                  <div>
                    <FieldLabel hint="GB">Minimum VRAM</FieldLabel>
                    <div className="relative">
                      <Cpu className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                      <input
                        type="number"
                        value={requiredVram}
                        onChange={(e) => setRequiredVram(e.target.value)}
                        min="1"
                        max="160"
                        className="h-14 w-full rounded-2xl border border-white/10 bg-black/45 pl-14 pr-5 text-base text-white outline-none transition-all placeholder:text-white/25 focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20"
                      />
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <FieldLabel>Priority</FieldLabel>
                    <div className="grid grid-cols-2 gap-3">
                      {(["standard", "rush"] as Priority[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`h-14 rounded-2xl border text-sm font-bold transition-all ${
                            priority === p
                              ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                              : "border-white/10 bg-black/30 text-white/45 hover:border-white/25 hover:text-white"
                          }`}
                        >
                          {p === "standard" ? "Standard" : "Rush"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* GPU Tier */}
                <div className="mt-6">
                  <FieldLabel>GPU Trust Tier</FieldLabel>
                  <div className="grid grid-cols-3 gap-3">
                    {([0, 1, 2] as const).map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setGpuTier(tier)}
                        className={`rounded-2xl border px-3 py-4 text-center transition-all ${
                          gpuTier === tier
                            ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                            : "border-white/10 bg-black/30 text-white/45 hover:border-white/25 hover:text-white"
                        }`}
                      >
                        <span className="block text-sm font-bold">{TIER_INFO[tier].label}</span>
                        <span className="mt-1 block text-xs opacity-70">{TIER_INFO[tier].hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-28">
              <div className="rounded-3xl border border-brand-cyan/20 bg-brand-gray/70 p-6 shadow-[0_0_60px_rgba(0,255,209,0.08)] backdrop-blur-2xl">
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-cyan">
                    Deployment Quote
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <typeDef.icon className="h-7 w-7 text-brand-cyan" />
                    <h2 className="text-xl font-bold text-white">{typeDef.label}</h2>
                  </div>
                </div>

                <div className="space-y-3.5 border-y border-white/10 py-5">
                  {(
                    [
                      ["Budget",       validBudget ? `${budgetNum.toFixed(3)} SOL` : "Set amount"],
                      ["Est. Runtime", validBudget ? `${estHours.toFixed(1)} hrs`  : "Pending"],
                      ["Duration",     DURATION_OPTIONS.find((d) => d.value === duration)?.label ?? "–"],
                      ["Min VRAM",     requiredVram ? `${requiredVram} GB` : "Any"],
                      ["Trust",        TIER_INFO[gpuTier].label],
                      ["Priority",     priority === "rush" ? "Rush queue" : "Standard"],
                      ...(effectiveFw ? [["Framework", effectiveFw]] : []),
                    ] as [string, string][]
                  ).map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-white/45">{label}</span>
                      <span className="max-w-[160px] truncate text-right text-sm font-semibold text-white">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-300" />
                    <p className="text-sm font-bold text-amber-300">Dev Escrow</p>
                  </div>
                  <p className="text-sm leading-relaxed text-amber-100/55">
                    Funds are simulated in dev mode. The job is created with an
                    escrow reference for later Solana settlement.
                  </p>
                </div>

                {readiness.length > 0 && (
                  <div className="mt-5 space-y-2">
                    {readiness.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-white/60">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-cyan" />
                        {item}
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-relaxed text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-brand-cyan text-base font-bold text-brand-dark shadow-[0_0_35px_rgba(0,255,209,0.18)] transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Deploying…
                    </>
                  ) : (
                    <>
                      <Lock className="h-5 w-5" />
                      Lock Funds &amp; Deploy
                    </>
                  )}
                </button>
              </div>
            </aside>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
