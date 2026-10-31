"use client";

import { ArrowLeft, Check, Gift, Minus, Plus, ShoppingBag, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCartStore } from "@/lib/cart-store";
import { formatInr } from "@/lib/gst";
import { galleryOf, HAMPER_VARIANT, hamperProductId, type Festive, type Hamper } from "@/lib/store-core";
import { useBackClose } from "@/lib/use-back-close";
import { PhotoCarousel } from "./photo-carousel";

// ---------- Fireworks ----------

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
type Rocket = { x: number; y: number; vy: number; targetY: number; color: string };
const COLORS = ["#EC2427", "#FFD45C", "#FFFFFF", "#FF8A3D", "#FFB3C1", "#F5C542"];

/** Full-screen canvas of bursting crackers. Each change of `burst` launches a new volley. */
export function Fireworks({ burst, seconds = 2.5 }: { burst: number; seconds?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!burst) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    addEventListener("resize", resize);
    const rockets: Rocket[] = [];
    const particles: Particle[] = [];
    const end = performance.now() + seconds * 1000;
    let nextLaunch = 0;
    let frame = 0;
    const launch = () => rockets.push({ x: innerWidth * (0.12 + Math.random() * 0.76), y: innerHeight, vy: -(innerHeight / 55 + Math.random() * 4), targetY: innerHeight * (0.12 + Math.random() * 0.35), color: COLORS[Math.floor(Math.random() * COLORS.length)] });
    const explode = (r: Rocket) => {
      const count = 34 + Math.floor(Math.random() * 18);
      const speed = 2 + Math.random() * 2;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const v = speed * (0.55 + Math.random() * 0.6);
        const max = 40 + Math.random() * 25;
        particles.push({ x: r.x, y: r.y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life: max, max, color: Math.random() < 0.25 ? "#FFFFFF" : r.color, size: 1.2 + Math.random() * 1.2 });
      }
    };
    const tick = (now: number) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(0, 0, innerWidth, innerHeight);
      ctx.globalCompositeOperation = "lighter";
      if (now < end && now > nextLaunch) { launch(); nextLaunch = now + 650 + Math.random() * 600; }
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y += r.vy; r.vy *= 0.985;
        ctx.fillStyle = r.color; ctx.beginPath(); ctx.arc(r.x, r.y, 2.4, 0, Math.PI * 2); ctx.fill();
        if (r.y <= r.targetY || r.vy > -1.5) { explode(r); rockets.splice(i, 1); }
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.045; p.vx *= 0.985; p.vy *= 0.985; p.life -= 1;
        ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.85;
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        if (p.life <= 0) particles.splice(i, 1);
      }
      ctx.globalAlpha = 1;
      if (now < end || rockets.length || particles.length) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); removeEventListener("resize", resize); ctx.clearRect(0, 0, innerWidth, innerHeight); };
  }, [burst, seconds]);
  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[80] h-full w-full" />;
}

// ---------- Hamper UI ----------

function useAddHamper(onAdded?: () => void) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const lines = useCartStore((s) => s.lines);
  return (hamper: Hamper, quantity: number) => {
    const id = hamperProductId(hamper.id);
    const current = lines.find((l) => l.productId === id)?.quantity ?? 0;
    setQuantity(id, HAMPER_VARIANT, Math.min(100, current + quantity));
    toast.success(`${hamper.name} added to basket`, { description: `${quantity} × ${formatInr(hamper.price)}` });
    onAdded?.();
  };
}

function HamperCard({ hamper, onOpen }: { hamper: Hamper; onOpen: () => void }) {
  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }} className="lift group flex h-full cursor-pointer flex-col overflow-hidden rounded-[22px] border-2 border-[#f5c542]/60 bg-white text-left">
      <div className="relative h-36 sm:h-44">
        <PhotoCarousel photos={galleryOf(hamper)} alt={hamper.name} autoPlayMs={3200} className="h-full [&>div]:h-full" rounded="rounded-none" />
        {hamper.badge && <span className="badge pointer-events-none absolute left-2 top-2 max-w-[calc(100%-1rem)] gap-1 whitespace-nowrap bg-krust !px-2 !py-1 !text-[8px] !tracking-[.08em] text-white sm:left-3 sm:top-3 sm:!px-[.7rem] sm:!text-[10px]"><Sparkles size={9} className="shrink-0" /><span className="truncate">{hamper.badge}</span></span>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="font-display text-lg leading-tight text-ink">{hamper.name}</p>
        <p className="mt-1 text-[11px] font-semibold text-cocoa">{hamper.contents.length} treats inside</p>
        <div className="mt-auto flex items-center justify-between pt-3"><span className="font-display text-xl font-extrabold text-krust">{formatInr(hamper.price)}</span><span className="text-[11px] font-extrabold uppercase tracking-wider text-krust">View →</span></div>
      </div>
    </div>
  );
}

