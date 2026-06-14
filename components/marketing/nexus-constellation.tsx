"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// "The Introduction Engine" — an animated Nexus graph that dramatises the core
// loop: IP owners (left) hold assets (middle) that buyers (right) discover. The
// graph drifts, reacts to the cursor with parallax, and periodically makes an
// "introduction": a light pulse travels owner -> asset -> buyer and a warm gold
// ring blooms (a verified connection). Hand-rolled SVG + rAF, no 3D libs.
// Decorative: aria-hidden, and fully static under prefers-reduced-motion.

type NodeType = "owner" | "asset" | "buyer";
type Node = { x: number; y: number; type: NodeType; depth: number };

const VW = 1000;
const VH = 720;

// Deterministic layout (no Math.random — keeps SSR and client identical).
// Owners flow on the left, assets in the middle, buyers on the right.
const NODES: Node[] = [
  { x: 160, y: 180, type: "owner", depth: 0.5 }, // 0
  { x: 130, y: 380, type: "owner", depth: 0.8 }, // 1
  { x: 220, y: 560, type: "owner", depth: 0.6 }, // 2
  { x: 440, y: 130, type: "asset", depth: 0.4 }, // 3
  { x: 500, y: 300, type: "asset", depth: 1.0 }, // 4
  { x: 430, y: 470, type: "asset", depth: 0.7 }, // 5
  { x: 560, y: 600, type: "asset", depth: 0.5 }, // 6
  { x: 520, y: 215, type: "asset", depth: 0.85 }, // 7
  { x: 820, y: 170, type: "buyer", depth: 0.5 }, // 8
  { x: 860, y: 360, type: "buyer", depth: 0.9 }, // 9
  { x: 780, y: 540, type: "buyer", depth: 0.6 }, // 10
  { x: 845, y: 625, type: "buyer", depth: 0.45 }, // 11
  { x: 300, y: 300, type: "owner", depth: 0.7 }, // 12
  { x: 645, y: 420, type: "asset", depth: 0.8 }, // 13
  { x: 905, y: 470, type: "buyer", depth: 0.55 }, // 14
  { x: 360, y: 655, type: "asset", depth: 0.6 }, // 15
];

const EDGES: [number, number][] = [
  [0, 3], [0, 7], [12, 4], [1, 5], [1, 4], [2, 15], [2, 5], [12, 7],
  [4, 8], [7, 8], [4, 9], [13, 9], [5, 10], [6, 10], [6, 11], [13, 14],
  [15, 10], [7, 9],
];

// owner -> asset -> buyer paths used for the periodic "introduction" pulse.
const INTROS: [number, number, number][] = [
  [0, 7, 8],
  [12, 4, 9],
  [1, 5, 10],
  [2, 15, 10],
  [12, 7, 9],
];

const radiusFor = (t: NodeType) => (t === "owner" ? 7 : t === "buyer" ? 6 : 4.5);
const fillFor = (t: NodeType) => (t === "asset" ? "var(--brand-tint)" : "#ffffff");

const CYCLE = 2.9; // seconds between introductions
const PULSE = 1.8; // seconds a pulse travels

