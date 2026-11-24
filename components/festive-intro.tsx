"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type { FestiveTheme } from "@/lib/festive-themes";

/*
 * Festival intro: the first time the visitor scrolls down a page, the page holds still while the
 * festival's character runs across the screen (Santa's sleigh, the Pongal bullock, …), then the
 * page scrolls on by itself. It plays once per visit, and tapping, scrolling again or Esc skips it.
 * Also the garlands under the header for Christmas, Pongal and the four seasons.
 * Drawn in SVG, animated with CSS ("Festival intro" in globals.css).
 */

const INTRO_MS: Partial<Record<FestiveTheme["id"], number>> = { christmas: 3600, pongal: 4200 };
const SCROLL_KEYS = new Set(["ArrowDown", "PageDown", " ", "Spacebar", "End"]);
/** Plays once per visit (browser tab session) and theme, not on every page. */
const seenKey = (id: string) => `krust-intro-${id}`;
const alreadySeen = (id: string) => {
  if (new URLSearchParams(window.location.search).has("previewTheme")) return false; // admin preview: always show it
  try { return sessionStorage.getItem(seenKey(id)) === "1"; } catch { return false; }
};

export function ScrollIntro({ theme, title, children }: { theme: FestiveTheme; title: string; children?: ReactNode }) {
  // Only ever rendered in the browser (motion is off during server render), so storage is readable here.
  const [phase, setPhase] = useState<"armed" | "playing" | "done">(() => (alreadySeen(theme.id) ? "done" : "armed"));
  const phaseRef = useRef(phase);
  const startedAt = useRef(0);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const ms = INTRO_MS[theme.id] ?? 2800;

  // Hold the first downward scroll (wheel, touch swipe or keys) and start the intro instead.
  useEffect(() => {
    if (phase === "done") return;
    const inOverlay = (e: Event) => !!(e.target as Element | null)?.closest?.('[role="dialog"], input, textarea, select, [contenteditable="true"]');
    const skip = () => { if (phaseRef.current === "playing" && performance.now() - startedAt.current > 500) setPhase("done"); };
    const hold = (e: Event) => {
      if (inOverlay(e)) return;
      // Only from the top of the page (e.g. not after a reload half-way down).
      if (phaseRef.current === "armed" && window.scrollY > 80) return;
      e.preventDefault();
      if (phaseRef.current === "armed") { startedAt.current = performance.now(); setPhase("playing"); }
      else skip(); // scrolling again during the intro skips it
    };
    const onWheel = (e: WheelEvent) => { if (e.deltaY > 0 || phaseRef.current === "playing") hold(e); };
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current === "playing" && e.key === "Escape") { setPhase("done"); return; }
      if (SCROLL_KEYS.has(e.key) || (phaseRef.current === "playing" && ["ArrowUp", "PageUp", "Home"].includes(e.key))) hold(e);
    };
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => { const dy = startY - (e.touches[0]?.clientY ?? 0); if (dy > 6 || phaseRef.current === "playing") hold(e); };
    const onPointer = () => skip();
    addEventListener("wheel", onWheel, { passive: false });
    addEventListener("keydown", onKey);
    addEventListener("touchstart", onTouchStart, { passive: true });
    addEventListener("touchmove", onTouchMove, { passive: false });
    addEventListener("pointerdown", onPointer);
    return () => { removeEventListener("wheel", onWheel); removeEventListener("keydown", onKey); removeEventListener("touchstart", onTouchStart); removeEventListener("touchmove", onTouchMove); removeEventListener("pointerdown", onPointer); };
  }, [phase]);

  // When the character has crossed, let go and carry the page down for the visitor.
  useEffect(() => {
    if (phase !== "playing") return;
    try { sessionStorage.setItem(seenKey(theme.id), "1"); } catch { /* storage blocked: may replay next page */ }
    document.documentElement.dataset.festiveIntro = "playing";
    const t = setTimeout(() => {
      setPhase("done");
      requestAnimationFrame(() => window.scrollBy({ top: Math.round(innerHeight * 0.6), behavior: "smooth" }));
    }, ms);
    return () => { clearTimeout(t); delete document.documentElement.dataset.festiveIntro; };
  }, [phase, theme.id, ms]);

  if (phase !== "playing") return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[75] overflow-hidden" style={{ "--intro-ms": `${ms}ms` } as React.CSSProperties}>
      <div className="intro-veil absolute inset-0" />
      {theme.id === "christmas" && <ChristmasIntro />}
      {theme.id === "pongal" && <PongalIntro />}
      {theme.id === "holi" && <HoliIntro colors={theme.colors} />}
      {theme.id === "eid" && <EidIntro />}
      {theme.id === "valentines" && <HeartsIntro />}
      {theme.id === "newyear" && <BalloonIntro />}
      {theme.id === "spring" && <SpringIntro />}
      {theme.id === "summer" && <SummerIntro />}
      {theme.id === "autumn" && <AutumnIntro colors={theme.colors} />}
      {theme.id === "winter" && <WinterIntro />}
      {children}
      <div className="intro-greet festive-banner absolute left-1/2 top-[18%] max-w-[92vw] truncate rounded-full border-2 border-(--fest-gold) px-6 py-3 font-display text-2xl text-white shadow-2xl sm:px-9 sm:text-4xl">{theme.emoji} {title} {theme.emoji}</div>
      <div className="intro-hint absolute bottom-5 left-1/2 whitespace-nowrap rounded-full bg-ink/70 px-4 py-2 text-[11px] font-bold uppercase tracking-[.16em] text-white backdrop-blur">Tap or scroll to skip</div>
    </div>
  );
}

