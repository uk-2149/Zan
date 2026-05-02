import { LANDING_CONTENT } from "@/config/landing-content";
import type { ReactElement } from "react";

export function TickerSection(): ReactElement {
  // Combine existing with more items
  const items = [
    ...LANDING_CONTENT.ticker,
    "Kubernetes",
    "Redis",
    "Kafka",
    "PostgreSQL",
    "Next.js",
    "React",
    "TypeScript",
  ];

  return (
    <section className="py-10 border-y border-white/5 bg-brand-dark overflow-hidden flex items-center relative">
      <div className="absolute left-0 w-32 h-full bg-gradient-to-r from-brand-dark to-transparent z-10" />
      <div className="absolute right-0 w-32 h-full bg-gradient-to-l from-brand-dark to-transparent z-10" />

      <div className="flex w-max">
        <div className="flex shrink-0 animate-marquee">
          {items.map((item, i) => (
            <div key={i} className="mx-12 flex items-center gap-3 shrink-0">
              <div className="size-2 rounded-full bg-brand-cyan/50" />
              <span className="text-xl font-mono text-white/40 uppercase tracking-widest leading-none">
                {item}
              </span>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 animate-marquee" aria-hidden="true">
          {items.map((item, i) => (
            <div key={i} className="mx-12 flex items-center gap-3 shrink-0">
              <div className="size-2 rounded-full bg-brand-cyan/50" />
              <span className="text-xl font-mono text-white/40 uppercase tracking-widest leading-none">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
