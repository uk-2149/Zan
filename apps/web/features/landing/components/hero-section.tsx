import Link from "next/link";
import { LANDING_CONTENT } from "@/config/landing-content";
import { ArrowRight, Cpu } from "lucide-react";
import { EarthGlobe } from "./earth-globe";

export function HeroSection() {
  const { badge, headline, subheadline, ctaPrimary, ctaSecondary } =
    LANDING_CONTENT.hero;
  const [line1, line2] = headline.split("\n");

  return (
    <section className="relative pt-20 pb-20 md:pt-24 md:pb-32 overflow-hidden bg-grid-pattern">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[300px] bg-brand-cyan/20 rounded-full -z-10 animate-spotlight" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-cyan/5 to-transparent h-20 w-full animate-scanline -z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-cyan/5 blur-[120px] rounded-full animate-aura -z-10" />
        <div className="absolute top-1/4 -left-20 w-[400px] h-[400px] bg-brand-cyan/5 blur-[100px] rounded-full animate-aura [animation-duration:12s] -z-10" />
        <div className="absolute bottom-1/4 -right-20 w-[400px] h-[400px] bg-brand-teal/5 blur-[100px] rounded-full animate-aura [animation-duration:15s] [animation-delay:2s] -z-10" />
      </div>

      <div className="container mx-auto px-6 relative z-10 text-center flex flex-col items-center">
        <div className="animate-spring-up [animation-delay:300ms] inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-xs font-semibold uppercase tracking-widest mb-8 shadow-[0_0_20px_rgba(0,255,209,0.15)] relative">
          <div className="absolute inset-0 rounded-full bg-brand-cyan/5 animate-pulse" />
          <Cpu className="w-4 h-4 relative z-10" />
          <span className="relative z-10">{badge}</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tight mb-8 leading-[1.05] flex flex-col items-center gap-2">
          <span className="block text-white drop-shadow-2xl animate-mask-up-blur [animation-delay:600ms]">
            {line1}
          </span>
          <span className="block bg-gradient-to-r from-brand-cyan via-white to-brand-teal bg-clip-text text-transparent pb-4 bg-[length:250%_auto] animate-energy-surge [animation-delay:1000ms]">
            {line2}
          </span>
        </h1>

        <p className="animate-tracking-in [animation-delay:1600ms] text-lg md:text-xl text-white/50 max-w-2xl mb-12 font-light">
          {subheadline}
        </p>

        <div className="animate-spring-up [animation-delay:2000ms] flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
          <Link
            href="/client"
            className="group w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-white/90 hover:scale-105 active:scale-95 transition-all duration-500 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_50px_rgba(0,255,209,0.4)]"
          >
            {ctaPrimary}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
          <Link
            href="/provider"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-brand-dark/50 backdrop-blur-md border border-white/10 text-white font-medium hover:bg-white/5 hover:border-brand-cyan/30 hover:scale-105 active:scale-95 transition-all duration-500 flex items-center justify-center"
          >
            {ctaSecondary}
          </Link>
        </div>
        <div className="mt-16 w-full flex justify-center -mb-32 md:-mb-64 pointer-events-none">
          <EarthGlobe />
        </div>
      </div>
    </section>
  );
}