// ---------- Christmas ----------

function Reindeer({ x, lead }: { x: number; lead?: boolean }) {
  const fur = "#a8693a", dark = "#8a5530", far = "#6e4322", cream = "#ecd5b0";
  const leg = (cls: string, d: string, hoof: [number, number], color: string) => (
    <g className={cls}><path d={d} stroke={color} strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /><rect x={hoof[0]} y={hoof[1]} width="7" height="4" rx="1.5" fill="#2b1a14" /></g>
  );
  return (
    <g transform={`translate(${x} 0)`}>
      {leg("gallop-b", "M-16 62 L-20 76 L-18 87", [-22, 86], far)}
      {leg("gallop-a", "M16 62 L20 76 L19 87", [16, 86], far)}
      <path d="M-30 54 C-30 42 -16 38 0 39 C16 39 28 42 30 52 C31 62 22 68 4 68 C-14 69 -30 66 -30 54 Z" fill={fur} />
      <path d="M-20 62 C-8 67 10 67 22 62 C14 70 -12 70 -20 62 Z" fill={cream} />
      <path d="M-29 47 C-37 42 -39 51 -32 53 Z" fill="#fff" />
      {leg("gallop-a", "M-10 62 L-13 76 L-10 87", [-14, 86], dark)}
      {leg("gallop-b", "M22 60 L27 74 L27 87", [24, 86], dark)}
      <path d="M6 40 C9 50 9 60 5 67" stroke="#c8102e" strokeWidth="3.5" fill="none" />
      <circle cx="8" cy="53" r="2.2" fill="#f2c14e" />
      <path d="M20 46 C24 36 28 28 32 22 L42 25 C39 33 35 43 30 54 Z" fill={fur} />
      <path d="M25 43 C28 37 30 32 33 27" stroke={cream} strokeWidth="4" strokeLinecap="round" opacity=".85" />
      <path d="M21 44 C25 49 31 49 34 45" stroke="#c8102e" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="28" cy="50" r="3" fill="#f2c14e" stroke="#b8860b" strokeWidth=".8" />
      <g stroke="#e3c79b" strokeWidth="2.6" fill="none" strokeLinecap="round">
        <path d="M34 16 C32 9 28 4 23 1 M30 9 C26 8 23 9 20 11 M27 5 C27 2 28 0 30 -2" />
        <path d="M40 15 C41 8 45 3 50 0 M44 8 C47 6 50 6 53 7 M47 3 C47 1 46 -1 44 -3" />
      </g>
      <path d="M33 19 C27 15 24 17 26 20 C28 22 31 22 34 21 Z" fill={dark} />
      <path d="M31 20 C32 13 41 11 48 15 C54 18 58 22 57 26 C56 30 50 30 44 29 C37 29 31 26 31 20 Z" fill={fur} />
      <ellipse cx="51" cy="26" rx="6" ry="3.6" fill={cream} />
      <circle cx="57" cy="24.5" r={lead ? 3.4 : 2.4} fill={lead ? "#ff2a2a" : "#2b1a14"} className={lead ? "rudolph-nose" : undefined} />
      <circle cx="41" cy="19" r="2" fill="#1a0f08" /><circle cx="41.7" cy="18.3" r=".7" fill="#fff" />
      <path d="M38 16.3 Q41 14.8 43.6 16.4" stroke="#5c3a1a" strokeWidth=".9" fill="none" />
      <path d="M49 29 Q52 31 54.5 29" stroke="#5c3a1a" strokeWidth=".9" fill="none" />
    </g>
  );
}

