import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      <div className="relative flex items-center justify-center size-4">
        <div className="absolute inset-0 rounded-full bg-brand-cyan animate-pulse-glow" />
        <div className="relative size-2 rounded-full bg-white" />
      </div>
      <span className="font-mono text-xl font-bold tracking-tight text-white group-hover:text-brand-cyan transition-colors">
        {siteConfig.name}
      </span>
    </Link>
  );
}
