"use client";

import type { CSSProperties, ReactNode } from "react";
import type { FestiveTheme } from "@/lib/festive-themes";
import { Diya } from "./festive";
import { BullockArt, Butterfly, MapleLeaf, PineTree, PongalPot, SleighArt, Snowflake, Sugarcane } from "./festive-intro";
import { Fanous, Kandil } from "./festive-scenes";

/*
 * The themed banner under the header: an illustrated, gently animated scene for each festival and
 * season with the greeting and a call to action. Positions are fixed (no randomness) so server and
 * browser render the same markup. Motion uses the fb-* classes in globals.css and stops when the
 * visitor turns effects off.
 */

const spread = (n: number, seed: number) => Array.from({ length: n }, (_, i) => ({ i, left: ((i * 37 + seed * 13) % 100), top: ((i * 53 + seed * 29) % 100), delay: (i * 0.73 + seed) % 6, dur: 5 + ((i * 7 + seed) % 6) }));

function Stars({ n = 26, color = "#fff", seed = 1 }: { n?: number; color?: string; seed?: number }) {
  return <>{spread(n, seed).map((s) => <span key={s.i} className="fb-twinkle absolute rounded-full" style={{ left: `${s.left}%`, top: `${s.top * 0.7}%`, width: s.i % 4 ? 2 : 3, height: s.i % 4 ? 2 : 3, background: color, boxShadow: `0 0 6px ${color}`, animationDelay: `${s.delay}s`, animationDuration: `${2 + (s.i % 3)}s` }} />)}</>;
}

/** Things drifting down through the banner (snow, petals, leaves, confetti). */
function Falling({ n, seed = 1, render }: { n: number; seed?: number; render: (i: number) => ReactNode }) {
  return <>{spread(n, seed).map((s) => <span key={s.i} className={`fb-fall absolute -top-6 ${s.i % 3 === 2 ? "max-sm:hidden" : ""}`} style={{ left: `${s.left}%`, animationDelay: `-${s.delay}s`, animationDuration: `${s.dur + 3}s` }}>{render(s.i)}</span>)}</>;
}

/** Things floating up through the banner (hearts, sparks, bubbles). */
function Rising({ n, seed = 1, render }: { n: number; seed?: number; render: (i: number) => ReactNode }) {
  return <>{spread(n, seed).map((s) => <span key={s.i} className={`fb-rise absolute -bottom-8 ${s.i % 3 === 2 ? "max-sm:hidden" : ""}`} style={{ left: `${s.left}%`, animationDelay: `-${s.delay}s`, animationDuration: `${s.dur + 2}s` }}>{render(s.i)}</span>)}</>;
}

function Hills({ back, front, className = "" }: { back: string; front: string; className?: string }) {
  return (
    <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className={`absolute inset-x-0 bottom-0 h-10 w-full sm:h-12 ${className}`}>
      <path d="M0 30 Q150 4 320 26 T660 22 T980 18 T1200 28 V60 H0 Z" fill={back} />
      <path d="M0 44 Q200 24 420 42 T840 38 T1200 44 V60 H0 Z" fill={front} />
    </svg>
  );
}

function Mandala({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="-50 -50 100 100" className={className} style={style}>
      {Array.from({ length: 16 }, (_, i) => <ellipse key={`o${i}`} cx="0" cy="-36" rx="5" ry="11" fill={i % 2 ? "#ff8a3d" : "#ffd45c"} transform={`rotate(${i * 22.5})`} />)}
      {Array.from({ length: 12 }, (_, i) => <ellipse key={`m${i}`} cx="0" cy="-22" rx="5" ry="9" fill={i % 2 ? "#ec2427" : "#ff4d6d"} transform={`rotate(${i * 30 + 15})`} />)}
      {Array.from({ length: 8 }, (_, i) => <ellipse key={`i${i}`} cx="0" cy="-10" rx="3.5" ry="6" fill="#fff3b0" transform={`rotate(${i * 45})`} />)}
      <circle r="5" fill="#2f8f4e" /><circle r="2.2" fill="#ffd45c" />
    </svg>
  );
}