/** Santa in his sleigh pulled by two reindeer (Rudolph leading). */
export function SleighArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="-30 -8 420 104" className={className}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <circle key={i} className="bulb" cx={4 - i * 13} cy={70 + (i % 2) * 7} r={3.4 - i * 0.4} fill="#ffe8a3" style={{ color: "#ffe8a3", animationDelay: `${i * 110}ms` }} />)}
      <path d="M150 42 L212 53 M268 53 L290 53" stroke="#7a4b2a" strokeWidth="2" />
      <path d="M113 38 Q190 28 268 47 M268 47 Q306 54 346 47" stroke="#7a4b2a" strokeWidth="1.6" fill="none" />
      <Reindeer x={240} />
      <Reindeer x={318} lead />
      <path d="M22 44 Q14 12 44 12 Q70 14 62 46 Z" fill="#8a5a33" />
      <rect x="30" y="20" width="14" height="12" rx="2" fill="#2f8f4e" /><rect x="36" y="20" width="2.5" height="12" fill="#f2c14e" />
      <rect x="46" y="14" width="12" height="14" rx="2" fill="#3a7bd5" /><rect x="51" y="14" width="2.5" height="14" fill="#fff" />
      <path d="M72 50 Q68 26 90 24 Q108 26 106 50 Z" fill="#d42020" />
      <rect x="72" y="40" width="34" height="5" fill="#2b1a14" /><rect x="86" y="39.5" width="6" height="6" rx="1" fill="#f2c14e" />
      <path d="M100 32 Q110 34 112 38" stroke="#d42020" strokeWidth="6" strokeLinecap="round" fill="none" />
      <circle cx="113" cy="38" r="3.2" fill="#2b1a14" />
      <circle cx="90" cy="16" r="9" fill="#f5c9a5" />
      <path d="M80 17 Q82 34 90 34 Q98 34 100 17 Q96 22 90 22 Q84 22 80 17 Z" fill="#fff" />
      <circle cx="94" cy="14" r="1.2" fill="#2b1a14" /><circle cx="98" cy="18" r="2" fill="#f09a8a" />
      <path d="M80 11 Q86 -2 102 2 Q96 4 99 10 Z" fill="#d42020" /><rect x="79" y="9" width="22" height="4" rx="2" fill="#fff" /><circle cx="103" cy="3" r="3" fill="#fff" />
      <path d="M10 46 L132 46 Q142 46 144 36 L152 28 Q156 62 128 66 L28 66 Q10 66 10 46 Z" fill="#c8102e" stroke="#f2c14e" strokeWidth="2.5" />
      <path d="M24 56 Q60 50 120 56" stroke="#f2c14e" strokeWidth="1.5" fill="none" strokeDasharray="3 4" />
      <path d="M36 66 L36 80 M118 66 L118 80" stroke="#f2c14e" strokeWidth="3" />
      <path d="M14 80 L140 80 Q158 80 160 66" stroke="#f2c14e" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function ChristmasIntro() {
  return <>
    <div className="intro-moon absolute right-[8%] top-[8%] h-24 w-24 rounded-full bg-[#fff8dc] shadow-[0_0_60px_20px_rgba(255,248,220,.6)] sm:h-32 sm:w-32" />
    <div className="intro-sleigh absolute left-0 top-[52%] w-[min(560px,90vw)]"><div className="sleigh-bob"><SleighArt className="h-auto w-full drop-shadow-[0_10px_14px_rgba(0,0,0,.25)]" /></div></div>
    <svg className="absolute inset-x-0 bottom-0 h-[16vh] w-full" viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0 60 Q150 20 300 55 T600 50 T900 45 T1200 55 V120 H0 Z" fill="#fff" /><path d="M0 80 Q200 50 400 78 T800 72 T1200 80 V120 H0 Z" fill="#eef5ff" /></svg>
    {[6, 18, 80, 92].map((left, i) => <PineTree key={left} className="intro-rise absolute bottom-[6vh] h-[18vh] w-auto" style={{ left: `${left}%`, animationDelay: `${i * 90}ms` }} />)}
  </>;
}

export function PineTree({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 80 120" className={className} style={style}>
      <rect x="35" y="96" width="10" height="20" fill="#7a4b2a" />
      <path d="M40 4 L70 50 L54 50 L76 80 L56 80 L78 102 L2 102 L24 80 L4 80 L26 50 L10 50 Z" fill="#1f6b3a" />
      <path d="M40 4 L52 22 L40 20 L28 22 Z" fill="#fff" opacity=".85" /><path d="M14 99 L66 99" stroke="#fff" strokeWidth="4" opacity=".8" />
      <path d="M40 0 l3 7 7 .5 -5.5 4.5 2 7 -6.5 -4 -6.5 4 2 -7 -5.5 -4.5 7 -.5 z" fill="#f2c14e" />
      {[[30, 46, "#c8102e"], [50, 62, "#f2c14e"], [28, 76, "#3a7bd5"], [54, 88, "#c8102e"], [38, 90, "#f2c14e"]].map(([cx, cy, c]) => <circle key={`${cx}-${cy}`} cx={cx as number} cy={cy as number} r="3.2" fill={c as string} />)}
    </svg>
  );
}

