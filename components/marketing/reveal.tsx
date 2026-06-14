"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Scroll-reveal wrapper. Where CSS `animation-timeline: view()` is supported the
// stylesheet drives the reveal; elsewhere this IntersectionObserver toggles the
// `.in-view` class. Under prefers-reduced-motion the CSS forces the final state.
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** Stagger index -> delay multiplier for the IO fallback. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", inView && "in-view", className)}
      style={{ "--i": delay } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
