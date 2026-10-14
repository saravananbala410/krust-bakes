"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Award, Check, ChefHat, ChevronDown, Clock3, Leaf, Mail, MapPin, Menu, Minus, PackageCheck, Phone, Plus, Quote, Search, ShieldCheck, ShoppingBag, Sparkles, Star, Truck, X } from "lucide-react";
import { createContext, FormEvent, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { calculateInclusiveGst, formatInr } from "@/lib/gst";
import { useCartStore } from "@/lib/cart-store";
import { useAppStore } from "@/lib/app-store";
import type { CarouselSlide, PublicConfig } from "@/lib/store-core";
import type { Product } from "@/lib/types";
import { socialIcons, socialLabels, WhatsAppIcon } from "./social-icons";

const HERO = "/brand/krust-hero.png";
const ConfigContext = createContext<PublicConfig | null>(null);
const useConfig = () => useContext(ConfigContext)!;
const noopSubscribe = () => () => {};
/** False during SSR and hydration, true afterwards: keeps the persisted cart from causing hydration mismatches. */
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);
const localToday = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

/** Cart totals against the live catalogue; lines for removed products are ignored. */
function useCartMath() {
  const lines = useCartStore((state) => state.lines);
  const { products } = useConfig();
  return useMemo(() => {
    const resolved = lines.flatMap((line) => {
      const product = products.find((item) => item.id === line.productId && item.active !== false);
      const variant = product?.variants.find((item) => item.id === line.variantId);
      return product && variant ? [{ line, product, variant }] : [];
    });
    return {
      resolved,
      items: resolved.reduce((sum, r) => sum + r.line.quantity, 0),
      subtotal: resolved.reduce((sum, r) => sum + r.variant.price * r.line.quantity, 0),
      gst: resolved.reduce((sum, r) => sum + calculateInclusiveGst(r.variant.price * r.line.quantity, r.product.gstRate).gstAmount, 0),
    };
  }, [lines, products]);
}

/** Adds .is-visible to [data-reveal] elements as they scroll into view. */
function useScrollReveal(key: string) {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [key]);
}

export function Storefront({ initialConfig }: { initialConfig: PublicConfig }) {
  const live = useAppStore((state) => (state.loaded ? state.config : null));
  const refresh = useAppStore((state) => state.refresh);
  useEffect(() => { void refresh(); }, [refresh]);
  return <ConfigContext.Provider value={live ?? initialConfig}><StorefrontPage /></ConfigContext.Provider>;
}