/** Pine garland with baubles and twinkling lights, under the header. */
export function ChristmasGarland() {
  const needles = Array.from({ length: 16 }, (_, i) => i * 4);
  const baubles = [4, 16, 28, 40, 52, 64, 76, 88, 97];
  const colors = ["#c8102e", "#f2c14e", "#c8102e", "#3a7bd5", "#c8102e", "#f2c14e", "#c8102e", "#3a7bd5", "#c8102e"];
  return (
    <div aria-hidden="true" className="pointer-events-none relative h-16 overflow-hidden sm:h-20">
      <svg className="absolute inset-x-0 top-0 h-7 w-full">
        <defs>
          <pattern id="pine" width="64" height="28" patternUnits="userSpaceOnUse">
            <path d="M0 10 Q32 16 64 10" stroke="#174d29" strokeWidth="9" fill="none" />
            {needles.map((x) => { const y = 10 + Math.sin((x / 64) * Math.PI) * 3; return <g key={x}><line x1={x} y1={y} x2={x + 5} y2={y - 8} stroke={x % 8 ? "#2f7a45" : "#1f6b3a"} strokeWidth="2" strokeLinecap="round" /><line x1={x + 2} y1={y} x2={x + 7} y2={y + 9} stroke={x % 8 ? "#1f6b3a" : "#2f7a45"} strokeWidth="2" strokeLinecap="round" /></g>; })}
            <circle cx="20" cy="14" r="2.4" fill="#d42020" /><circle cx="24" cy="12" r="2" fill="#d42020" /><circle cx="50" cy="15" r="2.2" fill="#d42020" />
          </pattern>
        </defs>
        <rect width="100%" height="28" fill="url(#pine)" />
      </svg>
      {Array.from({ length: 24 }, (_, i) => <span key={i} className={`bulb absolute top-[9px] h-2 w-2 rounded-full ${i % 2 ? "max-sm:hidden" : ""}`} style={{ left: `${(i + 0.5) * (100 / 24)}%`, color: ["#ffe8a3", "#ff6b6b", "#7fd3ff", "#fff"][i % 4], backgroundColor: ["#ffe8a3", "#ff6b6b", "#7fd3ff", "#fff"][i % 4], animationDelay: `${(i * 173) % 1500}ms` }} />)}
      {baubles.map((left, i) => (
        <span key={left} className={`lantern-swing absolute top-5 ${i % 2 ? "max-sm:hidden" : ""}`} style={{ left: `${left}%`, animationDelay: `${i * 240}ms` }}>
          <svg width="22" height={i % 3 === 1 ? 50 : 38} viewBox={`0 0 22 ${i % 3 === 1 ? 50 : 38}`}>
            <line x1="11" y1="0" x2="11" y2={i % 3 === 1 ? 30 : 18} stroke="#c9a13b" strokeWidth="1" />
            <rect x="8" y={i % 3 === 1 ? 28 : 16} width="6" height="4" rx="1" fill="#d4a72c" />
            <circle cx="11" cy={i % 3 === 1 ? 40 : 28} r="9" fill={colors[i]} />
            <circle cx="8" cy={i % 3 === 1 ? 37 : 25} r="2.6" fill="#fff" opacity=".5" />
          </svg>
        </span>
      ))}
    </div>
  );
}

// ---------- Pongal ----------

/** A decorated Kangayam bullock: painted horns, forehead ornament, jhool, marigold garland and bell. */
export function BullockArt({ className = "" }: { className?: string }) {
  const coat = "#f4f1ea", line = "#d6cdbd", far = "#ddd6c9";
  const leg = (cls: string, d: string, hoofX: number, color: string, w: number) => (
    <g className={cls}><path d={d} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" /><rect x={hoofX} y="143" width="11" height="6" rx="2" fill="#3b2a1e" /><circle cx={hoofX + 5.5} cy="134" r="2.6" fill="#d9a520" /></g>
  );
  const garland = [[162, 62], [163, 70], [165, 78], [168, 85], [172, 91], [177, 95], [182, 92], [185, 86], [187, 79]];
  return (
    <svg viewBox="20 0 210 160" className={className}>
      {leg("trot-b", "M60 102 L57 126 L58 145", 53, far, 9)}
      {leg("trot-a", "M156 102 L160 126 L159 145", 154, far, 9)}
      <g className="tail-swish"><path d="M38 70 C28 86 27 104 31 120" stroke="#e6dfd2" strokeWidth="3.5" fill="none" strokeLinecap="round" /><path d="M31 117 C24 124 28 135 32 135 C37 133 37 122 31 117 Z" fill="#3b2a1e" /></g>
      <path d="M38 76 C36 58 48 50 66 50 L132 50 C140 36 158 34 166 46 C176 50 182 62 180 80 C178 96 168 108 150 108 L64 108 C46 108 38 96 38 76 Z" fill={coat} stroke={line} strokeWidth="1.5" />
      <path d="M136 50 C143 41 155 39 162 46" stroke={line} strokeWidth="1.5" fill="none" />
      <path d="M166 90 C169 106 164 120 154 118 C156 110 157 100 158 90 Z" fill="#ebe6dc" />
      {/* jhool */}
      <path d="M68 50 L130 50 C132 66 130 82 126 96 L72 96 C68 82 66 66 68 50 Z" fill="#c8102e" />
      <path d="M72 96 L126 96" stroke="#f5b800" strokeWidth="5" />
      <path d="M74 58 L126 58" stroke="#f5b800" strokeWidth="2" strokeDasharray="2 4" />
      <circle cx="99" cy="76" r="10" fill="none" stroke="#f5b800" strokeWidth="2" /><circle cx="99" cy="76" r="4.5" fill="#2f8f4e" />
      {[78, 88, 110, 120].map((x) => <circle key={x} cx={x} cy={76} r="2.5" fill="#f5b800" />)}
      {[74, 82, 90, 98, 106, 114, 122].map((x, i) => <g key={x}><line x1={x} y1="98" x2={x} y2="106" stroke="#f5b800" strokeWidth="2" /><circle cx={x} cy="107" r="2.2" fill={i % 2 ? "#1f6fd1" : "#2f8f4e"} /></g>)}
      {leg("trot-a", "M76 102 L73 126 L74 145", 69, coat, 10)}
      {leg("trot-b", "M146 102 L151 126 L150 145", 145, coat, 10)}
      {/* head */}
      <g className="cow-nod">
        <path d="M178 50 C172 36 174 22 186 11" stroke="#1f6fd1" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M178 50 C172 36 174 22 186 11" stroke="#e0261b" strokeWidth="7" fill="none" strokeDasharray="6 6" strokeLinecap="round" />
        <path d="M190 49 C192 35 199 25 211 19" stroke="#1f6fd1" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M190 49 C192 35 199 25 211 19" stroke="#f5b800" strokeWidth="7" fill="none" strokeDasharray="6 6" strokeLinecap="round" />
        <circle cx="186" cy="10" r="4.2" fill="#f5b800" stroke="#b8860b" /><circle cx="211" cy="18" r="4.2" fill="#f5b800" stroke="#b8860b" />
        <path d="M176 57 C166 59 160 65 164 67 C170 67 176 63 180 59 Z" fill="#e6dfd2" />
        <path d="M174 51 C182 43 196 43 204 51 C210 59 216 71 218 81 C220 91 212 95 204 91 C194 87 184 75 176 65 C172 60 172 55 174 51 Z" fill={coat} stroke={line} strokeWidth="1.5" />
        <path d="M206 81 C210 77 218 79 219 85 C220 91 212 94 206 91 Z" fill="#5f5650" />
        <circle cx="214" cy="86" r="1.4" fill="#2b1a14" />
        <ellipse cx="193" cy="61" rx="3.2" ry="2.3" fill="#2b1a14" /><path d="M189 60 Q193 57.5 197.5 60.5" stroke="#2b1a14" strokeWidth="1" fill="none" /><circle cx="194" cy="60.3" r=".8" fill="#fff" />
        <path d="M185 48 L199 48 L192 63 Z" fill="#f5b800" stroke="#b8860b" strokeWidth=".8" /><circle cx="192" cy="53" r="2.4" fill="#c8102e" />
      </g>
      {garland.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="4.4" fill={i % 2 ? "#ff6a00" : "#f5a623"} stroke="#e05a00" strokeWidth=".6" />)}
      <circle cx="177" cy="103" r="6" fill="#d9a520" stroke="#a87b10" strokeWidth="1.2" /><line x1="177" y1="105" x2="177" y2="110" stroke="#7a5a10" strokeWidth="1.6" />
    </svg>
  );
}