export function NexusConstellation({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const nodeRefs = useRef<(SVGCircleElement | null)[]>([]);
  const glowRefs = useRef<(SVGCircleElement | null)[]>([]);
  const edgeRefs = useRef<(SVGLineElement | null)[]>([]);
  const pulseRef = useRef<SVGCircleElement>(null);
  const bloomRef = useRef<SVGCircleElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const pointer = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 });
  const highlight = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const pos = NODES.map((n) => ({ x: n.x, y: n.y }));

    const place = (t: number, drift: boolean) => {
      const px = pointer.current.x - 0.5;
      const py = pointer.current.y - 0.5;
      for (let i = 0; i < NODES.length; i++) {
        const n = NODES[i];
        const dx = drift ? Math.sin(t * 0.5 + i * 0.7) * (4 + (i % 3) * 2) : 0;
        const dy = drift ? Math.cos(t * 0.42 + i * 0.7) * (4 + (i % 3) * 2) : 0;
        pos[i].x = n.x + dx + px * 46 * n.depth;
        pos[i].y = n.y + dy + py * 46 * n.depth;
        const c = nodeRefs.current[i];
        const g = glowRefs.current[i];
        if (c) {
          c.setAttribute("cx", String(pos[i].x));
          c.setAttribute("cy", String(pos[i].y));
        }
        if (g) {
          g.setAttribute("cx", String(pos[i].x));
          g.setAttribute("cy", String(pos[i].y));
        }
      }
      const hl = highlight.current;
      for (let i = 0; i < EDGES.length; i++) {
        const [a, b] = EDGES[i];
        const l = edgeRefs.current[i];
        if (!l) continue;
        l.setAttribute("x1", String(pos[a].x));
        l.setAttribute("y1", String(pos[a].y));
        l.setAttribute("x2", String(pos[b].x));
        l.setAttribute("y2", String(pos[b].y));
        const on = hl != null && (a === hl || b === hl);
        l.setAttribute("opacity", on ? "0.6" : "0.13");
      }
      return pos;
    };

    if (reduce) {
      place(0, false);
      return;
    }

    const el = svgRef.current!;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.current.tx = (e.clientX - r.left) / r.width;
      pointer.current.ty = (e.clientY - r.top) / r.height;
    };
    const onLeave = () => {
      pointer.current.tx = 0.5;
      pointer.current.ty = 0.5;
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let startTs = 0;
    const loop = (now: number) => {
      if (!startTs) startTs = now;
      const t = (now - startTs) / 1000;
      pointer.current.x += (pointer.current.tx - pointer.current.x) * 0.06;
      pointer.current.y += (pointer.current.ty - pointer.current.y) * 0.06;
      const p = place(t, true);

      // Introduction pulse along owner -> asset -> buyer.
      const local = t % CYCLE;
      const [o, a, b] = INTROS[Math.floor(t / CYCLE) % INTROS.length];
      const pulse = pulseRef.current;
      const bloom = bloomRef.current;
      if (local < PULSE) {
        const prog = local / PULSE;
        const seg = prog < 0.5 ? prog / 0.5 : (prog - 0.5) / 0.5;
        const from = prog < 0.5 ? p[o] : p[a];
        const to = prog < 0.5 ? p[a] : p[b];
        const x = from.x + (to.x - from.x) * seg;
        const y = from.y + (to.y - from.y) * seg;
        if (pulse) {
          pulse.setAttribute("cx", String(x));
          pulse.setAttribute("cy", String(y));
          pulse.setAttribute("opacity", String(Math.sin(prog * Math.PI)));
        }
        const bloomAmt = Math.max(0, 1 - Math.abs(prog - 0.5) * 6);
        if (bloom) {
          bloom.setAttribute("cx", String(p[a].x));
          bloom.setAttribute("cy", String(p[a].y));
          bloom.setAttribute("r", String(10 + bloomAmt * 26));
          bloom.setAttribute("opacity", String(bloomAmt * 0.55));
        }
      } else {
        if (pulse) pulse.setAttribute("opacity", "0");
        if (bloom) bloom.setAttribute("opacity", "0");
      }

      // Concentric Nexus ring emanating from the graph's heart each cycle.
      const ring = ringRef.current;
      if (ring) {
        const rp = local / CYCLE;
        ring.setAttribute("r", String(40 + rp * 360));
        ring.setAttribute("opacity", String((1 - rp) * 0.12));
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      className={cn("h-full w-full", className)}
    >
      {/* center emanating ring */}
      <circle
        ref={ringRef}
        cx={VW / 2}
        cy={VH / 2}
        r={40}
        fill="none"
        stroke="#ffffff"
        strokeWidth={1}
        opacity={0}
      />

      {/* edges */}
      <g stroke="#ffffff" strokeWidth={1}>
        {EDGES.map(([a, b], i) => (
          <line
            key={i}
            ref={(el) => {
              edgeRefs.current[i] = el;
            }}
            x1={NODES[a].x}
            y1={NODES[a].y}
            x2={NODES[b].x}
            y2={NODES[b].y}
            opacity={0.13}
          />
        ))}
      </g>

      {/* node glows */}
      {NODES.map((n, i) => (
        <circle
          key={`g${i}`}
          ref={(el) => {
            glowRefs.current[i] = el;
          }}
          cx={n.x}
          cy={n.y}
          r={radiusFor(n.type) * 3.2}
          fill="#ffffff"
          opacity={0.08}
        />
      ))}

      {/* introduction bloom (verified) */}
      <circle
        ref={bloomRef}
        cx={0}
        cy={0}
        r={10}
        fill="none"
        stroke="var(--gold-tint)"
        strokeWidth={2}
        opacity={0}
      />

      {/* nodes */}
      {NODES.map((n, i) => (
        <circle
          key={`n${i}`}
          ref={(el) => {
            nodeRefs.current[i] = el;
          }}
          cx={n.x}
          cy={n.y}
          r={radiusFor(n.type)}
          fill={fillFor(n.type)}
          className="cursor-pointer"
          onPointerEnter={() => (highlight.current = i)}
          onPointerLeave={() => (highlight.current = null)}
        />
      ))}

      {/* traveling pulse */}
      <circle ref={pulseRef} cx={0} cy={0} r={4.5} fill="#ffffff" opacity={0} />
    </svg>
  );
}