function StorefrontPage() {
  const config = useConfig();
  const { branding, settings, socialLinks } = config;
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const mounted = useHydrated();
  const checkoutOpen = useCartStore((state) => state.checkoutOpen);
  const setCheckoutOpen = useCartStore((state) => state.setCheckoutOpen);
  const { items, subtotal } = useCartMath();

  const activeCategories = config.categories.filter((item) => item.active);
  const activeNames = new Set(activeCategories.map((item) => item.name));
  const visible = config.products.filter((p) => p.active !== false && activeNames.has(p.category));
  const filtered = visible.filter((p) => (category === "All" || p.category === category) && `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(search.toLowerCase()));
  const featured = visible.filter((p) => p.featured).slice(0, 8);
  const cartItems = mounted ? items : 0;
  useScrollReveal(`${category}|${search}|${config.products.length}|${mounted}`);

  const pickCategory = (name: string) => { setCategory(name); document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" }); };

  return (
    <main className="min-h-screen overflow-x-hidden bg-cream pb-28">
      {branding.announcement && <div className="bg-krust px-4 py-2 text-center text-[11px] font-semibold tracking-[.2em] text-white uppercase">{branding.announcement}</div>}

      <header className="sticky top-0 z-40 border-b border-petal/70 bg-cream/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[78px] max-w-[1440px] items-center justify-between px-5 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label={`${branding.storeName} home`}>
            <img src={branding.logoUrl} alt="" className="h-12 w-12 rounded-2xl object-contain shadow-[0_6px_18px_rgba(215,38,61,.18)]" />
            <div><img src={branding.wordmarkUrl} alt={branding.storeName} className="h-auto w-[150px] sm:w-[178px]" /><p className="hidden text-[9px] font-semibold uppercase tracking-[.3em] text-cocoa sm:block">{branding.tagline}</p></div>
          </Link>
          <nav className="hidden items-center gap-8 text-[13px] font-semibold uppercase tracking-[.14em] text-cocoa lg:flex">
            {[["#menu", "Shop"], ["#collections", "Collections"], ["#story", "Our story"], ["#reviews", "Reviews"], ["#visit", "Visit"]].map(([href, label]) => <a key={href} href={href} className="relative transition hover:text-krust after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-krust after:transition-all hover:after:w-full">{label}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <SocialRow links={socialLinks} className="hidden xl:flex" small />
            <button onClick={() => setCheckoutOpen(true)} className="relative flex h-11 items-center gap-2 rounded-full bg-krust px-5 text-sm font-semibold text-white shadow-[0_10px_26px_rgba(215,38,61,.28)] transition hover:bg-krust-deep">
              <ShoppingBag size={17} /><span className="hidden sm:inline">Basket</span>
              {cartItems > 0 && <span key={cartItems} className="reveal rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-krust">{cartItems}</span>}
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" className="grid h-11 w-11 place-items-center rounded-full border border-petal bg-white lg:hidden"><Menu size={19} /></button>
          </div>
        </div>
        {menuOpen && <nav className="fade-in border-t border-petal bg-cream px-5 py-5 text-sm font-semibold lg:hidden"><div className="flex flex-col gap-4">{[["#menu", "Shop"], ["#collections", "Collections"], ["#story", "Our story"], ["#reviews", "Reviews"], ["#visit", "Visit us"]].map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}<SocialRow links={socialLinks} small /></div></nav>}
      </header>

      <Hero />

      <section className="border-y border-petal/70 bg-white">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 md:grid-cols-4">
          {([[Clock3, "Baked today", "Never yesterday's batch"], [Leaf, "Clean label", "No MSG, no bromides"], [ChefHat, "Master baker", "16+ years of craft"], [PackageCheck, "Handled with care", "Bakery-to-door delivery"]] as const).map(([Icon, title, copy], i) => (
            <div key={title} data-reveal style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties} className="flex gap-4 border-petal/70 px-5 py-7 odd:border-r md:border-r md:last:border-r-0 lg:px-9">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blush text-krust"><Icon size={19} /></span>
              <div><p className="font-display text-lg">{title}</p><p className="mt-0.5 text-xs text-cocoa">{copy}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section id="collections" className="mx-auto max-w-[1440px] px-5 pt-20 lg:px-10 lg:pt-28">
        <SectionHeading eyebrow="The collections" title="Something for every hour" copy="From the morning loaf to the four o'clock tea cake and the late-night brownie." />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {activeCategories.map((cat, i) => {
            const count = visible.filter((p) => p.category === cat.name).length;
            const tints = ["bg-blush", "bg-peach", "bg-lilac", "bg-mint", "bg-butter"];
            return (
              <button key={cat.id} onClick={() => pickCategory(cat.name)} data-reveal style={{ "--reveal-delay": `${(i % 5) * 70}ms` } as React.CSSProperties} className={`lift group relative overflow-hidden rounded-[22px] border border-white p-5 text-left ${tints[i % tints.length]}`}>
                <span className="badge bg-white/80 text-krust">{count} items</span>
                <p className="mt-8 font-display text-xl leading-tight sm:text-2xl">{cat.name}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[.16em] text-krust">Shop <ArrowRight size={13} className="transition group-hover:translate-x-1" /></span>
              </button>
            );
          })}
        </div>
      </section>

      {featured.length > 0 && <section className="mx-auto max-w-[1440px] px-5 pt-20 lg:px-10 lg:pt-24">
        <SectionHeading eyebrow="Bestsellers" title="The ones they come back for" />
        <div className="no-scrollbar -mx-5 mt-10 flex snap-x gap-4 overflow-x-auto px-5 pb-4">
          {featured.map((p) => <div key={p.id} className="w-[290px] shrink-0 snap-start"><ProductCard product={p} /></div>)}
        </div>
      </section>}

      <section id="menu" className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading eyebrow="The daily bake" title="Choose your favourites." copy="All prices include GST. Pick a size, set the quantity and your total updates instantly." />
          <label className="flex h-12 w-full items-center gap-3 rounded-full border border-petal bg-white px-5 shadow-sm transition focus-within:border-krust lg:w-80"><Search size={17} className="text-cocoa" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the bake…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-cocoa/60" /></label>
        </div>
        <div className="no-scrollbar mt-10 flex gap-2 overflow-x-auto pb-2">
          {["All", ...activeCategories.map((c) => c.name)].map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-5 py-2.5 text-[13px] font-semibold transition ${category === item ? "border-krust bg-krust text-white shadow-[0_8px_20px_rgba(215,38,61,.25)]" : "border-petal bg-white text-cocoa hover:border-krust hover:text-krust"}`}>{item}</button>)}
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((product, i) => <div key={product.id} data-reveal style={{ "--reveal-delay": `${(i % 4) * 60}ms` } as React.CSSProperties}><ProductCard product={product} /></div>)}
        </div>
        {filtered.length === 0 && <div className="mt-8 rounded-3xl border border-dashed border-petal py-20 text-center text-sm text-cocoa">Nothing matched that search. Try another bake.</div>}
      </section>

      <StoryCarousel slides={config.slides.filter((s) => s.active)} />

      <StorySection />

      <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28">
        <SectionHeading eyebrow="How it works" title="From our oven to your table" center />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {([[ShoppingBag, "Pick your bakes", "Browse today's menu and add favourites to your basket."], [Clock3, "Choose a slot", "Select a delivery date and a time window that suits you."], [ChefHat, "We bake fresh", "Your order is baked and packed the same morning."], [Truck, "Doorstep delivery", "Delivered warm with a GST invoice for every order."]] as const).map(([Icon, title, copy], i) => (
            <div key={title} data-reveal style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties} className="lift relative rounded-[26px] border border-petal bg-white p-7">
              <span className="font-display absolute right-6 top-5 text-5xl text-petal">0{i + 1}</span>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blush text-krust"><Icon size={21} /></span>
              <p className="mt-6 font-display text-2xl">{title}</p>
              <p className="mt-2 text-sm leading-6 text-cocoa">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      {config.testimonials.some((t) => t.active) && <section id="reviews" className="bg-blush/60 py-20 lg:py-28">
        <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
          <SectionHeading eyebrow="Kind words" title="Loved across Chennai" center />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {config.testimonials.filter((t) => t.active).map((t, i) => (
              <figure key={t.id} data-reveal style={{ "--reveal-delay": `${i * 100}ms` } as React.CSSProperties} className="lift rounded-[28px] border-2 border-krust/80 bg-white p-8">
                <Quote className="text-krust" size={28} />
                <div className="mt-4 flex gap-0.5 text-krust">{Array.from({ length: 5 }, (_, s) => <Star key={s} size={14} fill="currentColor" />)}</div>
                <blockquote className="mt-4 font-display text-xl leading-8">“{t.quote}”</blockquote>
                <figcaption className="mt-6 border-t border-petal pt-4"><p className="font-semibold">{t.name}</p><p className="text-xs uppercase tracking-[.16em] text-cocoa">{t.role}</p></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>}

      <section className="overflow-hidden border-y border-petal bg-white py-9">
        <p className="eyebrow mb-5 text-center">Trusted by</p>
        <div className="marquee-track flex items-center gap-16 font-display text-3xl text-cocoa/60">{[0, 1].flatMap((n) => ["Taj Hotels", "Beachville", "Nuts & Spices", "Double Roti", "Kamala · Kasi · Vetri"].map((name) => <span key={`${n}-${name}`} className="flex items-center gap-16">{name}<Sparkles size={16} className="text-krust/50" /></span>))}</div>
      </section>

      {config.faqs.some((f) => f.active) && <section className="mx-auto max-w-[980px] px-5 py-20 lg:py-28">
        <SectionHeading eyebrow="Good to know" title="Questions, answered" center />
        <div className="mt-10 space-y-3">
          {config.faqs.filter((f) => f.active).map((f) => (
            <details key={f.id} data-reveal className="group rounded-2xl border border-petal bg-white px-6 py-5 open:border-krust open:shadow-[0_14px_40px_-20px_rgba(215,38,61,.4)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl">{f.question}<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blush text-krust transition group-open:rotate-45"><Plus size={16} /></span></summary>
              <p className="mt-3 text-sm leading-7 text-cocoa">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>}

      <section id="visit" className="px-5 pb-20 lg:px-10">
        <div data-reveal className="mx-auto grid max-w-[1440px] overflow-hidden rounded-[36px] border-[3px] border-krust bg-white lg:grid-cols-2">
          <div className="p-8 sm:p-12 lg:p-16">
            <p className="eyebrow">Visit the bakehouse</p>
            <h2 className="mt-4 text-4xl sm:text-5xl">Come say <span className="font-hero text-6xl text-krust">hello</span></h2>
            <div className="mt-8 space-y-4 text-sm text-cocoa">
              <p className="flex gap-3"><MapPin size={18} className="mt-0.5 shrink-0 text-krust" />{branding.address}</p>
              <a href={`tel:${branding.phone.replace(/\s/g, "")}`} className="flex gap-3 hover:text-krust"><Phone size={18} className="shrink-0 text-krust" />{branding.phone}</a>
              <a href={`mailto:${branding.email}`} className="flex gap-3 hover:text-krust"><Mail size={18} className="shrink-0 text-krust" />{branding.email}</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-3"><a href={branding.mapsUrl} target="_blank" rel="noreferrer" className="action"><MapPin size={15} /> Open in Maps</a><a href="#menu" className="action secondary">Order online</a></div>
            <div className="gold-rule my-9" />
            <p className="font-display text-2xl">Follow the fresh batch</p>
            <p className="mt-1 text-xs text-cocoa">Daily bakes, behind-the-scenes and celebration inspiration.</p>
            <SocialRow links={socialLinks} className="mt-5" />
          </div>
          <div className="relative min-h-[320px] bg-peach"><img src={branding.heroImage || HERO} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-krust/25 to-transparent" /></div>
        </div>
      </section>

      <footer className="border-t-4 border-krust bg-[#fbe3e4] px-5 py-14 text-ink lg:px-10">
        <div className="mx-auto grid max-w-[1440px] gap-10 md:grid-cols-[1.3fr_.8fr_.8fr]">
          <div><img src={branding.wordmarkUrl} alt={branding.storeName} className="w-[220px]" /><p className="mt-4 max-w-md text-sm leading-7 text-cocoa">Breads, tea cakes, cookies, brownies and savouries, baked fresh in Guindy, Chennai.</p><SocialRow links={socialLinks} className="mt-5" /></div>
          <div><p className="eyebrow">Explore</p><div className="mt-4 flex flex-col gap-2 text-sm text-cocoa">{[["#menu", "Shop the bake"], ["#collections", "Collections"], ["#story", "Our story"], ["#visit", "Visit us"]].map(([h, l]) => <a key={h} href={h} className="hover:text-krust">{l}</a>)}</div></div>
          <div><p className="eyebrow">Say hello</p><a href={`tel:${branding.phone.replace(/\s/g, "")}`} className="mt-4 block text-sm text-cocoa hover:text-krust">{branding.phone}</a><a href={`mailto:${branding.email}`} className="mt-2 block text-sm text-cocoa hover:text-krust">{branding.email}</a><p className="mt-2 text-sm leading-6 text-cocoa">{branding.address}</p></div>
        </div>
        <div className="mx-auto mt-12 flex max-w-[1440px] flex-col gap-2 border-t border-krust/20 pt-5 text-[11px] text-cocoa sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {branding.storeName}. Made fresh in Chennai.</p>
          <p>Prices include GST{settings.gstin && ` · GSTIN ${settings.gstin}`}{settings.fssai && ` · FSSAI ${settings.fssai}`}</p>
        </div>
      </footer>

      {socialLinks.whatsapp && <a href={socialLinks.whatsapp} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" className={`pulse-ring fixed right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25d366] text-white shadow-xl transition-all ${cartItems > 0 ? "bottom-28" : "bottom-6"}`}><WhatsAppIcon size={26} /></a>}

      {cartItems > 0 && <div className="reveal fixed inset-x-0 bottom-0 z-40 border-t-2 border-krust bg-white/95 px-4 py-3 shadow-[0_-18px_50px_rgba(215,38,61,.14)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-5"><span className="grid h-11 w-11 place-items-center rounded-full bg-krust text-white"><ShoppingBag size={19} /></span><div><p className="text-[11px] text-cocoa">{cartItems} item{cartItems === 1 ? "" : "s"} in your basket</p><p className="font-display text-xl">{formatInr(subtotal)}</p></div></div>
          <div className="hidden text-right md:block">{subtotal < settings.minimumOrder ? <><p className="text-xs font-semibold text-krust">Add {formatInr(settings.minimumOrder - subtotal)} for delivery</p><div className="mt-1.5 h-1.5 w-48 overflow-hidden rounded-full bg-blush"><div className="h-full rounded-full bg-krust transition-all" style={{ width: `${Math.min(100, (subtotal / settings.minimumOrder) * 100)}%` }} /></div></> : <p className="flex items-center gap-2 text-xs font-semibold text-[#2f7a4a]"><Check size={14} /> Delivery minimum reached</p>}</div>
          <button onClick={() => setCheckoutOpen(true)} disabled={subtotal < settings.minimumOrder} className="flex h-12 items-center gap-2 rounded-full bg-krust px-6 text-sm font-bold text-white transition hover:bg-krust-deep disabled:cursor-not-allowed disabled:bg-petal disabled:text-cocoa">Checkout <ArrowRight size={16} /></button>
        </div>
      </div>}
      {checkoutOpen && <CheckoutSheet onClose={() => setCheckoutOpen(false)} />}
    </main>
  );
}

function StorySection() {
  const { story } = useConfig();
  return (
    <section id="story" className="pastel-wash">
      <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 py-20 lg:grid-cols-[.95fr_1.05fr] lg:px-10 lg:py-28">
        <div data-reveal className="relative mx-auto w-full max-w-[520px]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[36px] border-[5px] border-krust shadow-[0_30px_80px_-30px_rgba(163,23,43,.5)]"><img src={story.imageUrl || HERO} alt="Our story" className={`ken-burns h-full w-full object-cover ${story.imageUrl === HERO ? "object-[78%_50%]" : ""}`} /></div>
          {story.statValue && <div className="soft-float absolute -bottom-6 -left-4 rounded-3xl border-2 border-krust bg-white px-6 py-5 shadow-xl sm:-left-8"><p className="font-display text-5xl text-krust">{story.statValue}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.2em] text-cocoa">{story.statLabel}</p></div>}
        </div>
        <div data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties} className="max-w-2xl">
          <p className="eyebrow">{story.eyebrow}</p>
          <h2 className="mt-4 text-5xl leading-[1] sm:text-6xl">{story.titleStart} {story.titleAccent && <span className="font-hero text-6xl text-krust sm:text-7xl">{story.titleAccent}</span>} {story.titleEnd}</h2>
          <div className="gold-rule my-8 w-40" />
          {story.paragraphs.split(/\n\s*\n/).filter((p) => p.trim()).map((p, i) => <p key={i} className={`leading-8 text-cocoa ${i ? "mt-5" : ""}`}>{p}</p>)}
          {story.team.length > 0 && <div className="mt-9 grid gap-5 sm:grid-cols-2">{story.team.map((m) => (
            <div key={m.id} className="flex items-center gap-4">
              {m.photoUrl ? <img src={m.photoUrl} alt={m.name} className="h-16 w-16 shrink-0 rounded-full border-[3px] border-krust object-cover" /> : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-krust text-white"><Award size={24} /></span>}
              <div><p className="font-display text-xl">{m.name}</p><p className="text-xs uppercase tracking-[.18em] text-cocoa">{m.role}</p></div>
            </div>
          ))}</div>}
        </div>
      </div>
    </section>
  );
}

function Hero() {
  const { branding } = useConfig();
  return (
    <section className="pastel-wash relative isolate overflow-hidden">
      <div className="grain absolute inset-0 -z-10 opacity-60" />
      <div className="mx-auto grid min-h-[640px] max-w-[1440px] items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:py-20">
        <div className="reveal">
          <span className="badge border border-krust/30 bg-white/70 text-krust"><Sparkles size={13} /> {branding.heroEyebrow}</span>
          <h1 className="mt-7 text-[clamp(3rem,6.5vw,6.2rem)] leading-[.95] tracking-[-.02em]">{branding.heroTitle}<br /><span className="font-hero shimmer-text inline-block pr-4 text-[clamp(4.4rem,9vw,9rem)] leading-[1.05]">{branding.heroAccent}</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-cocoa">{branding.heroCopy}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#menu" className="group flex h-14 items-center gap-3 rounded-full bg-krust px-7 text-sm font-bold text-white shadow-[0_16px_40px_rgba(215,38,61,.3)] transition hover:bg-krust-deep">Order from today&apos;s bake <ArrowRight size={17} className="transition group-hover:translate-x-1" /></a>
            <a href="#story" className="flex h-14 items-center rounded-full border-2 border-krust bg-white/70 px-7 text-sm font-bold text-krust backdrop-blur transition hover:bg-white">Meet the baker</a>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">{["No MSG", "No bromides", "Eggless options", "GST invoice"].map((t) => <span key={t} className="badge border border-krust/20 bg-white text-krust"><Check size={12} /> {t}</span>)}</div>
        </div>
        <div className="relative mx-auto w-full max-w-[560px]">
          <div className="reveal relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[40px] border-[6px] border-krust bg-peach shadow-[0_40px_90px_-30px_rgba(163,23,43,.55)]" style={{ animationDelay: "120ms" }}>
            <img src={branding.heroImage || HERO} alt="Freshly baked artisan breads and pastries" className="ken-burns h-full w-full object-cover" />
          </div>
          <div className="soft-float absolute -left-3 top-16 rounded-2xl border-2 border-krust bg-white px-4 py-3 shadow-xl sm:-left-10"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-cocoa">Baker&apos;s note</p><p className="font-display text-lg italic">“Patience is an ingredient.”</p></div>
          <div className="soft-float absolute -right-2 bottom-14 grid h-28 w-28 place-items-center rounded-full bg-krust text-center text-white shadow-xl sm:-right-6" style={{ animationDelay: "1.5s" }}><div><p className="font-display text-3xl leading-none">100%</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[.16em]">Baked<br />fresh</p></div></div>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, copy, center = false }: { eyebrow: string; title: string; copy?: string; center?: boolean }) {
  return <div data-reveal className={center ? "text-center" : ""}><p className="eyebrow">{eyebrow}</p><h2 className="mt-3 text-4xl leading-tight sm:text-5xl lg:text-[3.4rem]">{title}</h2>{center && <div className="gold-rule mx-auto mt-5 w-32" />}{copy && <p className={`mt-3 max-w-2xl text-sm leading-7 text-cocoa ${center ? "mx-auto" : ""}`}>{copy}</p>}</div>;
}

function SocialRow({ links, className = "", small = false }: { links: PublicConfig["socialLinks"]; className?: string; small?: boolean }) {
  return <div className={`flex gap-2 ${className}`}>{(Object.keys(socialIcons) as Array<keyof typeof socialIcons>).filter((k) => links[k]).map((k) => { const Icon = socialIcons[k]; return <a key={k} href={links[k]} target="_blank" rel="noreferrer" aria-label={socialLabels[k]} className={`grid place-items-center rounded-full border-2 border-krust bg-white text-krust transition hover:-translate-y-0.5 hover:bg-krust hover:text-white ${small ? "h-9 w-9" : "h-11 w-11"}`}><Icon size={small ? 15 : 18} /></a>; })}</div>;
}

function ProductImage({ product, className = "" }: { product: Product; className?: string }) {
  const custom = product.imageUrl && product.imageUrl !== HERO;
  return <img src={custom ? product.imageUrl : HERO} alt={product.name} className={`h-full w-full object-cover transition duration-700 group-hover:scale-110 ${custom ? "" : "scale-[1.6] group-hover:scale-[1.72]"} ${className}`} style={custom ? undefined : { objectPosition: product.crop }} />;
}

function ProductCard({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const quantity = useCartStore((state) => state.lines.find((line) => line.key === `${product.id}:${variantId}`)?.quantity ?? 0);
  const mounted = useHydrated();
  const variant = product.variants.find((item) => item.id === variantId) ?? product.variants[0];
  if (!variant) return null;
  const qty = mounted ? quantity : 0;
  const add = () => { setQuantity(product.id, variant.id, 1); toast.success(`${product.name} added to basket`); };
  return (
    <article className="lift group h-full overflow-hidden rounded-[26px] border border-petal bg-white">
      <div className="relative h-52 overflow-hidden bg-peach">
        <ProductImage product={product} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className={`badge ${product.eggless ? "bg-mint text-[#2f7a4a]" : "bg-butter text-[#8a5a13]"}`}>{product.eggless ? "Eggless" : "Contains egg"}</span>
          {product.featured && <span className="badge bg-krust text-white"><Star size={10} fill="currentColor" /> Bestseller</span>}
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-krust">{product.category}</p><h3 className="mt-1 text-2xl leading-tight">{product.name}</h3></div><p className="shrink-0 font-display text-xl text-krust">{formatInr(variant.price)}</p></div>
        <p className="mt-2 min-h-10 text-xs leading-5 text-cocoa">{product.description}</p>
        <div className="mt-5 flex items-center gap-3">
          <div className="relative min-w-0 flex-1"><select value={variant.id} onChange={(e) => setVariantId(e.target.value)} aria-label={`Select ${product.name} size`} className="h-11 w-full appearance-none rounded-xl border border-petal bg-cream px-3 pr-8 text-xs font-semibold outline-none focus:border-krust">{product.variants.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatInr(item.price)}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cocoa" /></div>
          {qty === 0 ? <button onClick={add} className="h-11 rounded-xl bg-ink px-5 text-xs font-bold text-white transition hover:bg-krust">Add</button> : <div className="flex h-11 items-center rounded-xl bg-krust text-white"><button onClick={() => setQuantity(product.id, variant.id, qty - 1)} aria-label="Decrease quantity" className="grid h-11 w-10 place-items-center"><Minus size={14} /></button><input aria-label="Quantity" inputMode="numeric" value={qty} onChange={(e) => setQuantity(product.id, variant.id, Math.min(100, Math.max(0, Number(e.target.value) || 0)))} className="w-7 bg-transparent text-center text-sm font-bold outline-none" /><button onClick={() => setQuantity(product.id, variant.id, qty + 1)} aria-label="Increase quantity" className="grid h-11 w-10 place-items-center"><Plus size={14} /></button></div>}
        </div>
      </div>
    </article>
  );
}

const SLIDE_MS = 6000;

/** Auto-playing feature carousel: image on the left, words on the right, bold red border. */
function StoryCarousel({ slides }: { slides: CarouselSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = setTimeout(() => setCurrent((v) => (v + 1) % count), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [current, count, paused]);
  if (!count) return null;
  const index = current % count;
  const slide = slides[index];
  const move = (dir: number) => setCurrent((v) => (v + dir + count) % count);
  return (
    <section className="bg-blush/50 px-5 py-20 lg:px-10 lg:py-28" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-10 flex items-end justify-between gap-4">
          <SectionHeading eyebrow="Inside the bakehouse" title="Craft, told in layers." />
          <div className="flex shrink-0 gap-2"><button onClick={() => move(-1)} aria-label="Previous slide" className="grid h-12 w-12 place-items-center rounded-full border-2 border-krust bg-white text-krust transition hover:bg-blush"><ArrowLeft size={18} /></button><button onClick={() => move(1)} aria-label="Next slide" className="grid h-12 w-12 place-items-center rounded-full bg-krust text-white transition hover:bg-krust-deep"><ArrowRight size={18} /></button></div>
        </div>
        <article key={slide.id} className="grid overflow-hidden rounded-[34px] border-[5px] border-krust bg-white shadow-[0_34px_80px_-30px_rgba(163,23,43,.45)] lg:grid-cols-[1.05fr_.95fr]">
          <div className="relative min-h-[300px] overflow-hidden bg-peach sm:min-h-[400px]"><img src={slide.imageUrl || HERO} alt={slide.title} className="slide-image absolute inset-0 h-full w-full object-cover" /><span className="badge absolute left-5 top-5 bg-krust text-white">{String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</span></div>
          <div className="slide-copy flex items-center border-t-[5px] border-krust p-8 sm:p-12 lg:border-l-[5px] lg:border-t-0 lg:p-16">
            <div>
              <p className="eyebrow">{slide.eyebrow}</p>
              <h3 className="mt-4 text-4xl font-bold leading-[1.05] sm:text-5xl">{slide.title}</h3>
              <div className="gold-rule my-6 w-28" />
              <p className="max-w-lg text-base leading-8 text-cocoa">{slide.copy}</p>
              {slide.ctaLabel && <a href="#menu" className="action mt-8">{slide.ctaLabel} <ArrowRight size={15} /></a>}
              <div className="mt-9 flex items-center gap-2">{slides.map((item, i) => <button key={item.id} onClick={() => setCurrent(i)} aria-label={`Go to slide ${i + 1}`} className={`relative h-2 overflow-hidden rounded-full transition-all ${i === index ? "w-14 bg-petal" : "w-2 bg-petal hover:bg-krust/50"}`}>{i === index && <span key={`${current}-${paused}`} className={`absolute inset-0 rounded-full bg-krust ${paused || count < 2 ? "" : "slide-progress"}`} style={{ "--slide-ms": `${SLIDE_MS}ms` } as React.CSSProperties} />}</button>)}</div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function CheckoutSheet({ onClose }: { onClose: () => void }) {
  const { resolved, items, subtotal, gst } = useCartMath();
  const { settings, socialLinks } = useConfig();
  const clear = useCartStore((state) => state.clear);
  const [step, setStep] = useState<"details" | "success">("details");
  const [payment, setPayment] = useState<"UPI" | "ONLINE" | "PAY_ON_DELIVERY">("UPI");
  const [placed, setPlaced] = useState<{ id: string; token: string; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [today] = useState(localToday);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const field = (k: string) => String(data.get(k) ?? "").trim();
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        customer: field("name"), phone: field("phone"), whatsapp: field("whatsapp"), email: field("email"), address: field("address"), landmark: field("landmark"), pincode: field("pincode"),
        deliveryDate: field("date"), slot: field("slot"), paymentMethod: payment, note: field("note"),
        lines: resolved.map(({ line }) => ({ productId: line.productId, variantId: line.variantId, quantity: line.quantity })),
      }) });
      const body = (await response.json()) as { id: string; token: string; total: number; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not place the order");
      setPlaced(body); clear(); setStep("success");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const waNumber = socialLinks.whatsapp.match(/wa\.me\/(\d+)/)?.[1] ?? "919840477330";
  return <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Checkout"><button onClick={onClose} className="absolute inset-0 cursor-default" aria-label="Close checkout" /><aside className="relative h-full w-full max-w-[610px] overflow-y-auto bg-cream shadow-2xl" style={{ animation: "slide-in-right .45s cubic-bezier(.2,.8,.2,1) both" }}>
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-petal bg-cream/95 px-5 py-5 backdrop-blur sm:px-8"><div><p className="eyebrow">Secure order</p><h2 className="text-3xl">{step === "details" ? "Checkout" : "Order confirmed"}</h2></div><button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-petal bg-white" aria-label="Close"><X size={18} /></button></div>
    {step === "success" && placed ? <div className="reveal flex min-h-[75vh] flex-col items-center justify-center px-7 text-center"><div className="pulse-ring grid h-20 w-20 place-items-center rounded-full bg-krust text-white"><Check size={36} /></div><p className="eyebrow mt-7">Order {placed.id}</p><h3 className="mt-3 text-5xl leading-none">Your bake is <span className="font-hero text-krust">booked.</span></h3><p className="mt-5 max-w-md text-sm leading-6 text-cocoa">We&apos;ve received your order. The bakery will confirm your delivery slot shortly on WhatsApp.</p><div className="mt-7 w-full max-w-sm rounded-2xl border-2 border-krust bg-white p-5 text-left"><div className="flex justify-between text-sm"><span className="text-cocoa">Order total</span><span className="font-bold">{formatInr(placed.total)}</span></div><div className="mt-3 flex justify-between text-sm"><span className="text-cocoa">Payment</span><span className="font-semibold">{payment === "PAY_ON_DELIVERY" ? "Pay on delivery" : payment}</span></div></div><div className="mt-7 grid w-full max-w-sm gap-3 sm:grid-cols-2"><Link href={`/invoice/${placed.id}?t=${placed.token}`} className="flex h-12 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">View GST invoice</Link><a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi Krust, I placed order ${placed.id} for ${formatInr(placed.total)}.`)}`} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#25d366] text-sm font-bold text-white"><WhatsAppIcon size={16} /> WhatsApp</a></div></div> :
    <form onSubmit={submit} className="px-5 py-7 sm:px-8">
      <div className="rounded-2xl border-2 border-krust/70 bg-white p-5"><div className="flex items-center justify-between"><h3 className="text-xl">Your order</h3><span className="badge bg-blush text-krust">{items} items</span></div><div className="mt-4 space-y-3">{resolved.map(({ line, product, variant }) => <div key={line.key} className="flex justify-between gap-3 text-xs"><span className="text-cocoa">{line.quantity} × {product.name} <span className="opacity-60">({variant.name})</span></span><span className="font-semibold">{formatInr(variant.price * line.quantity)}</span></div>)}{!resolved.length && <p className="text-xs text-cocoa">Your basket is empty.</p>}</div><div className="mt-4 border-t border-petal pt-4"><div className="flex justify-between text-xs text-cocoa"><span>Included GST</span><span>{formatInr(gst)}</span></div>{settings.deliveryFee > 0 && <div className="mt-1 flex justify-between text-xs text-cocoa"><span>Delivery</span><span>{formatInr(settings.deliveryFee)}</span></div>}<div className="mt-2 flex justify-between"><span className="font-semibold">Total</span><span className="font-display text-2xl">{formatInr(subtotal + settings.deliveryFee)}</span></div></div></div>
      <SectionTitle number="01" title="Delivery details" /><div className="grid gap-4 sm:grid-cols-2"><Field label="Full name" name="name" placeholder="Your name" required minLength={2} /><Field label="Phone number" name="phone" type="tel" placeholder="+91 98765 43210" required /><Field label="WhatsApp number" name="whatsapp" type="tel" placeholder="Same as phone" /><Field label="Email (optional)" name="email" type="email" placeholder="you@example.com" /><label className="sm:col-span-2"><span className="label">Delivery address</span><textarea name="address" required minLength={8} rows={3} placeholder="House / flat, street and area" className="input" /></label><Field label="Landmark" name="landmark" placeholder="Near metro station" /><Field label="Pincode" name="pincode" inputMode="numeric" pattern="[1-9][0-9]{5}" placeholder="600032" required /></div>
      <SectionTitle number="02" title="Delivery slot" /><div className="grid gap-4 sm:grid-cols-2"><Field label="Delivery date" name="date" type="date" min={today} defaultValue={today} required /><label><span className="label">Time slot</span><select name="slot" required className="input"><option>10:00 AM – 1:00 PM</option><option>2:00 PM – 5:00 PM</option><option>5:00 PM – 8:00 PM</option></select></label><label className="sm:col-span-2"><span className="label">Order note / cake message</span><textarea name="note" rows={2} placeholder="Anything the baker should know?" className="input" /></label></div>
      <SectionTitle number="03" title="Payment" /><div className="grid gap-3 sm:grid-cols-3">{([["UPI", "UPI QR", "Scan & pay"], ["ONLINE", "Online", "Card / netbanking"], ["PAY_ON_DELIVERY", "Pay on delivery", "Cash or UPI at door"]] as const).map(([method, title, copy]) => <button type="button" key={method} onClick={() => setPayment(method)} className={`rounded-xl border-2 p-4 text-left transition ${payment === method ? "border-krust bg-blush" : "border-petal bg-white"}`}><span className="block text-xs font-bold">{title}</span><span className="mt-1 block text-[10px] text-cocoa">{copy}</span></button>)}</div>
      {error && <p className="mt-6 rounded-xl border border-krust/30 bg-blush p-4 text-xs font-semibold text-krust-deep">{error}</p>}
      <button type="submit" disabled={submitting || !resolved.length || subtotal < settings.minimumOrder} className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-full bg-krust text-sm font-bold text-white shadow-[0_12px_32px_rgba(215,38,61,.28)] transition hover:bg-krust-deep disabled:opacity-60">{submitting ? "Placing order…" : <>Place order · {formatInr(subtotal + settings.deliveryFee)} <ShieldCheck size={18} /></>}</button>
      {subtotal < settings.minimumOrder && <p className="mt-3 text-center text-xs font-semibold text-krust">Minimum order for delivery is {formatInr(settings.minimumOrder)}.</p>}
      <p className="mt-3 text-center text-[10px] leading-4 text-cocoa">By placing this order, you agree to the delivery and cancellation policy. We never store card details.</p>
    </form>}
  </aside></div>;
}

function SectionTitle({ number, title }: { number: string; title: string }) { return <div className="mb-4 mt-9 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-krust text-[11px] font-bold text-white">{number}</span><h3 className="text-2xl">{title}</h3></div>; }
function Field({ label, ...inputProps }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label><span className="label">{label}</span><input {...inputProps} className="input" /></label>; }