/** A purple sugarcane stalk (karumbu) with leaves. */
export function Sugarcane({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 60 220" className={className} style={style}>
      <defs><linearGradient id="cane" x1="0" x2="1"><stop offset="0" stopColor="#4a2340" /><stop offset=".45" stopColor="#7a3e66" /><stop offset="1" stopColor="#3f1d36" /></linearGradient></defs>
      <rect x="25" y="46" width="10" height="174" rx="4" fill="url(#cane)" />
      {[66, 90, 114, 138, 162, 186, 210].map((y) => <g key={y}><ellipse cx="30" cy={y} rx="6.4" ry="2.2" fill="#b58aa3" /><path d={`M25 ${y + 3} L35 ${y + 3}`} stroke="#2e1427" strokeWidth=".8" /></g>)}
      <g fill="none" strokeLinecap="round">
        <path d="M30 50 C26 30 14 18 2 16" stroke="#4f8f2a" strokeWidth="5" />
        <path d="M30 50 C34 28 46 14 58 12" stroke="#6fae3a" strokeWidth="5" />
        <path d="M30 48 C30 30 28 14 24 0" stroke="#3f7f22" strokeWidth="4.5" />
        <path d="M30 56 C20 46 8 46 0 52" stroke="#6fae3a" strokeWidth="4" />
        <path d="M30 56 C42 46 52 48 60 56" stroke="#4f8f2a" strokeWidth="4" />
      </g>
    </svg>
  );
}

/** The Pongal pot boiling over, with a turmeric plant tied round its neck. */
export function PongalPot({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 120 140" className={className} style={style}>
      <g className="steam" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".8">
        <path d="M44 34 C38 24 50 18 44 6" /><path d="M62 30 C56 18 70 12 62 0" style={{ animationDelay: ".5s" }} /><path d="M80 34 C74 24 86 18 80 6" style={{ animationDelay: "1s" }} />
      </g>
      <path d="M22 72 C10 100 30 134 60 134 C90 134 110 100 98 72 Z" fill="#b5562a" />
      <path d="M30 74 C24 96 38 124 60 126" stroke="#d9773f" strokeWidth="5" fill="none" opacity=".6" />
      <path d="M34 98 L86 98" stroke="#fff" strokeWidth="2" strokeDasharray="1 5" strokeLinecap="round" />
      {[44, 60, 76].map((x) => <path key={x} d={`M${x} 104 l6 6 -6 6 -6 -6 z`} fill="none" stroke="#fff" strokeWidth="1.6" />)}
      <ellipse cx="60" cy="66" rx="36" ry="9" fill="#9c4520" />
      <path d="M26 64 C22 48 38 42 46 50 C48 38 66 36 72 46 C78 38 96 44 94 58 C100 62 98 72 92 70 C92 80 86 82 84 74 C80 84 72 82 72 74 C66 80 58 80 58 72 C52 80 44 80 44 72 C38 82 30 80 32 72 C24 74 22 68 26 64 Z" fill="#fffaf0" />
      <circle className="boil" cx="50" cy="52" r="5" fill="#fff" /><circle className="boil" cx="68" cy="48" r="6" fill="#fff" style={{ animationDelay: ".4s" }} /><circle className="boil" cx="82" cy="54" r="4" fill="#fff" style={{ animationDelay: ".8s" }} />
      <path d="M24 74 C40 82 80 82 96 74" stroke="#2f8f4e" strokeWidth="4" fill="none" />
      <path d="M30 76 C24 66 18 60 10 60 C16 68 22 74 30 78 Z M88 76 C96 66 102 60 110 60 C104 68 98 74 88 78 Z" fill="#4f8f2a" />
      <ellipse cx="60" cy="82" rx="6" ry="4" fill="#e0a800" />
    </svg>
  );
}