function HamperDetail({ hamper, onBack, onAdded }: { hamper: Hamper; onBack?: () => void; onAdded: () => void }) {
  const [qty, setQty] = useState(1);
  const add = useAddHamper(onAdded);
  return (
    <div className="fade-in grid gap-6 md:grid-cols-[1fr_1.05fr]">
      <div className="relative"><PhotoCarousel photos={galleryOf(hamper)} alt={hamper.name} autoPlayMs={4000} thumbnails className="[&>div:first-child]:aspect-square [&>div:first-child]:border-2 [&>div:first-child]:border-[#f5c542]/60" />{hamper.badge && <span className="badge pointer-events-none absolute left-3 top-3 bg-krust text-white"><Sparkles size={10} /> {hamper.badge}</span>}</div>
      <div>
        {onBack && <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-cocoa hover:text-krust"><ArrowLeft size={13} /> All hampers</button>}
        <h3 className="text-3xl leading-tight">{hamper.name}</h3>
        <p className="mt-2 text-sm text-cocoa">{hamper.description}</p>
        <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[.18em] text-krust">What&apos;s inside</p>
        <ul className="mt-3 space-y-2">{hamper.contents.map((c) => <li key={c} className="flex items-start gap-2 text-sm font-semibold"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-krust text-white"><Check size={11} /></span>{c}</li>)}</ul>
        <div className="mt-6 flex items-end justify-between border-t border-petal pt-5"><div><p className="text-[11px] font-semibold text-cocoa">Price (incl. {hamper.gstRate}% GST)</p><p className="font-display text-3xl font-extrabold text-krust">{formatInr(hamper.price)}</p></div>
          <div className="flex h-11 items-center rounded-xl border-2 border-petal bg-white"><button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer" className="grid h-full w-10 place-items-center"><Minus size={14} /></button><span className="w-8 text-center text-sm font-extrabold">{qty}</span><button onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="More" className="grid h-full w-10 place-items-center"><Plus size={14} /></button></div>
        </div>
        <button onClick={() => add(hamper, qty)} className="action mt-5 h-13 w-full justify-center text-sm"><ShoppingBag size={16} /> Add {qty > 1 ? `${qty} hampers` : "to basket"} · {formatInr(hamper.price * qty)}</button>
      </div>
    </div>
  );
}

/** The festive popup: hamper grid, then a detail view with contents, price and Add to basket. */
export function HamperPopup({ festive, hampers, onClose, onAdded }: { festive: Festive; hampers: Hamper[]; onClose: () => void; onAdded: () => void }) {
  const [selected, setSelected] = useState<Hamper | null>(hampers.length === 1 ? hampers[0] : null);
  useEffect(() => { const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose(); addEventListener("keydown", esc); return () => removeEventListener("keydown", esc); }, [onClose]);
  useBackClose(true, onClose);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/55 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={festive.title}>
      <button onClick={onClose} className="absolute inset-0 cursor-default" aria-label="Close" />
      <div className="reveal relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[30px] border-[3px] border-[#f5c542] bg-cream shadow-[0_40px_100px_-30px_rgba(0,0,0,.6)]">
        <div className="sticky top-0 z-20 flex h-0 justify-end"><button onClick={onClose} aria-label="Close" className="mr-3 mt-3 flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-white pl-3 pr-4 text-sm font-extrabold text-ink shadow-lg ring-2 ring-[#f5c542] transition hover:bg-blush sm:h-12"><X size={20} strokeWidth={2.6} /> Close</button></div>
        <div className="relative overflow-hidden bg-gradient-to-br from-krust via-[#c81c22] to-[#8f1218] px-6 py-7 text-white sm:px-9">
          <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 15% 30%, #ffd45c 0 2px, transparent 3px), radial-gradient(circle at 80% 20%, #fff 0 1.5px, transparent 2.5px), radial-gradient(circle at 60% 80%, #ffd45c 0 2px, transparent 3px), radial-gradient(circle at 35% 75%, #fff 0 1.5px, transparent 2.5px)", backgroundSize: "120px 90px" }} />
          <p className="relative flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.28em] text-[#ffd45c]"><Gift size={14} /> Festive hampers</p>
          <h2 className="relative mt-2 text-4xl leading-tight sm:text-5xl">{festive.title}</h2>
          <p className="relative mt-2 max-w-xl text-sm text-white/85">{festive.subtitle}</p>
        </div>
        <div className="p-5 sm:p-8">
          {selected ? <HamperDetail hamper={selected} onBack={hampers.length > 1 ? () => setSelected(null) : undefined} onAdded={onAdded} />
            : <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">{hampers.map((h) => <HamperCard key={h.id} hamper={h} onOpen={() => setSelected(h)} />)}</div>}
          <button onClick={onClose} className="mx-auto mt-6 block rounded-full px-6 py-3 text-sm font-bold text-cocoa underline-offset-4 hover:text-krust hover:underline">Maybe later, continue shopping</button>
        </div>
      </div>
    </div>
  );
}

/** A Diwali hamper section for the home and shop pages. */
export function HamperSection({ festive, hampers, onOpen }: { festive: Festive; hampers: Hamper[]; onOpen: (h: Hamper) => void }) {
  return (
    <section id="hampers" className="mx-auto max-w-[1440px] px-5 pt-20 lg:px-10 lg:pt-24">
      <div className="relative overflow-hidden rounded-[32px] border-[3px] border-[#f5c542] bg-gradient-to-br from-krust via-[#c81c22] to-[#8f1218] p-6 text-white sm:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #ffd45c 0 2px, transparent 3px), radial-gradient(circle at 75% 25%, #fff 0 1.5px, transparent 2.5px)", backgroundSize: "110px 80px" }} />
        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.28em] text-[#ffd45c]"><Gift size={14} /> Festive hampers</p><h2 className="mt-2 text-4xl sm:text-5xl">{festive.title}</h2><p className="mt-2 max-w-xl text-sm text-white/85">{festive.subtitle}</p></div>
        </div>
        <div className="relative mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">{hampers.map((h) => <HamperCard key={h.id} hamper={h} onOpen={() => onOpen(h)} />)}</div>
      </div>
    </section>
  );
}

const SEEN_KEY = "krust-hamper-popup-seen";

/** Wires the festive pieces: timed popup that returns after `repeatMinutes`, floating gift button, fireworks. */
export function FestiveLayer({ festive, hampers, open, setOpen, focus, setFocus, raised }: { festive: Festive; hampers: Hamper[]; open: boolean; setOpen: (v: boolean) => void; focus: Hamper | null; setFocus: (h: Hamper | null) => void; raised: boolean }) {
  const [burst, setBurst] = useState(0);
  const live = festive.enabled && hampers.length > 0;
  const celebrate = useCallback(() => { if (festive.fireworks) setBurst((b) => b + 1); }, [festive.fireworks]);
  useTapSparkles(live && festive.fireworks);

  // Fireworks on first visit to the page.
  useEffect(() => { if (live && festive.fireworks) { const t = setTimeout(() => setBurst(1), 600); return () => clearTimeout(t); } }, [live, festive.fireworks]);

  // Popup after the delay, then again every repeatMinutes after it is closed.
  useEffect(() => {
    if (!live || open) return;
    let lastSeen = 0;
    try { lastSeen = Number(sessionStorage.getItem(SEEN_KEY) || 0); } catch { /* storage blocked */ }
    const due = lastSeen ? lastSeen + festive.repeatMinutes * 60_000 : Date.now() + festive.popupDelaySeconds * 1000;
    const t = setTimeout(() => { setFocus(null); setOpen(true); }, Math.max(festive.popupDelaySeconds * 1000, due - Date.now()));
    return () => clearTimeout(t);
  }, [live, open, festive.repeatMinutes, festive.popupDelaySeconds, setOpen, setFocus]);

  if (!live) return null;
  const close = () => { try { sessionStorage.setItem(SEEN_KEY, String(Date.now())); } catch { /* storage blocked */ } setOpen(false); setFocus(null); };
  return <>
    {festive.fireworks && <Fireworks burst={burst} />}
    {festive.fireworks && <AmbientFireworks />}
    <button onClick={() => { setFocus(null); setOpen(true); celebrate(); }} aria-label="Open Diwali hampers" className={`pulse-ring fixed left-4 z-40 flex h-14 ${raised ? "bottom-28" : "bottom-6"} items-center gap-2 rounded-full border-2 border-[#f5c542] bg-krust pl-4 pr-5 text-sm font-extrabold text-white shadow-xl transition-all hover:scale-105 sm:left-6`}><Gift size={20} /> <span className="hidden sm:inline">Diwali hampers</span></button>
    {open && <HamperPopup key={focus?.id ?? "all"} festive={festive} hampers={focus ? [focus] : hampers} onClose={close} onAdded={() => { celebrate(); close(); }} />}
  </>;
}

// ---------- More festive decoration ----------

/** A clay diya with a flickering flame, drawn in SVG. */
export function Diya({ size = 44, delay = 0 }: { size?: number; delay?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ animationDelay: `${delay}ms` }}>
      <defs>
        <radialGradient id="diya-glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#FFD45C" stopOpacity=".9" /><stop offset="100%" stopColor="#FFD45C" stopOpacity="0" /></radialGradient>
        <linearGradient id="diya-clay" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E86A2E" /><stop offset="100%" stopColor="#9C3412" /></linearGradient>
        <linearGradient id="diya-fire" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#FF6A00" /><stop offset="60%" stopColor="#FFC93C" /><stop offset="100%" stopColor="#FFF6C2" /></linearGradient>
      </defs>
      <circle className="diya-glow" cx="32" cy="24" r="20" fill="url(#diya-glow)" style={{ animationDelay: `${delay}ms` }} />
      <path className="diya-flame" d="M32 8 C38 18 37 26 32 30 C27 26 26 18 32 8 Z" fill="url(#diya-fire)" style={{ animationDelay: `${delay}ms` }} />
      <path d="M8 34 C12 50 52 50 56 34 C48 38 16 38 8 34 Z" fill="url(#diya-clay)" />
      <path d="M8 34 C16 38 48 38 56 34" stroke="#FFD45C" strokeWidth="2" fill="none" />
      <circle cx="22" cy="42" r="1.6" fill="#FFD45C" /><circle cx="32" cy="44" r="1.6" fill="#FFD45C" /><circle cx="42" cy="42" r="1.6" fill="#FFD45C" />
    </svg>
  );
}

