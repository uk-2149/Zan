"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, animate } from "framer-motion";
import { LANDING_CONTENT } from "@/config/landing-content";
import { Activity } from "lucide-react";

function Counter({
  from,
  to,
  suffix,
}: {
  from: number;
  to: number;
  suffix: string;
}) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(nodeRef, { once: true, margin: "-100px" });

  useEffect(() => {
    if (inView && nodeRef.current) {
      const controls = animate(from, to, {
        duration: 2,
        ease: [0.16, 1, 0.3, 1],
        onUpdate(value) {
          if (nodeRef.current) {
            nodeRef.current.textContent = `${Math.floor(value)}${suffix}`;
          }
        },
      });
      return () => controls.stop();
    }
  }, [from, to, suffix, inView]);

  return (
    <span ref={nodeRef} className="tabular-nums">
      {from}
      {suffix}
    </span>
  );
}

export function WhyZanSection() {
  const { tagline, headline, subheadline, stats } = LANDING_CONTENT.whyZan;

  return (
    <section
      id="scale"
      className="relative py-24 md:py-40 border-y border-white/5 bg-brand-dark overflow-hidden"
    >
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]" />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <div className="mb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand-cyan"
          >
            <Activity className="h-4 w-4" />
            {tagline}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
          >
            {headline}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl text-white/50 max-w-2xl font-light"
          >
            {subheadline}
          </motion.p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => {
            const numericValue = parseInt(stat.value.replace(/[^0-9]/g, ""));
            const suffix = stat.value.replace(/[0-9]/g, "");

            return (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.7, delay: idx * 0.1 }}
                className="relative p-8 rounded-3xl border border-white/10 bg-brand-gray/30 backdrop-blur-sm overflow-hidden group hover:bg-brand-gray/60 transition-colors duration-500"
              >
                <div className="absolute -inset-px bg-gradient-to-b from-brand-cyan/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  <div className="text-5xl md:text-6xl font-bold text-brand-cyan mb-4 font-mono tracking-tighter">
                    {Number.isNaN(numericValue) ? (
                      stat.value
                    ) : (
                      <Counter from={0} to={numericValue} suffix={suffix} />
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {stat.label}
                  </h3>
                  <p className="text-white/50 font-light leading-relaxed">
                    {stat.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