function PongalIntro() {
  return <>
    <div className="intro-sun absolute left-1/2 top-[30%] h-40 w-40 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#ffd45c_0%,#ffb020_45%,transparent_70%)] sm:h-56 sm:w-56" />
    <div className="intro-ground absolute inset-x-0 bottom-0 h-[24vh] min-h-[140px]" />
    <Sugarcane className="intro-rise absolute bottom-[10vh] left-[2%] h-[38vh] w-auto -rotate-6" />
    <Sugarcane className="intro-rise absolute bottom-[10vh] left-[7%] h-[34vh] w-auto rotate-6" style={{ animationDelay: "120ms" }} />
    <Sugarcane className="intro-rise absolute bottom-[10vh] right-[7%] h-[34vh] w-auto -rotate-6" style={{ animationDelay: "200ms" }} />
    <Sugarcane className="intro-rise absolute bottom-[10vh] right-[2%] h-[38vh] w-auto rotate-6" style={{ animationDelay: "80ms" }} />
    <PongalPot className="intro-rise absolute bottom-[8vh] left-1/2 h-[18vh] w-auto -translate-x-1/2" style={{ animationDelay: "250ms" }} />
    <div className="intro-trot absolute bottom-[6vh] left-0 w-[clamp(180px,34vw,340px)]"><BullockArt className="bull-bob h-auto w-full drop-shadow-[0_10px_8px_rgba(0,0,0,.2)]" /></div>
  </>;
}

/** Mango-leaf thoranam with marigolds, plus crossed sugarcane and a Pongal pot at each end. */
export function PongalThoranam() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative h-20 overflow-hidden sm:h-28">
      <svg className="absolute inset-x-0 top-0 h-14 w-full">
        <defs>
          <pattern id="thoranam" width="52" height="56" patternUnits="userSpaceOnUse">
            <path d="M0 5 L52 5" stroke="#8a6a3a" strokeWidth="2" />
            <path d="M14 5 C5 18 7 36 14 50 C21 36 23 18 14 5 Z" fill="#3f8f2a" /><path d="M14 8 L14 46" stroke="#a6d77a" strokeWidth="1.2" />
            <circle cx="38" cy="12" r="7.5" fill="#f5a623" /><circle cx="38" cy="12" r="4.5" fill="#ff6a00" /><circle cx="38" cy="22" r="5" fill="#ffcf3f" />
          </pattern>
        </defs>
        <rect width="100%" height="56" fill="url(#thoranam)" />
      </svg>
      <div className="absolute bottom-0 left-1 flex items-end sm:left-6"><Sugarcane className="h-20 w-auto -rotate-12 sm:h-28" /><PongalPot className="-ml-3 h-10 w-auto sm:h-14" /><Sugarcane className="-ml-3 h-20 w-auto rotate-12 max-sm:hidden sm:h-28" /></div>
      <div className="absolute bottom-0 right-1 flex items-end sm:right-6"><Sugarcane className="h-20 w-auto -rotate-12 max-sm:hidden sm:h-28" /><PongalPot className="-mr-3 h-10 w-auto sm:h-14" /><Sugarcane className="-ml-0 h-20 w-auto rotate-12 sm:h-28" /></div>
    </div>
  );
}

// ---------- Other festivals ----------

function HoliIntro({ colors }: { colors: string[] }) {
  const spots = [[12, 30], [35, 60], [60, 25], [85, 55], [25, 80], [70, 82], [50, 45], [90, 20]];
  return <>{spots.map(([x, y], i) => <span key={i} className="gulal absolute rounded-full" style={{ left: `${x}%`, top: `${y}%`, width: "48vmin", height: "48vmin", animationDelay: `${i * 220}ms`, background: `radial-gradient(circle, ${colors[i % colors.length]} 0%, ${colors[i % colors.length]}aa 35%, transparent 70%)` }} />)}</>;
}

function EidIntro() {
  return <>
    <svg viewBox="0 0 80 80" className="intro-rise absolute right-[10%] top-[10%] h-28 w-28 drop-shadow-[0_0_24px_rgba(242,193,78,.8)] sm:h-40 sm:w-40">
      <defs><mask id="crescent-intro"><rect width="80" height="80" fill="#fff" /><circle cx="50" cy="32" r="26" fill="#000" /></mask></defs>
      <circle cx="38" cy="40" r="30" fill="#f2c14e" mask="url(#crescent-intro)" />
    </svg>
    {[10, 26, 42, 58, 74, 90].map((left, i) => <span key={left} className="intro-float absolute bottom-0 h-16 w-10 rounded-[40%] bg-[radial-gradient(circle_at_50%_40%,#fff3b0,#f2c14e_55%,#c9a13b)] shadow-[0_0_30px_rgba(242,193,78,.8)]" style={{ left: `${left}%`, animationDelay: `${i * 180}ms` }} />)}
  </>;
}

