"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";
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
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    setPlatformLabel(getPlatformLabel(detectPlatform()));
  }, []);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDownloading(true);
    try {
      await downloadAgent();
    } finally {
      setTimeout(() => setIsDownloading(false), 2000);
    }
  };

  return (
    <button onClick={handleClick} className={className} disabled={isDownloading}>
      {showIcon && <Download className="w-5 h-5" />}
      {isDownloading ? "Starting download…" : children}
      {showPlatform && platformLabel && (
        <span className="opacity-60 text-xs ml-1">({platformLabel})</span>
      )}
    </button>
  );
}
