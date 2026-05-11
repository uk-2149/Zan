"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, X, Copy, Check, Terminal, AlertTriangle } from "lucide-react";
import {
  detectPlatform,
  getPlatformLabel,
  downloadAgent,
} from "@/lib/download-agent";

interface DownloadAgentButtonProps {
  children?: React.ReactNode;
  className?: string;
  showIcon?: boolean;
  showPlatform?: boolean;
}

export function DownloadAgentButton({
  children,
  className,
  showIcon = true,
  showPlatform = false,
}: DownloadAgentButtonProps) {
  const [platformLabel, setPlatformLabel] = useState<string>("");
  const [platform, setPlatform] = useState<string>("unknown");
  const [isDownloading, setIsDownloading] = useState(false);
  const [showMacModal, setShowMacModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    setPlatformLabel(getPlatformLabel(p));
  }, []);

  const xattrCommand = `xattr -cr "/path/to/Zan Provider Agent.app"`;

  const copyCommand = useCallback(async () => {
    await navigator.clipboard.writeText(xattrCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [xattrCommand]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDownloading(true);
    try {
      const started = await downloadAgent();
      // Show macOS instruction modal only when a direct macOS binary is being downloaded.
      if (platform === "macos" && started) {
        setTimeout(() => setShowMacModal(true), 1500);
      }
    } finally {
      setTimeout(() => setIsDownloading(false), 2000);
    }
  };

  return (
    <>
      <button onClick={handleClick} className={className} disabled={isDownloading}>
        {showIcon && <Download className="w-5 h-5" />}
        {isDownloading ? "Starting download…" : children}
        {showPlatform && platformLabel && (
          <span className="opacity-60 text-xs ml-1">({platformLabel})</span>
        )}
      </button>

      {/* macOS Gatekeeper instruction modal */}
      {showMacModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowMacModal(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0f14] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-white font-semibold">macOS Setup Required</h3>
              </div>
              <button
                onClick={() => setShowMacModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-white/60 text-sm leading-relaxed">
                Since the app isn&apos;t signed with an Apple Developer certificate, macOS
                will block it. After installing, run this command in <strong className="text-white/80">Terminal</strong> to fix it:
              </p>

              {/* Command block */}
              <div className="relative group">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 bg-white/[0.03] rounded-t-xl">
                  <Terminal className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-[11px] text-white/30 font-mono">Terminal</span>
                </div>
                <div className="bg-white/[0.03] rounded-b-xl px-4 py-3 font-mono text-sm text-brand-cyan break-all border border-white/5 border-t-0">
                  {xattrCommand}
                </div>
                <button
                  onClick={copyCommand}
                  className="absolute top-10 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                  title="Copy command"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="text-white/40 text-xs space-y-1.5 pt-1">
                <p><strong className="text-white/60">Steps:</strong></p>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Open the downloaded <code className="text-brand-cyan/80 bg-white/5 px-1 rounded">.dmg</code> and drag the app to Applications</li>
                  <li>Open <strong className="text-white/60">Terminal</strong> (Cmd + Space → &quot;Terminal&quot;)</li>
                  <li>Paste the command above and press Enter</li>
                  <li>Open the app normally from Applications</li>
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-end gap-3">
              <button
                onClick={copyCommand}
                className="px-4 py-2 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-sm font-medium hover:bg-brand-cyan/20 transition-colors flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy Command"}
              </button>
              <button
                onClick={() => setShowMacModal(false)}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