function HeartsIntro() {
  return <>{Array.from({ length: 18 }, (_, i) => <span key={i} className="intro-float absolute bottom-0 text-4xl sm:text-5xl" style={{ left: `${(i * 37) % 96}%`, animationDelay: `${(i * 140) % 1400}ms` }}>{["💖", "💝", "❤️", "💕"][i % 4]}</span>)}</>;
}

function BalloonIntro() {
  return <>{Array.from({ length: 14 }, (_, i) => <span key={i} className="intro-float absolute bottom-0 text-4xl sm:text-6xl" style={{ left: `${(i * 41) % 94}%`, animationDelay: `${(i * 120) % 1200}ms` }}>{["🎈", "🎉", "🎈", "✨"][i % 4]}</span>)}</>;
}

// ---------- Seasons ----------

function Blossom({ size, color, className = "", style }: { size: number; color: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" className={className} style={style}>
      {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-5.4" rx="3.9" ry="5.6" fill={color} transform={`rotate(${r})`} />)}
      <circle r="2.4" fill="#fff4c2" /><circle r="1" fill="#e9a23b" />
    </svg>
  );
}

export function Butterfly({ color, className = "", style }: { color: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="-20 -16 40 32" className={className} style={style}>
      <g className="wing-l"><path d="M-1 -2 C-8 -16 -20 -12 -17 -3 C-15 3 -6 2 -1 0 Z" fill={color} /><path d="M-1 1 C-7 3 -14 8 -10 13 C-6 15 -2 8 -1 2 Z" fill={color} opacity=".85" /></g>
      <g className="wing-r"><path d="M1 -2 C8 -16 20 -12 17 -3 C15 3 6 2 1 0 Z" fill={color} /><path d="M1 1 C7 3 14 8 10 13 C6 15 2 8 1 2 Z" fill={color} opacity=".85" /></g>
      <ellipse rx="1.4" ry="7" fill="#3b2a1e" /><path d="M0 -7 C-2 -11 -4 -12 -5 -13 M0 -7 C2 -11 4 -12 5 -13" stroke="#3b2a1e" strokeWidth=".8" fill="none" />
    </svg>
  );
}

function SpringIntro() {
  const pinks = ["#FFB7CE", "#FF8FB1", "#FFD1E0", "#F7A8C4", "#FFFFFF"];
  return <>
    {Array.from({ length: 16 }, (_, i) => <Blossom key={i} size={18 + (i % 4) * 8} color={pinks[i % pinks.length]} className="intro-drift absolute" style={{ left: `${(i * 23) % 100}%`, top: `${(i * 37) % 70}%`, animationDelay: `${(i * 110) % 1200}ms` }} />)}
    {[["#f7a8c4", "62%", 0], ["#9cd3f0", "46%", 350], ["#ffd166", "72%", 700]].map(([c, top, d]) => (
      <div key={String(c)} className="intro-flutter absolute left-0 w-14 sm:w-20" style={{ top: String(top), animationDelay: `${d}ms` }}><Butterfly color={String(c)} className="h-auto w-full drop-shadow" /></div>
    ))}
  </>;
}

function SummerIntro() {
  return <>
    <div className="intro-sun absolute left-1/2 top-[44%] h-44 w-44 -translate-x-1/2 -translate-y-1/2 sm:h-64 sm:w-64">
      <svg viewBox="-100 -100 200 200" className="sun-rays absolute inset-0 h-full w-full">{Array.from({ length: 16 }, (_, i) => <path key={i} d="M-6 -62 L0 -96 L6 -62 Z" fill="#ffd23f" opacity=".75" transform={`rotate(${i * 22.5})`} />)}</svg>
      <div className="absolute inset-[22%] rounded-full bg-[radial-gradient(circle_at_40%_35%,#fff6c2,#ffd23f_55%,#f5a623)] shadow-[0_0_80px_30px_rgba(255,210,63,.55)]" />
    </div>
    {Array.from({ length: 12 }, (_, i) => <span key={i} className="intro-float absolute bottom-0 h-2 w-2 rounded-full bg-white shadow-[0_0_12px_4px_rgba(255,230,140,.9)]" style={{ left: `${(i * 31) % 96}%`, animationDelay: `${(i * 150) % 1500}ms` }} />)}
  </>;
}

export function MapleLeaf({ color, className = "", style }: { color: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="-10 -11 20 22" className={className} style={style}>
      <path d="M0 -10 L2.8 -4.2 L8.5 -6 L5.5 -0.8 L9.5 2 L3 3 L1.2 8.5 L0 4.5 L-1.2 8.5 L-3 3 L-9.5 2 L-5.5 -0.8 L-8.5 -6 L-2.8 -4.2 Z" fill={color} />
      <path d="M0 -8 L0 10" stroke="rgba(80,35,10,.45)" strokeWidth=".7" />
    </svg>
  );
}

function AutumnIntro({ colors }: { colors: string[] }) {
  return <>{Array.from({ length: 22 }, (_, i) => (
    <div key={i} className="intro-gust absolute left-0" style={{ top: `${8 + ((i * 41) % 80)}%`, animationDelay: `${(i * 90) % 1300}ms`, width: 26 + (i % 4) * 10 }}>
      <MapleLeaf color={colors[i % colors.length]} className="leaf-tumble h-auto w-full" style={{ animationDelay: `${i * 70}ms` }} />
    </div>
  ))}</>;
}

export function Snowflake({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="-12 -12 24 24" className={className} style={style}>
      <g stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none">
        {[0, 60, 120].map((r) => <path key={r} d="M0 -11 L0 11 M-3 -8 L0 -5 L3 -8 M-3 8 L0 5 L3 8" transform={`rotate(${r})`} />)}
      </g>
    </svg>
  );
}

function WinterIntro() {
  return <>
    <div className="intro-frost absolute inset-0" />
    {Array.from({ length: 20 }, (_, i) => <Snowflake key={i} className="intro-snowfall absolute drop-shadow-[0_0_6px_rgba(160,200,255,.9)]" style={{ left: `${(i * 29) % 98}%`, width: 16 + (i % 5) * 8, animationDelay: `${(i * 120) % 1600}ms` }} />)}
  </>;
}

/** Garland strips for the four seasons: blossom vine, sunny bunting, leaf string and icicles. */
export function SeasonGarland({ theme }: { theme: FestiveTheme }) {
  const strip = "pointer-events-none relative h-14 overflow-hidden sm:h-16";
  if (theme.id === "spring") return (
    <div aria-hidden="true" className={strip}>
      <svg className="absolute inset-x-0 top-0 h-12 w-full"><defs><pattern id="spring-vine" width="90" height="48" patternUnits="userSpaceOnUse">
        <path d="M0 10 Q22 20 45 10 T90 10" stroke="#6a9a3a" strokeWidth="2" fill="none" />
        <path d="M18 14 C14 22 18 26 22 22 C24 18 22 14 18 14 Z M66 12 C64 4 70 2 72 6 C73 10 70 12 66 12 Z" fill="#8cc152" />
        {[[30, 15, "#ffb7ce"], [56, 9, "#ff8fb1"], [80, 14, "#ffd1e0"]].map(([x, y, c]) => <g key={String(x)} transform={`translate(${x} ${y})`}>{[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-3.6" rx="2.6" ry="3.8" fill={String(c)} transform={`rotate(${r})`} />)}<circle r="1.6" fill="#fff4c2" /></g>)}
        <path d="M45 10 L45 30" stroke="#6a9a3a" strokeWidth="1" /><g transform="translate(45 33)">{[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-4" rx="3" ry="4.2" fill="#f7a8c4" transform={`rotate(${r})`} />)}<circle r="1.8" fill="#fff4c2" /></g>
      </pattern></defs><rect width="100%" height="48" fill="url(#spring-vine)" /></svg>
    </div>
  );
  if (theme.id === "summer") return (
    <div aria-hidden="true" className={strip}>
      <svg className="absolute inset-x-0 top-0 h-12 w-full"><defs><pattern id="summer-bunting" width="120" height="48" patternUnits="userSpaceOnUse">
        <path d="M0 6 Q60 16 120 6" stroke="#7a6a5a" strokeWidth="1.2" fill="none" />
        {[["#12a4b3", 4], ["#ffd23f", 34], ["#ff7a59", 64], ["#ffffff", 94]].map(([c, x], i) => { const y = 6 + Math.sin(((Number(x) + 11) / 120) * Math.PI) * 10; return <path key={i} d={`M${x} ${y - 1} L${Number(x) + 22} ${y - 1} L${Number(x) + 11} ${y + 22} Z`} fill={String(c)} stroke="rgba(0,0,0,.08)" />; })}
      </pattern></defs><rect width="100%" height="48" fill="url(#summer-bunting)" /></svg>
    </div>
  );
  if (theme.id === "autumn") return (
    <div aria-hidden="true" className={strip}>
      <svg className="absolute inset-x-0 top-0 h-3 w-full"><path d="M0 4 L10000 4" stroke="#8a6a4a" strokeWidth="1.5" /></svg>
      {Array.from({ length: 20 }, (_, i) => <span key={i} className={`lantern-swing absolute top-1 ${i % 2 ? "max-sm:hidden" : ""}`} style={{ left: `${(i + 0.5) * 5}%`, animationDelay: `${(i * 210) % 1800}ms` }}><MapleLeaf color={theme.colors[i % theme.colors.length]} className="h-7 w-7 sm:h-8 sm:w-8" /></span>)}
    </div>
  );
  if (theme.id === "winter") return (
    <div aria-hidden="true" className={strip}>
      <svg className="absolute inset-x-0 top-0 h-12 w-full"><defs><pattern id="icicles" width="64" height="48" patternUnits="userSpaceOnUse">
        <rect width="64" height="5" fill="#eaf4ff" />
        {[[2, 18], [11, 30], [19, 14], [28, 24], [37, 34], [46, 16], [55, 26]].map(([x, h]) => <path key={x} d={`M${x} 4 L${x + 7} 4 L${x + 3.5} ${h} Z`} fill="#dcecff" stroke="#b9d4f0" strokeWidth=".6" />)}
      </pattern></defs><rect width="100%" height="48" fill="url(#icicles)" /></svg>
      {[8, 30, 52, 74, 94].map((left, i) => <span key={left} className={`lantern-swing absolute top-6 ${i % 2 ? "max-sm:hidden" : ""}`} style={{ left: `${left}%`, animationDelay: `${i * 300}ms` }}><Snowflake className="h-6 w-6 drop-shadow-[0_0_4px_rgba(90,140,200,.8)] [&_g]:stroke-[#8fb6e0]" /></span>)}
    </div>
  );
  return null;
}
