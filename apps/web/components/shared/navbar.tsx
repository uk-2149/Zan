"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Logo } from "./logo";

const NAV_LINKS = [
  { name: "Problem", href: "#problem" },
  { name: "Solution", href: "#solution" },
  { name: "Process", href: "#process" },
  { name: "Scale", href: "#scale" },
  { name: "Security", href: "#security" },
];

export function Navbar() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-brand-dark/60 backdrop-blur-xl">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Logo />

        <nav className="hidden lg:flex items-center gap-8 relative">
          {NAV_LINKS.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="relative text-sm font-medium text-white/60 hover:text-white transition-colors duration-300 py-2"
            >
              {link.name}
              {hoveredIndex === idx && (
                <motion.div
                  layoutId="navbar-indicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-cyan shadow-[0_0_10px_#00ffd1]"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-6">
          <Link
            href="/provider"
            className="hidden md:block text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            Earn with GPU
          </Link>
          <Link
            href="/client"
            className="group relative px-6 py-2.5 rounded-full bg-white text-black text-sm font-bold hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(0,255,209,0.4)] overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-brand-cyan/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            <span className="relative z-10">Launch App</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
