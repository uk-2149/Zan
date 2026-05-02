"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { Logo } from "./logo";
import { LogOut, User, LayoutDashboard, ChevronDown } from "lucide-react";

const NAV_LINKS = [
  { name: "Problem", href: "#problem" },
  { name: "Solution", href: "#solution" },
  { name: "Process", href: "#process" },
  { name: "Scale", href: "#scale" },
  { name: "Security", href: "#security" },
];

export function Navbar(): ReactElement {
  const { data: session, status } = useSession();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isLoading = status === "loading";
  const isLoggedIn = status === "authenticated";

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

          {!isLoading && (
            <>
              {isLoggedIn ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-cyan/20 flex items-center justify-center border border-brand-cyan/30">
                      <User className="w-4 h-4 text-brand-cyan" />
                    </div>
                    <span className="text-sm font-medium text-white/80 hidden sm:block">
                      {session.user?.name?.split(" ")[0] || "Account"}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-white/40 transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-56 rounded-2xl border border-white/10 bg-brand-gray/90 backdrop-blur-xl p-2 shadow-2xl overflow-hidden"
                      >
                        <Link
                          href="/client"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <LayoutDashboard className="w-4 h-4" /> Dashboard
                        </Link>
                        <button
                          onClick={() => signOut()}
                          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all mt-1"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="group relative px-6 py-2.5 rounded-full bg-white text-black text-sm font-bold hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(0,255,209,0.4)] overflow-hidden"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-brand-cyan/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                  <span className="relative z-10">Launch App</span>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