const BULB_COLORS = ["#FFD45C", "#EC2427", "#FF8A3D", "#FFFFFF", "#F5C542", "#FF4D6D"];

/** A swag of twinkling string lights with diyas, shown under the header. */
export function DiwaliGarland() {
  const bulbs = 36;
  return (
    <div aria-hidden="true" className="pointer-events-none relative h-16 overflow-hidden bg-gradient-to-b from-[#2b1a14]/[.04] to-transparent">
      <svg className="absolute inset-x-0 top-0 h-10 w-full" viewBox="0 0 1000 40" preserveAspectRatio="none">
        <path d={`M0 2 ${Array.from({ length: 5 }, (_, i) => `Q ${i * 200 + 100} 34 ${(i + 1) * 200} 2`).join(" ")}`} stroke="#6b5446" strokeOpacity=".45" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      {Array.from({ length: bulbs }, (_, i) => {
        const t = (i + 0.5) / bulbs;
        const swag = (t * 5) % 1; // position inside one of five swags
        // Rounded so server and browser write identical style strings (avoids hydration warnings).
        const top = Math.round((2 + Math.sin(swag * Math.PI) * 26) * 10) / 10;
        const left = Math.round(t * 10000) / 100;
        const color = BULB_COLORS[i % BULB_COLORS.length];
        return <span key={i} suppressHydrationWarning className={`bulb absolute h-2.5 w-2.5 rounded-full ${i % 2 ? "max-sm:hidden" : ""}`} style={{ left: `${left}%`, top: `${top}px`, color, backgroundColor: color, animationDelay: `${(i * 137) % 1600}ms` }} />;
      })}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-4 sm:px-16">
        {[0, 1, 2, 3, 4].map((i) => <span key={i} className={i % 2 ? "max-sm:hidden" : ""}><Diya size={34} delay={i * 220} /></span>)}
      </div>
    </div>
  );
}

/** Small golden sparkles wherever the customer taps or clicks. */
export function useTapSparkles(enabled: boolean) {
  useEffect(() => {
    if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select")) return;
      for (let i = 0; i < 5; i++) {
        const el = document.createElement("span");
        const angle = (Math.PI * 2 * i) / 5 + Math.random() * 0.4;
        const dist = 26 + Math.random() * 22;
        el.className = "tap-sparkle";
        el.style.left = `${e.clientX}px`;
        el.style.top = `${e.clientY}px`;
        el.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
        el.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
        el.style.background = BULB_COLORS[i % BULB_COLORS.length];
        el.style.clipPath = "polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)";
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 800);
      }
    };
    addEventListener("pointerdown", onDown);
    return () => removeEventListener("pointerdown", onDown);
  }, [enabled]);
}

/** A single cracker now and then while the customer browses. */
export function AmbientFireworks({ everySeconds = 60 }: { everySeconds?: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") setTick((t) => t + 1); }, everySeconds * 1000);
    return () => clearInterval(id);
  }, [everySeconds]);
  return <Fireworks burst={tick} seconds={0.6} />;
}
