"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { LANDING_CONTENT } from "@/config/landing-content";
import { Settings2 } from "lucide-react";

const NUM_PARTICLES = 800;

function getShapePoint(step: number, index: number, total: number) {
  const cx = 200;
  const cy = 200;
  const pct = index / total;

  // SHAPE 0: "Requirements" (Target with Crosshairs)
  if (step === 0) {
    if (pct < 0.4) {
      const a = Math.random() * Math.PI * 2;
      const r = 160 + (Math.random() - 0.5) * 6; // Dusty ring
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    } else if (pct < 0.7) {
      const a = Math.random() * Math.PI * 2;
      const r = 90 + (Math.random() - 0.5) * 4;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    } else {
      if (index % 2 === 0) {
        return {
          x: cx + (Math.random() - 0.5) * 350,
          y: cy + (Math.random() - 0.5) * 4,
        };
      } else {
        return {
          x: cx + (Math.random() - 0.5) * 4,
          y: cy + (Math.random() - 0.5) * 350,
        };
      }
    }
  }

  // SHAPE 1: "Match Annotators" (Tri-Node Network)
  if (step === 1) {
    const centers = [
      { x: 200, y: 70 },
      { x: 100, y: 280 },
      { x: 300, y: 280 },
    ];
    if (pct < 0.6) {
      const c = centers[index % 3] ?? centers[0];
      const a = Math.random() * Math.PI * 2;
      const r = 35 + (Math.random() - 0.5) * 5;
      return { x: c!.x + Math.cos(a) * r, y: c!.y + Math.sin(a) * r };
    } else {
      const start = centers[index % 3] ?? centers[0];
      const end = centers[(index + 1) % 3] ?? centers[0];
      const t = Math.random();
      return {
        x:
          (start?.x ?? 0) +
          ((end?.x ?? 0) - (start?.x ?? 0)) * t +
          (Math.random() - 0.5) * 4,
        y:
          (start?.y ?? 0) +
          ((end?.y ?? 0) - (start?.y ?? 0)) * t +
          (Math.random() - 0.5) * 4,
      };
    }
  }

  // SHAPE 2: "Setup" (Gear / Wheel)
  if (step === 2) {
    if (pct < 0.3) {
      const a = Math.random() * Math.PI * 2;
      const r = 60 + (Math.random() - 0.5) * 4;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    } else if (pct < 0.7) {
      const a = Math.random() * Math.PI * 2;
      const r = 150 + (Math.random() - 0.5) * 8;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    } else {
      const a = (Math.PI / 4) * (index % 8);
      const r = 60 + Math.random() * 90;
      return {
        x: cx + Math.cos(a) * r + (Math.random() - 0.5) * 3,
        y: cy + Math.sin(a) * r + (Math.random() - 0.5) * 3,
      };
    }
  }

  // SHAPE 3: "QA" (3 Mini Targets stacked)
  if (step === 3) {
    const centers = [
      { x: 200, y: 80 },
      { x: 200, y: 200 },
      { x: 200, y: 320 },
    ];
    const c = centers[index % 3] ?? centers[0];
    if (pct < 0.7) {
      const a = Math.random() * Math.PI * 2;
      const r = 40 + (Math.random() - 0.5) * 4;
      return { x: c!.x + Math.cos(a) * r, y: c!.y + Math.sin(a) * r };
    } else {
      const a = Math.random() * Math.PI * 2;
      const r = 10 + Math.random() * 5;
      return { x: c!.x + Math.cos(a) * r, y: c!.y + Math.sin(a) * r };
    }
  }

  // SHAPE 4: "Iterate" (Recycle Loop Arrows)
  if (step === 4) {
    const a = Math.random() * Math.PI * 2;
    const r = 140 + (Math.random() - 0.5) * 10;

    // Create gaps to form the arrows
    if ((a > -0.2 && a < 0.2) || (a > Math.PI - 0.2 && a < Math.PI + 0.2)) {
      const isRight = a < 1;
      const baseX = cx + (isRight ? 140 : -140);
      const baseY = cy + (isRight ? 20 : -20);
      return {
        x: baseX + (Math.random() - 0.5) * 40,
        y: baseY + (Math.random() - 0.5) * 40,
      };
    }
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  }

  return { x: cx, y: cy };
}

