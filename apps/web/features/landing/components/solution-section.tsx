"use client";

import { motion } from "framer-motion";
import { LANDING_CONTENT } from "@/config/landing-content";
import { Cpu, ShieldCheck, Box, Lock, Zap, ArrowRightLeft } from "lucide-react";

export function SolutionSection() {
  const { tagline, headline, subheadline, cards } = LANDING_CONTENT.solution;
  const hardwareCard = cards[0] ?? { title: "", description: "" };
  const escrowCard = cards[1] ?? { title: "", description: "" };
  const dockerCard = cards[2] ?? { title: "", description: "" };

  return (
    <section id="solution" className="relative py-24 md:py-40 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-brand-cyan/5 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="mx-auto max-w-3xl text-center mb-20 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand-cyan shadow-[0_0_20px_rgba(0,255,209,0.1)]"
          >
            <Zap className="h-4 w-4 animate-pulse" />
            {tagline}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-8 leading-[1.1]"
          >
            {headline}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-white/50 leading-relaxed max-w-2xl mx-auto font-light"
          >
            {subheadline}
          </motion.p>
        </div>

        {/* Bento grid*/}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          {/* Card 1*/}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="md:col-span-5 flex flex-col justify-between relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-8 shadow-2xl group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/10 blur-[80px] -z-10 group-hover:bg-brand-cyan/20 transition-colors duration-700" />
            <div className="h-48 w-full rounded-2xl bg-brand-dark/50 border border-white/5 flex items-center justify-center relative overflow-hidden mb-8">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
              <div className="relative z-10 w-24 h-24 border border-brand-cyan/40 bg-brand-dark rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(0,255,209,0.2)]">
                <Cpu className="w-10 h-10 text-brand-cyan animate-pulse" />
                <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-cyan shadow-[0_0_10px_#00ffd1] animate-[scanline_3s_ease-in-out_infinite]" />
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold tracking-tight text-white mb-3">
                {hardwareCard.title}
              </h3>
              <p className="text-white/60 leading-relaxed font-light">
                {hardwareCard.description}
              </p>
            </div>
          </motion.div>

          {/* Card 2*/}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="md:col-span-7 flex flex-col justify-between relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-8 shadow-2xl group"
          >
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-teal/10 blur-[80px] -z-10 group-hover:bg-brand-teal/20 transition-colors duration-700" />
            <div className="h-48 w-full rounded-2xl bg-brand-dark/50 border border-white/5 flex items-center justify-center relative overflow-hidden mb-8 gap-4 md:gap-10">
              <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center bg-brand-gray z-10">
                <ShieldCheck className="w-6 h-6 text-white/50" />
              </div>

              <div className="flex-1 h-1 bg-white/10 relative overflow-hidden rounded-full max-w-[200px]">
                <motion.div
                  className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-transparent via-brand-cyan to-transparent shadow-[0_0_15px_#00ffd1]"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </div>

              <div className="w-20 h-20 rounded-full border border-brand-cyan/40 flex items-center justify-center bg-brand-cyan/10 shadow-[0_0_30px_rgba(0,255,209,0.2)] z-10 relative">
                <Lock className="w-8 h-8 text-brand-cyan" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-cyan rounded-full animate-ping" />
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold tracking-tight text-white mb-3">
                {escrowCard.title}
              </h3>
              <p className="text-white/60 leading-relaxed font-light">
                {escrowCard.description}
              </p>
            </div>
          </motion.div>

          {/* Card 3*/}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="md:col-span-12 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-8 md:p-12 shadow-2xl group"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-brand-cyan/5 blur-[100px] -z-10 group-hover:bg-brand-cyan/10 transition-colors duration-700" />

            <div className="w-full md:w-5/12 z-10">
              <h3 className="text-3xl font-bold tracking-tight text-white mb-4">
                {dockerCard.title}
              </h3>
              <p className="text-xl text-white/60 leading-relaxed font-light">
                {dockerCard.description}
              </p>
            </div>

            <div className="w-full md:w-7/12 h-64 rounded-2xl bg-brand-dark/50 border border-white/5 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-pattern opacity-50" />
              <div className="relative z-10 flex gap-6 items-center">
                <div className="w-24 h-24 border border-white/20 bg-brand-gray/80 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <Box className="w-8 h-8 text-white/30" />
                </div>

                <ArrowRightLeft className="w-6 h-6 text-brand-cyan/50" />

                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 15,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute -inset-4 border border-dashed border-brand-cyan/50 rounded-full"
                  />
                  <div className="w-32 h-32 border-2 border-brand-cyan bg-brand-cyan/10 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(0,255,209,0.3)]">
                    <Box className="w-12 h-12 text-brand-cyan" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
