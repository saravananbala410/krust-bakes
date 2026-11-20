"use client";

import { useEffect, useState } from "react";
import type { FestiveTheme } from "@/lib/festive-themes";

/**
 * Animated festival characters drawn in SVG and moved with CSS (see "Festival scenes" in globals.css):
 * swinging lanterns for Diwali and Eid, the moon for Eid, gulal clouds for Holi and balloons for
 * New Year and Valentine's Day. Christmas and Pongal characters live in festive-intro.tsx. Never blocks clicks.
 */
export function FestiveScene({ theme }: { theme: FestiveTheme }) {
  switch (theme.id) {
    case "eid": return <CrescentMoon />;
    case "holi": return <GulalBursts colors={theme.colors} />;
    case "newyear": return <Balloons colors={NEW_YEAR_COLORS} />;
    case "valentines": return <Balloons hearts colors={VALENTINE_COLORS} />;
    default: return null;
  }
}

const NEW_YEAR_COLORS = ["#FFD45C", "#7FD3FF", "#C9A2FF", "#FF8AD8", "#FFFFFF"];
const VALENTINE_COLORS = ["#FF4D6D", "#FF8FA3", "#C9184A", "#FFB3C1"];

/** Decorations that hang from the (sticky) header: render inside it. */
export function HeaderDecor({ theme, animate }: { theme: FestiveTheme; animate: boolean }) {
  const kind = ({ diwali: "kandil", eid: "fanous" } as const)[theme.id as "diwali" | "eid"];
  return <>
    {theme.id === "christmas" && <SnowCap />}
    {animate && kind && <HangingDecor kind={kind} />}
  </>;
}

// ---------- Hanging decorations from the top corners ----------

function Kandil() {
  return (
    <svg viewBox="0 0 60 110" className="h-full w-auto">
      <line x1="30" y1="0" x2="30" y2="22" stroke="#6b5446" strokeWidth="1.5" />
      <path d="M30 22 L52 44 L30 74 L8 44 Z" fill="#ff8a3d" stroke="#f5c542" strokeWidth="2" />
      <path d="M30 22 L30 74 M8 44 L52 44" stroke="#f5c542" strokeWidth="1.5" />
      <circle cx="30" cy="46" r="8" fill="#fff3b0" className="diya-glow" />
      {[16, 24, 30, 36, 44].map((x, i) => <line key={x} x1={x} y1={70 - Math.abs(30 - x) / 2} x2={x} y2={100 - (i % 2) * 8} stroke={i % 2 ? "#ec2427" : "#f5c542"} strokeWidth="2.5" strokeLinecap="round" />)}
    </svg>
  );
}

function Fanous() {
  return (
    <svg viewBox="0 0 60 110" className="h-full w-auto">
      <line x1="30" y1="0" x2="30" y2="20" stroke="#6b5446" strokeWidth="1.5" />
      <circle cx="30" cy="22" r="4" fill="none" stroke="#c9a13b" strokeWidth="2" />
      <path d="M18 34 Q30 22 42 34 Z" fill="#c9a13b" />
      <path d="M16 34 L44 34 L48 76 L12 76 Z" fill="#0f7a64" stroke="#c9a13b" strokeWidth="2" />
      <path d="M24 38 L36 38 L38 72 L22 72 Z" fill="#fff3b0" className="diya-glow" />
      <path d="M30 34 L30 76" stroke="#c9a13b" strokeWidth="1.5" />
      <path d="M12 76 L48 76 L40 86 L20 86 Z" fill="#c9a13b" />
      <path d="M30 86 L30 100" stroke="#c9a13b" strokeWidth="2" /><circle cx="30" cy="102" r="3" fill="#c9a13b" />
    </svg>
  );
}

function HangingDecor({ kind }: { kind: "kandil" | "fanous" }) {
  const Piece = kind === "kandil" ? Kandil : Fanous;
  const spots = [{ side: "left-1 sm:left-6", h: "h-14 sm:h-28", delay: 0 }, { side: "left-14 sm:left-24 max-sm:hidden", h: "h-14 sm:h-20", delay: 500 }, { side: "right-14 sm:right-24 max-sm:hidden", h: "h-14 sm:h-20", delay: 900 }, { side: "right-1 sm:right-6", h: "h-14 sm:h-28", delay: 300 }];
  return <>{spots.map((s, i) => <div key={i} aria-hidden="true" className={`lantern-swing pointer-events-none absolute top-full z-[30] ${s.side} ${s.h}`} style={{ animationDelay: `${s.delay}ms` }}><Piece /></div>)}</>;
}

