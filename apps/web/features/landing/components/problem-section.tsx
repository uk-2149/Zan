"use client";

import { MouseEvent } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { LANDING_CONTENT } from "@/config/landing-content";
import {
  AlertOctagon,
  CloudOff,
  ServerCrash,
  type LucideIcon,
} from "lucide-react";

const icons: LucideIcon[] = [CloudOff, ServerCrash, AlertOctagon];

function ProblemCard({ card, index }: { card: any; index: number }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const Icon = icons[index] as unknown as (props: any) => JSX.Element;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration: 0.7,
        delay: index * 0.15,
        ease: [0.16, 1, 0.3, 1],
      }}
      onMouseMove={handleMouseMove}
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/5 bg-brand-gray/40 p-8 md:p-10 transition-colors hover:border-white/10"
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(255, 51, 102, 0.1),
              transparent 80%
            )
          `,
        }}
      />

      <div className="absolute -right-4 -top-8 select-none text-[120px] font-black text-white/[0.03] transition-transform duration-500 group-hover:scale-110 group-hover:text-white/[0.05]">
        {card.id}
      </div>

      <div className="relative z-10">
        <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500 shadow-[0_0_20px_rgba(255,0,0,0.1)] transition-transform duration-500 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,51,102,0.2)]">
          {Icon && <Icon className="h-7 w-7" />}
        </div>
        <h3 className="mb-4 text-2xl font-bold tracking-tight text-white">
          {card.title}
        </h3>
        <p className="text-lg leading-relaxed text-white/50">
          {card.description}
        </p>
      </div>
    </motion.div>
  );
}

export function ProblemSection() {
  const { tagline, headline, subheadline, cards } = LANDING_CONTENT.problem;

  return (
    <section id="problem" className="relative py-24 md:py-40">
      <div className="pointer-events-none absolute left-0 top-1/4 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-red-500/5 blur-[150px]" />
      <div className="container mx-auto px-6">
        <div className="grid items-start gap-16 lg:grid-cols-2 lg:gap-24">
          {/* Left Side: Stays Pinned while scrolling */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="sticky top-32 lg:top-48"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-sm font-medium tracking-wide text-red-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
              </span>
              {tagline}
            </div>

            <h2 className="mb-6 text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
              {headline}
            </h2>

            <p className="max-w-md text-xl leading-relaxed text-white/50">
              {subheadline}
            </p>
          </motion.div>

          {/* Right Side: The Scrolling Cards */}
          <div className="flex flex-col gap-6">
            {cards.map((card, idx) => (
              <ProblemCard key={idx} card={card} index={idx} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
