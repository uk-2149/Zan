"use client";
import { ReactLenis } from "@studio-freight/react-lenis";
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis 
      root 
      options={{ 
        duration: 1.2, 
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
        syncTouch: false, 
        wheelMultiplier: 1, 
        touchMultiplier: 2,
      }}
    >
      {children as any}
    </ReactLenis>
  );
}