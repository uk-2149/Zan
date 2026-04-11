import { LANDING_CONTENT } from "@/config/landing-content";

export function TickerSection() {
  return (
    <section className="py-10 border-y border-white/5 bg-brand-dark overflow-hidden flex items-center relative">
      <div className="absolute left-0 w-32 h-full bg-gradient-to-r from-brand-dark to-transparent z-10" />
      <div className="absolute right-0 w-32 h-full bg-gradient-to-l from-brand-dark to-transparent z-10" />
      
      <div className="flex whitespace-nowrap animate-marquee">
        {[...LANDING_CONTENT.ticker, ...LANDING_CONTENT.ticker].map((item, i) => (
          <div key={i} className="mx-12 flex items-center gap-3">
            <div className="size-2 rounded-full bg-brand-cyan/50" />
            <span className="text-xl font-mono text-white/40 uppercase tracking-widest">
              {item}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}