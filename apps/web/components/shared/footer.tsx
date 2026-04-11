"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { siteConfig } from "@/config/site";
import { Logo } from "./logo";
import { ArrowRight, Disc } from "lucide-react";

const FOOTER_LINKS = {
  Platform: ["Compute Dashboard", "List GPU Node", "Pricing", "Documentation"],
  Company: ["About Us", "Careers", "Blog", "Contact"],
  Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "SLA"],
};

const GithubIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.24c3.18-.38 6.52-1.6 6.52-7a5.2 5.2 0 0 0-1.39-3.6 5.3 5.3 0 0 0-.1-3.5s-1.13-.36-3.7 1.36a12.8 12.8 0 0 0-7 0C6.13 1.5 5 1.86 5 1.86a5.3 5.3 0 0 0-.1 3.5A5.2 5.2 0 0 0 3.5 9c0 5.4 3.34 6.6 6.52 7a4.8 4.8 0 0 0-1 3.24v4" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

export function Footer() {
  return (
    <footer className="relative bg-brand-dark pt-32 overflow-hidden border-t border-white/5">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-brand-cyan/5 blur-[150px] rounded-t-full pointer-events-none" />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl border border-white/10 bg-brand-gray/50 backdrop-blur-xl p-10 md:p-16 mb-24 overflow-hidden group"
        >
          <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-brand-cyan to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
                Ready to scale your AI?
              </h2>
              <p className="text-white/50 text-lg max-w-md font-light">
                Join the decentralized compute revolution. Access H100s and
                A100s instantly, or monetize your idle GPUs.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <Link
                href="/client"
                className="group/btn px-8 py-4 rounded-full bg-brand-cyan text-brand-dark font-bold hover:bg-white hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_30px_rgba(0,255,209,0.3)] flex items-center justify-center gap-2"
              >
                Start Computing{" "}
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-24">
          <div className="col-span-2 md:col-span-1 flex flex-col gap-6">
            <Logo />
            <p className="text-white/40 text-sm leading-relaxed font-light">
              Decentralized GPU orchestration layer. Trustless, secure, and
              infinitely scalable compute power for the next generation of AI.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <Link href={siteConfig.links.twitter} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-brand-cyan hover:border-brand-cyan hover:bg-brand-cyan/10 transition-all duration-300">
                <XIcon className="w-4 h-4" />
              </Link>
              <Link href={siteConfig.links.github} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-brand-cyan hover:border-brand-cyan hover:bg-brand-cyan/10 transition-all duration-300">
                <GithubIcon className="w-4 h-4" />
              </Link>
              <Link href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-brand-cyan hover:border-brand-cyan hover:bg-brand-cyan/10 transition-all duration-300">
                <Disc className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([category, links], idx) => (
            <div key={idx} className="flex flex-col gap-4">
              <h4 className="text-white font-bold tracking-wide uppercase text-sm mb-2">
                {category}
              </h4>
              {links.map((link, linkIdx) => (
                <Link
                  key={linkIdx}
                  href="#"
                  className="text-white/50 hover:text-brand-cyan text-sm transition-colors duration-300 w-fit"
                >
                  {link}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-8 pb-4 flex flex-col md:flex-row items-center justify-between text-white/30 text-sm font-light">
          <p>
            © {new Date().getFullYear()} {siteConfig.name} Network. All rights
            reserved.
          </p>
          <p className="mt-2 md:mt-0 flex items-center gap-1">
            Built on <span className="text-brand-cyan font-medium">Solana</span>
          </p>
        </div>
      </div>

      <div className="w-full overflow-hidden flex items-center justify-center select-none pointer-events-none translate-y-[25%] opacity-[0.03]">
        <h1 className="text-[14vw] font-black leading-none tracking-tighter whitespace-nowrap text-white font-sans">
          ZAN NETWORK
        </h1>
      </div>
    </footer>
  );
}
