"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { LANDING_CONTENT } from "@/config/landing-content";
import { LockKeyhole, ShieldAlert, Fingerprint, FileCode2, Network } from "lucide-react";

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";

function CipherText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState(text);
  const textRef = useRef<HTMLHeadingElement>(null);
  const inView = useInView(textRef, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!inView) return;
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText((prev) =>
        text.split("").map((letter, index) => {
          if (index < iteration) return text[index];
          return letters[Math.floor(Math.random() * 42)];
        }).join("")
      );
      if (iteration >= text.length) clearInterval(interval);
      iteration += 1 / 3;
    }, 30);
    return () => clearInterval(interval);
  }, [inView, text]);

  return <h3 ref={textRef} className="text-2xl font-bold text-white mb-4 tracking-tight">{displayText}</h3>;
}

const securityIcons = [FileCode2, Network, ShieldAlert, Fingerprint];

export function SecuritySection() {
  const { tagline, headline, subheadline, features } = LANDING_CONTENT.security;

  return (
    <section className="relative py-32 md:py-48 overflow-hidden bg-brand-dark">
      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        
        <div className="flex flex-col lg:flex-row items-center gap-20">
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
            whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, ease:[0.16, 1, 0.3, 1] }}
            className="w-full lg:w-5/12 relative aspect-square flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-brand-cyan/10 blur-[120px] rounded-full" />
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} className="absolute w-[80%] h-[80%] border border-dashed border-brand-cyan/30 rounded-full" />
            <motion.div animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute w-[60%] h-[60%] border border-white/10 rounded-full flex items-center justify-center" />
            <div className="relative z-10 w-48 h-48 bg-brand-gray/80 backdrop-blur-xl border border-brand-cyan/50 rounded-3xl flex items-center justify-center shadow-[0_0_80px_rgba(0,255,209,0.2)]">
              <LockKeyhole className="w-20 h-20 text-brand-cyan" />
              <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-cyan shadow-[0_0_15px_#00ffd1] animate-[scanline_2s_ease-in-out_infinite]" />
            </div>
          </motion.div>
          <div className="w-full lg:w-7/12">
            <div className="mb-16">
              <span className="text-brand-cyan text-sm font-bold tracking-widest uppercase mb-4 block">
                {tagline}
              </span>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
                {headline}
              </h2>
              <p className="text-xl text-white/50 max-w-xl font-light">
                {subheadline}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {features.map((feature, idx) => {
                const Icon = securityIcons[idx] ?? LockKeyhole;
                return (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6, delay: idx * 0.15 }}
                    className="group"
                  >
                    <div className="w-12 h-12 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center mb-6 group-hover:border-brand-cyan/50 group-hover:bg-brand-cyan/10 transition-all duration-500">
                      <Icon className="w-5 h-5 text-white/50 group-hover:text-brand-cyan transition-colors" />
                    </div>
                    <CipherText text={feature.title} />
                    <p className="text-white/50 font-light leading-relaxed">
                      {feature.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}