// ---------- Eid: crescent moon ----------

function CrescentMoon() {
  return (
    <div aria-hidden="true" className="moon-glow pointer-events-none fixed right-3 top-[22vh] z-[34] w-14 sm:right-8 sm:w-20">
      <svg viewBox="0 0 80 80" className="h-auto w-full">
        <defs><mask id="crescent"><rect width="80" height="80" fill="#fff" /><circle cx="50" cy="32" r="26" fill="#000" /></mask></defs>
        <circle cx="38" cy="40" r="30" fill="#f2c14e" mask="url(#crescent)" />
        <path className="bulb" style={{ color: "#fff3b0" }} d="M62 46 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 z" fill="#ffe8a3" />
      </svg>
    </div>
  );
}

// ---------- Holi: clouds of coloured powder ----------

let burstId = 0;

function GulalBursts({ colors }: { colors: string[] }) {
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number; size: number; color: string }>>([]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const spawn = () => {
      if (document.visibilityState !== "visible") return;
      const id = ++burstId;
      const b = { id, x: 8 + Math.random() * 84, y: 15 + Math.random() * 70, size: 140 + Math.random() * 180, color: colors[Math.floor(Math.random() * colors.length)] };
      setBursts((list) => [...list.slice(-5), b]);
      setTimeout(() => setBursts((list) => list.filter((x) => x.id !== id)), 3200);
    };
    spawn();
    const t = setInterval(spawn, 2600);
    return () => { clearInterval(t); setBursts([]); };
  }, [colors]);
  return <>{bursts.map((b) => <span key={b.id} aria-hidden="true" className="gulal pointer-events-none fixed z-[34] rounded-full" style={{ left: `${b.x}%`, top: `${b.y}%`, width: b.size, height: b.size, background: `radial-gradient(circle, ${b.color} 0%, ${b.color}aa 35%, transparent 70%)` }} />)}</>;
}

// ---------- New Year / Valentine's: balloons drifting up ----------

function Balloons({ colors, hearts }: { colors: string[]; hearts?: boolean }) {
  const items = [6, 18, 31, 47, 62, 76, 90];
  return <>{items.map((left, i) => {
    const color = colors[i % colors.length];
    return (
      <div key={left} aria-hidden="true" className={`balloon-rise pointer-events-none fixed bottom-0 z-[34] w-9 sm:w-12 ${i % 2 ? "max-sm:hidden" : ""}`} style={{ left: `${left}%`, animationDelay: `${i * 2.3}s`, animationDuration: `${16 + (i % 3) * 3}s` }}>
        <div className="balloon-sway" style={{ animationDelay: `${i * 0.4}s` }}>
          <svg viewBox="0 0 40 90" className="h-auto w-full">
            {hearts
              ? <path d="M20 42 C4 30 2 18 10 12 C16 8 20 12 20 16 C20 12 24 8 30 12 C38 18 36 30 20 42 Z" fill={color} />
              : <ellipse cx="20" cy="22" rx="15" ry="19" fill={color} />}
            <ellipse cx="14" cy={hearts ? 18 : 15} rx="3.5" ry="5" fill="#fff" opacity=".45" />
            <path d="M18 42 L22 42 L20 46 Z" fill={color} />
            <path d="M20 46 Q16 60 22 72 Q26 82 20 90" stroke="#8a7a70" strokeWidth="1" fill="none" />
          </svg>
        </div>
      </div>
    );
  })}</>;
}

/** A wavy cap of snow along the bottom edge of the header, for Christmas. */
export function SnowCap() {
  return (
    <svg aria-hidden="true" viewBox="0 0 1200 16" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-full h-3 w-full sm:h-4">
      <path d="M0 0 H1200 V6 Q1170 16 1140 8 T1080 9 T1010 6 T950 12 T880 7 T800 11 T720 6 T650 12 T580 7 T500 11 T430 6 T360 12 T290 7 T210 11 T140 6 T70 12 T0 7 Z" fill="#ffffff" />
    </svg>
  );
}