const ParticleMorpher = ({ activeStep }: { activeStep: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<any[]>([]);

  useEffect(() => {
    // 1. Initialize Particles at the center
    particles.current = Array.from({ length: NUM_PARTICLES }, () => ({
      x: 200 + (Math.random() - 0.5) * 50,
      y: 200 + (Math.random() - 0.5) * 50,
      baseX: 200,
      baseY: 200,
      color: Math.random() > 0.8 ? "#ffffff" : "#00ffd1",
      size: Math.random() * 1.5 + 0.5,
      angleOffset: Math.random() * Math.PI * 2,
    }));

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      time += 0.02;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear Canvas
      ctx.clearRect(0, 0, 400, 400);

      // Global Continuous Rotation
      ctx.save();
      ctx.translate(200, 200);
      ctx.rotate(time * 0.1); // Slow global spin
      ctx.translate(-200, -200);

      // Draw and Morph Particles
      particles.current.forEach((p) => {
        // Wobble physics
        const wobbleX = Math.cos(time + p.angleOffset) * 3;
        const wobbleY = Math.sin(time + p.angleOffset) * 3;

        // Smoothly move current position towards target position (The Morph Magic)
        p.x += (p.baseX + wobbleX - p.x) * 0.08;
        p.y += (p.baseY + wobbleY - p.y) * 0.08;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // 2. Update Target Positions when user scrolls to a new step
  useEffect(() => {
    particles.current.forEach((p, i) => {
      const target = getShapePoint(activeStep, i, NUM_PARTICLES);
      p.baseX = target.x;
      p.baseY = target.y;
    });
  }, [activeStep]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      className="w-full h-full max-w-[500px] object-contain drop-shadow-[0_0_15px_rgba(0,255,209,0.3)]"
    />
  );
};

export function ProcessSection() {
  const { tagline, headline, subheadline, steps } = LANDING_CONTENT.process;
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="process" className="relative bg-brand-dark">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="pt-24 md:pt-32 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand-cyan shadow-[0_0_20px_rgba(0,255,209,0.1)]"
          >
            <Settings2 className="h-4 w-4 animate-pulse" />
            {tagline}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1] text-white"
          >
            {headline}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-white/50 leading-relaxed max-w-2xl font-light"
          >
            {subheadline}
          </motion.p>
        </div>
        <div className="flex flex-col lg:flex-row relative">
          {/* LEFT SIDE: The Scrolling Text */}
          <div className="w-full lg:w-1/2 py-24 md:py-32">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                // When this text hits the center of the screen, the particles reshape!
                onViewportEnter={() => setActiveStep(idx)}
                viewport={{ margin: "-50% 0px -50% 0px" }}
                className="min-h-[80vh] flex flex-col justify-center py-16"
              >
                {/* Mobile view of the canvas (Sticky at the top for phones) */}
                {idx === 0 && (
                  <div className="block lg:hidden sticky top-20 z-10 w-full aspect-square max-w-[300px] mx-auto mb-12">
                    <ParticleMorpher activeStep={activeStep} />
                  </div>
                )}

                <div
                  className={`transition-opacity duration-700 ${activeStep === idx ? "opacity-100" : "opacity-20"}`}
                >
                  <div className="text-7xl md:text-8xl lg:text-[140px] font-light text-brand-cyan leading-none tracking-tighter mb-6 font-mono drop-shadow-[0_0_20px_rgba(0,255,209,0.2)]">
                    {step.id}
                  </div>

                  <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight text-white">
                    {step.title}
                  </h3>

                  <p className="text-lg md:text-xl text-white/50 leading-relaxed font-light mb-10">
                    {step.description}
                  </p>

                  <ul className="flex flex-col gap-4">
                    {step.bullets?.map((bullet: string, bIdx: number) => (
                      <li
                        key={bIdx}
                        className="flex items-center gap-4 text-white/70"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan shadow-[0_0_8px_#00ffd1]" />
                        <span className="text-base md:text-lg font-light">
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>

          {/* RIGHT SIDE: The Sticky Canvas (Desktop Only) */}
          <div className="hidden lg:flex w-1/2 sticky top-0 h-screen items-center justify-center pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-brand-cyan/5 blur-[80px] rounded-full" />

            {/* The Engine */}
            <ParticleMorpher activeStep={activeStep} />
          </div>
        </div>
      </div>
    </section>
  );
}