function Burst({ color, style }: { color: string; style: CSSProperties }) {
  return (
    <span className="fb-burst absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2" style={style}>
      {Array.from({ length: 12 }, (_, i) => <span key={i} className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}`, transform: `rotate(${i * 30}deg) translateY(-40px)` }} />)}
    </span>
  );
}

function Branch({ flip, children }: { flip?: boolean; children: ReactNode }) {
  // Outer box sways from its top corner; the inner box mirrors the art for the right-hand side.
  return <div className={`fb-sway absolute -top-2 h-24 w-48 sm:h-32 sm:w-72 ${flip ? "right-0" : "left-0"}`} style={{ transformOrigin: flip ? "100% 0" : "0 0" }}><div className={`relative h-full w-full ${flip ? "-scale-x-100" : ""}`}>{children}</div></div>;
}

// ---------- Scenes ----------

function DiwaliScene() {
  return <>
    <Mandala className="fb-spin absolute -left-16 top-1/2 h-48 w-48 -translate-y-1/2 opacity-80 sm:h-56 sm:w-56" />
    <Mandala className="fb-spin-rev absolute -right-16 top-1/2 h-48 w-48 -translate-y-1/2 opacity-80 sm:h-56 sm:w-56" />
    <Stars n={22} color="#ffd45c" />
    {[18, 30, 70, 82].map((l, i) => <div key={l} className={`lantern-swing absolute top-0 h-16 sm:h-24 ${i % 3 ? "max-sm:hidden" : ""}`} style={{ left: `${l}%`, animationDelay: `${i * 400}ms` }}><Kandil /></div>)}
    <div className="absolute inset-x-0 bottom-0 flex justify-around px-24 sm:px-40">{[0, 1, 2, 3, 4, 5, 6].map((i) => <span key={i} className={i % 2 ? "max-sm:hidden" : ""}><Diya size={30} delay={i * 180} /></span>)}</div>
  </>;
}

function ChristmasScene() {
  return <>
    <span className="absolute right-[16%] top-3 h-10 w-10 rounded-full bg-[#fff8dc] shadow-[0_0_30px_10px_rgba(255,248,220,.55)] sm:h-14 sm:w-14" />
    <Stars n={30} />
    <div className="fb-cross absolute top-2 left-0 w-40 sm:w-56"><SleighArt className="h-auto w-full" /></div>
    <Hills back="#dfeaf7" front="#ffffff" />
    {[2, 9, 86, 93].map((l, i) => <PineTree key={l} className={`absolute bottom-3 h-16 w-auto sm:h-24 ${i === 1 || i === 2 ? "max-sm:hidden" : ""}`} style={{ left: `${l}%` }} />)}
    <Falling n={26} render={(i) => <span className="block rounded-full bg-white" style={{ width: 2 + (i % 3), height: 2 + (i % 3), opacity: 0.9 }} />} />
  </>;
}

function NewYearScene() {
  return <>
    <Stars n={34} color="#ffe58a" seed={3} />
    {[["#ffd45c", "14%", "38%", 0], ["#ff8ad8", "84%", "34%", 1.2], ["#7fd3ff", "28%", "62%", 2.1], ["#ffd45c", "72%", "60%", 3], ["#c9a2ff", "50%", "26%", 3.9]].map(([c, l, t, d], i) => <Burst key={i} color={String(c)} style={{ left: String(l), top: String(t), animationDelay: `${d}s` }} />)}
    <Falling n={22} seed={2} render={(i) => <span className="block" style={{ width: 6, height: 3, background: ["#ffd45c", "#ff8ad8", "#7fd3ff", "#fff"][i % 4] }} />} />
  </>;
}

function PongalScene() {
  return <>
    <span className="fb-pulse absolute left-1/2 top-full h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#fff3b0_0%,#ffd45c_40%,transparent_70%)] sm:h-72 sm:w-72" />
    <div className="absolute inset-x-0 top-0 flex justify-between px-2">{Array.from({ length: 30 }, (_, i) => <span key={i} className={`fb-bob block h-3 w-3 rounded-full ${i % 2 ? "bg-[#ff6a00] max-sm:hidden" : "bg-[#ffcf3f]"}`} style={{ animationDelay: `${(i % 6) * 0.3}s` }} />)}</div>
    <div className="absolute inset-x-0 bottom-0 h-5 bg-[radial-gradient(circle,rgba(255,255,255,.7)_1.4px,transparent_2px)] bg-[length:16px_16px] bg-[#a8622a]" />
    <Sugarcane className="absolute bottom-0 left-1 h-24 w-auto -rotate-6 sm:left-6 sm:h-32" />
    <Sugarcane className="absolute bottom-0 left-8 h-20 w-auto rotate-6 max-sm:hidden sm:left-16 sm:h-28" />
    <Sugarcane className="absolute bottom-0 right-8 h-20 w-auto -rotate-6 max-sm:hidden sm:right-16 sm:h-28" />
    <Sugarcane className="absolute bottom-0 right-1 h-24 w-auto rotate-6 sm:right-6 sm:h-32" />
    <PongalPot className="absolute bottom-2 left-[18%] h-12 w-auto max-sm:hidden sm:h-16" />
    <PongalPot className="absolute bottom-2 right-[18%] h-12 w-auto max-sm:hidden sm:h-16" />
    <div className="fb-walk absolute bottom-2 left-0 w-24 sm:w-32"><BullockArt className="bull-bob h-auto w-full" /></div>
  </>;
}

function HoliScene() {
  const clouds: Array<[string, string, string, number]> = [["#ff3d7f", "8%", "20%", 0], ["#ffd23f", "30%", "70%", 2], ["#3ddc97", "55%", "15%", 4], ["#3a86ff", "78%", "65%", 1], ["#9b5de5", "92%", "25%", 3]];
  return <>
    {clouds.map(([c, l, t, d], i) => <span key={i} className="fb-blob absolute h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl sm:h-56 sm:w-56" style={{ left: l, top: t, background: c, opacity: 0.55, animationDelay: `${d}s` }} />)}
    <Rising n={18} seed={4} render={(i) => <span className="block rounded-full" style={{ width: 6 + (i % 4) * 3, height: 6 + (i % 4) * 3, background: ["#ff3d7f", "#ffd23f", "#3ddc97", "#3a86ff", "#9b5de5"][i % 5], opacity: 0.85 }} />} />
  </>;
}

function EidScene() {
  return <>
    <Stars n={30} color="#ffe8a3" seed={5} />
    <svg viewBox="0 0 80 80" className="fb-glow absolute right-[16%] top-2 h-14 w-14 sm:h-20 sm:w-20">
      <defs><mask id="fb-crescent"><rect width="80" height="80" fill="#fff" /><circle cx="50" cy="32" r="26" fill="#000" /></mask></defs>
      <circle cx="38" cy="40" r="30" fill="#f2c14e" mask="url(#fb-crescent)" />
    </svg>
    <svg viewBox="0 0 1200 70" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-12 w-full sm:h-16">
      <path fill="#042a23" d="M0 70 V52 H80 V40 H96 V52 H160 Q190 22 220 52 H260 V30 L266 18 L272 30 V52 H330 V46 H420 Q470 6 520 46 H540 V24 L546 10 L552 24 V46 H600 Q640 18 680 46 H760 V36 H800 V52 H880 Q920 16 960 52 H1000 V28 L1006 14 L1012 28 V52 H1080 V44 H1200 V70 Z" />
    </svg>
    {[16, 30, 70, 84].map((l, i) => <div key={l} className={`lantern-swing absolute top-0 h-16 sm:h-24 ${i % 3 ? "max-sm:hidden" : ""}`} style={{ left: `${l}%`, animationDelay: `${i * 350}ms` }}><Fanous /></div>)}
  </>;
}

function ValentineScene() {
  return <>
    {spread(10, 6).map((s) => <span key={s.i} className="fb-twinkle absolute rounded-full bg-white/20 blur-[2px]" style={{ left: `${s.left}%`, top: `${s.top}%`, width: 18 + (s.i % 3) * 10, height: 18 + (s.i % 3) * 10, animationDelay: `${s.delay}s` }} />)}
    <Rising n={22} seed={7} render={(i) => <span className="block leading-none" style={{ fontSize: 12 + (i % 4) * 6, color: ["#ffb3c1", "#fff", "#ff8fa3", "#ffd1dc"][i % 4] }}>♥</span>} />
  </>;
}

function SpringScene() {
  const blossom = (x: number, y: number, s: number, c: string) => <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`}>{[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-5" rx="3.6" ry="5.2" fill={c} transform={`rotate(${r})`} />)}<circle r="2" fill="#fff4c2" /></g>;
  const branch = <svg viewBox="0 0 280 120" className="h-full w-full"><path d="M0 8 C60 20 110 18 160 40 C190 54 220 58 270 52 M110 24 C130 50 128 70 140 92 M190 50 C200 70 214 80 232 88" stroke="#6b4423" strokeWidth="4" fill="none" strokeLinecap="round" />{[[40, 16, 1.2, "#ffb7ce"], [80, 22, 1, "#ff8fb1"], [120, 30, 1.3, "#ffd1e0"], [160, 42, 1, "#ffb7ce"], [200, 54, 1.2, "#ff8fb1"], [250, 52, 1, "#ffd1e0"], [132, 70, 1.1, "#ffb7ce"], [140, 92, 0.9, "#ff8fb1"], [222, 84, 1, "#ffd1e0"], [60, 12, 0.8, "#fff"]].map(([x, y, s, c]) => blossom(Number(x), Number(y), Number(s), String(c)))}</svg>;
  return <>
    <Branch>{branch}</Branch>
    <Branch flip>{branch}</Branch>
    <Falling n={20} seed={8} render={(i) => <span className="block rounded-[60%_0_60%_0]" style={{ width: 8 + (i % 3) * 2, height: 6 + (i % 3) * 2, background: ["#ffb7ce", "#ff8fb1", "#fff", "#ffd1e0"][i % 4] }} />} />
    {[["#9cd3f0", "30%", 0], ["#ffd166", "62%", 6]].map(([c, t, d]) => <div key={String(c)} className="fb-flutter absolute left-0 w-8 sm:w-10" style={{ top: String(t), animationDelay: `${d}s` }}><Butterfly color={String(c)} className="h-auto w-full" /></div>)}
  </>;
}

function SummerScene() {
  return <>
    <div className="absolute left-[6%] top-1/2 h-28 w-28 -translate-y-1/2 sm:h-36 sm:w-36">
      <svg viewBox="-100 -100 200 200" className="fb-spin absolute inset-0 h-full w-full">{Array.from({ length: 14 }, (_, i) => <path key={i} d="M-7 -60 L0 -96 L7 -60 Z" fill="#ffe58a" opacity=".85" transform={`rotate(${i * 25.7})`} />)}</svg>
      <span className="absolute inset-[24%] rounded-full bg-[radial-gradient(circle_at_40%_35%,#fff6c2,#ffd23f_55%,#f5a623)] shadow-[0_0_40px_12px_rgba(255,210,63,.6)]" />
    </div>
    <svg viewBox="0 0 400 30" className="fb-gull absolute right-[20%] top-4 h-4 w-24 max-sm:hidden"><path d="M10 20 Q20 8 30 20 Q40 8 50 20 M120 14 Q128 4 136 14 Q144 4 152 14" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" /></svg>
    <div className="absolute inset-x-0 bottom-0 h-10 overflow-hidden sm:h-12">
      <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="fb-wave absolute bottom-2 h-full w-[200%]"><path d="M0 20 Q75 6 150 20 T300 20 T450 20 T600 20 T750 20 T900 20 T1050 20 T1200 20 V40 H0 Z" fill="rgba(255,255,255,.35)" /></svg>
      <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="fb-wave-slow absolute bottom-0 h-full w-[200%]"><path d="M0 24 Q100 12 200 24 T400 24 T600 24 T800 24 T1000 24 T1200 24 V40 H0 Z" fill="rgba(255,255,255,.55)" /></svg>
    </div>
    <Rising n={16} seed={9} render={(i) => <span className="block rounded-full bg-white" style={{ width: 3 + (i % 3), height: 3 + (i % 3), boxShadow: "0 0 8px 2px rgba(255,240,170,.9)" }} />} />
  </>;
}

function AutumnScene({ colors }: { colors: string[] }) {
  const branch = <svg viewBox="0 0 280 120" className="h-full w-full"><path d="M0 6 C70 14 120 20 170 38 C200 50 230 54 272 50 M100 18 C116 44 118 64 128 86" stroke="#4a2a14" strokeWidth="4.5" fill="none" strokeLinecap="round" /></svg>;
  return <>
    <Hills back="rgba(94,35,10,.45)" front="rgba(60,20,5,.55)" />
    <Branch>{branch}<div className="absolute inset-0">{[[16, 8], [34, 12], [52, 22], [70, 34], [44, 40], [46, 62]].map(([l, t], i) => <MapleLeaf key={i} color={colors[i % colors.length]} className="absolute h-6 w-6 sm:h-8 sm:w-8" style={{ left: `${l}%`, top: `${t}%` }} />)}</div></Branch>
    <Branch flip>{branch}<div className="absolute inset-0">{[[20, 6], [40, 14], [58, 26], [76, 36], [42, 46]].map(([l, t], i) => <MapleLeaf key={i} color={colors[(i + 2) % colors.length]} className="absolute h-6 w-6 sm:h-8 sm:w-8" style={{ left: `${l}%`, top: `${t}%` }} />)}</div></Branch>
    <Falling n={18} seed={10} render={(i) => <MapleLeaf color={colors[i % colors.length]} className="leaf-tumble block h-4 w-4 sm:h-5 sm:w-5" style={{ animationDelay: `${i * 0.2}s` }} />} />
  </>;
}

function WinterScene() {
  return <>
    <span className="fb-aurora absolute -inset-x-1/4 top-0 h-2/3 bg-[linear-gradient(100deg,transparent_10%,rgba(127,255,212,.35)_30%,rgba(140,180,255,.35)_50%,rgba(200,160,255,.3)_65%,transparent_85%)] blur-xl" />
    <Stars n={20} seed={11} />
    <Hills back="#cfe0f2" front="#f4f9ff" />
    {[3, 10, 85, 92].map((l, i) => <svg key={l} viewBox="0 0 40 60" className={`absolute bottom-3 h-14 w-auto sm:h-20 ${i === 1 || i === 2 ? "max-sm:hidden" : ""}`} style={{ left: `${l}%` }}><path d="M20 2 L34 26 H27 L38 44 H24 V58 H16 V44 H2 L13 26 H6 Z" fill="#2c5f8f" /><path d="M20 2 L27 14 H13 Z M6 26 H34 M2 44 H38" stroke="#fff" strokeWidth="3" opacity=".85" /></svg>)}
    <Falling n={20} seed={12} render={(i) => <Snowflake className="fb-spin block drop-shadow-[0_0_4px_rgba(255,255,255,.9)]" style={{ width: 10 + (i % 3) * 5 }} />} />
  </>;
}

const BACKGROUNDS: Partial<Record<FestiveTheme["id"], string>> = {
  diwali: "radial-gradient(ellipse at 50% 120%, #8f1218 0%, #4a080d 55%, #2a0508 100%)",
  christmas: "linear-gradient(#0b2340, #16416b 70%, #23598c)",
  newyear: "radial-gradient(ellipse at 50% 0%, #3a2f8f 0%, #1d1b4b 55%, #0c0a26 100%)",
  pongal: "linear-gradient(#e0661b, #f29a2e 60%, #ffc75f)",
  holi: "linear-gradient(110deg, #b81f5c, #7b2bb8 50%, #2c3fb8)",
  eid: "radial-gradient(ellipse at 50% 0%, #137a66 0%, #0a5446 50%, #052e27 100%)",
  valentines: "linear-gradient(110deg, #8a1038, #c8174d 50%, #e9467a)",
  spring: "linear-gradient(110deg, #b8396d, #d95c8f 55%, #ec8fb3)",
  summer: "linear-gradient(#0a7f8e, #12a4b3 55%, #5fd0d8)",
  autumn: "linear-gradient(110deg, #5e230a, #9a3d12 50%, #c0561e)",
  winter: "linear-gradient(#173a66, #2c62a0 60%, #5d93cf)",
};

/** Rich animated festival/season banner shown below the header. */
export function FestiveBanner({ theme, title, subtitle, ctaHref, ctaLabel, corner }: { theme: FestiveTheme; title: string; subtitle: string; ctaHref?: string; ctaLabel?: string; corner?: ReactNode }) {
  if (theme.id === "none") return null;
  return (
    <section aria-label={title} className="festive-band relative isolate h-[150px] overflow-hidden text-white sm:h-[176px]" style={{ background: BACKGROUNDS[theme.id] }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {theme.id === "diwali" && <DiwaliScene />}
        {theme.id === "christmas" && <ChristmasScene />}
        {theme.id === "newyear" && <NewYearScene />}
        {theme.id === "pongal" && <PongalScene />}
        {theme.id === "holi" && <HoliScene />}
        {theme.id === "eid" && <EidScene />}
        {theme.id === "valentines" && <ValentineScene />}
        {theme.id === "spring" && <SpringScene />}
        {theme.id === "summer" && <SummerScene />}
        {theme.id === "autumn" && <AutumnScene colors={theme.colors} />}
        {theme.id === "winter" && <WinterScene />}
      </div>
      <div className="relative z-10 mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-16 text-center sm:px-6">
        <p className="fb-in text-[10px] font-extrabold uppercase tracking-[.3em] sm:text-[11px]" style={{ color: theme.gold }}>{theme.emoji} {theme.kind === "season" ? "Seasonal special" : "Festive special"} {theme.emoji}</p>
        <h2 className="fb-in mt-1 text-[26px] leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,.35)] sm:text-[40px]" style={{ animationDelay: ".1s" }}>{title}</h2>
        {subtitle && <p className="fb-in mt-1 hidden max-w-lg text-sm text-white/90 drop-shadow sm:block" style={{ animationDelay: ".2s" }}>{subtitle}</p>}
        {ctaHref && <a href={ctaHref} className="fb-in pointer-events-auto mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-extrabold text-ink shadow-lg transition hover:scale-105 sm:mt-3 sm:px-5 sm:py-2" style={{ animationDelay: ".3s" }}>{ctaLabel ?? "Shop now"} <span aria-hidden="true">→</span></a>}
      </div>
      {corner && <div className="absolute right-2 top-2 z-20 sm:right-4 sm:top-3">{corner}</div>}
    </section>
  );
}
