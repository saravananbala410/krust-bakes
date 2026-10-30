"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CakeSlice, Coffee, Cookie, Croissant, Gift, Hamburger, Layers, Pizza, Wheat, ArrowLeft, ArrowRight, Award, Check, ChefHat, ChevronDown, Clock3, Leaf, Mail, MapPin, Menu, Minus, PackageCheck, Phone, Plus, Quote, Search, ShieldCheck, ShoppingBag, Sparkles, Star, Truck, UserRound, CreditCard, Download, Loader2, X } from "lucide-react";
import { createContext, FormEvent, type MouseEvent, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { calculateInclusiveGst, formatInr } from "@/lib/gst";
import { useCartStore } from "@/lib/cart-store";
import { useAppStore } from "@/lib/app-store";
import { useCustomerStore } from "@/lib/customer-store";
import { payOnline } from "@/lib/razorpay-client";
import { downloadReceiptFor } from "@/lib/receipt-pdf";
import { galleryOf, sellableCatalog, type CarouselSlide, type Hamper, type PublicConfig } from "@/lib/store-core";
import { DiwaliGarland, FestiveLayer, HamperSection } from "./festive";
import type { Product } from "@/lib/types";
import { AccountContent, AccountSheet, GoogleButton } from "./customer-account";
import { PhotoCarousel } from "./photo-carousel";
import { useBackClose } from "@/lib/use-back-close";
import { socialIcons, socialLabels, WhatsAppIcon } from "./social-icons";

const HERO = "/brand/krust-hero.png";
const ConfigContext = createContext<PublicConfig | null>(null);
export type StorePage = "home" | "shop" | "story" | "orders" | "product";
const PageContext = createContext<StorePage>("home");
/** Where "order now" buttons point: the menu on this page, or the shop page. */
const useShopHref = () => { const page = useContext(PageContext); return page === "home" || page === "shop" ? "#menu" : "/shop"; };
const NAV: Array<[string, string]> = [["/shop", "Shop"], ["/#collections", "Collections"], ["/our-story", "Our story"], ["/orders", "My orders"], ["#visit", "Visit"]];
const useConfig = () => useContext(ConfigContext)!;
const noopSubscribe = () => () => {};
/** False during SSR and hydration, true afterwards: keeps the persisted cart from causing hydration mismatches. */
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);
const localToday = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

/** Cart totals against the live catalogue; lines for removed products are ignored. */
/** A small icon for each category, matched by name so categories added later get one too. */
const CATEGORY_ICONS: Array<[RegExp, typeof Wheat]> = [
  [/puff|pastry|flatbread|pita/i, Layers], [/tea ?cake/i, Coffee], [/cake|muffin|brownie/i, CakeSlice], [/biscuit|cookie/i, Cookie],
  [/roll|croissant/i, Croissant], [/bruschetta|pizza/i, Pizza], [/^buns?$|burger|pav/i, Hamburger], [/bread|loaf|bun/i, Wheat], [/hamper|gift/i, Gift],
];
const categoryIcon = (name: string) => CATEGORY_ICONS.find(([re]) => re.test(name))?.[1] ?? ChefHat;

function useCartMath() {
  const lines = useCartStore((state) => state.lines);
  const config = useConfig();
  const products = useMemo(() => sellableCatalog(config), [config]);
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

/** `initialCategory` comes from /shop?category=… so the shop opens pre-filtered. */
export function Storefront({ initialConfig, page = "home", initialCategory, productId }: { initialConfig: PublicConfig; page?: StorePage; initialCategory?: string; productId?: string }) {
  const live = useAppStore((state) => (state.loaded ? state.config : null));
  const refresh = useAppStore((state) => state.refresh);
  const refreshCustomer = useCustomerStore((state) => state.refresh);
  useEffect(() => { void refresh(); void refreshCustomer(); }, [refresh, refreshCustomer]);
  // Anonymous visit count for the dev admin's Visitors page: a random id, no personal data.
  useEffect(() => {
    let visitor = "";
    try {
      visitor = localStorage.getItem("krust-visitor") ?? "";
      if (!visitor) { visitor = crypto.randomUUID(); localStorage.setItem("krust-visitor", visitor); }
    } catch { return; }
    void fetch("/api/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitor, path: window.location.pathname }), keepalive: true }).catch(() => undefined);
  }, []);
  return <ConfigContext.Provider value={live ?? initialConfig}><PageContext.Provider value={page}><StorefrontPage page={page} initialCategory={initialCategory} productId={productId} /></PageContext.Provider></ConfigContext.Provider>;
}

function StorefrontPage({ page, initialCategory, productId }: { page: StorePage; initialCategory?: string; productId?: string }) {
  const config = useConfig();
  const { branding, settings, socialLinks } = config;
  const [category, setCategory] = useState(initialCategory ?? "All");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const mounted = useHydrated();
  const checkoutOpen = useCartStore((state) => state.checkoutOpen);
  const setCheckoutOpen = useCartStore((state) => state.setCheckoutOpen);
  const { items, subtotal } = useCartMath();
  const [hamperOpen, setHamperOpen] = useState(false);
  const [hamperFocus, setHamperFocus] = useState<Hamper | null>(null);
  const liveHampers = config.festive.enabled ? config.hampers.filter((h) => h.active) : [];
  const openHamper = (h: Hamper) => { setHamperFocus(h); setHamperOpen(true); };

  const activeCategories = config.categories.filter((item) => item.active);
  const activeNames = new Set(activeCategories.map((item) => item.name));
  const visible = config.products.filter((p) => p.active !== false && activeNames.has(p.category));
  const filtered = visible.filter((p) => (category === "All" || p.category === category) && `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(search.toLowerCase()));
  const featured = visible.filter((p) => p.featured).slice(0, 8);
  const cartItems = mounted ? items : 0;
  useScrollReveal(`${category}|${search}|${config.products.length}|${mounted}`);

  const pickCategory = (name: string) => { setCategory(name); document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" }); };
  const isActive = (href: string) => (href === "/shop" && page === "shop") || (href === "/our-story" && page === "story") || (href === "/orders" && page === "orders");

  return (
    <main className="min-h-screen overflow-x-hidden bg-cream pb-28">
      {branding.announcement && <div className="bg-krust px-4 py-2 text-center text-[11px] font-semibold tracking-[.2em] text-white uppercase">{branding.announcement}</div>}

      <header className="sticky top-0 z-40 border-b border-petal/70 bg-cream/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[78px] max-w-[1440px] items-center justify-between px-5 lg:px-10">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label={`${branding.storeName} home`}>
            <img src={branding.logoUrl} alt="" className="h-12 w-12 rounded-2xl object-contain shadow-[0_6px_18px_rgba(236,36,39,.18)]" />
            <div><img src={branding.wordmarkUrl} alt={branding.storeName} className="h-auto w-[150px] sm:w-[178px]" /><p className="hidden whitespace-nowrap text-[9px] font-semibold uppercase tracking-[.3em] text-cocoa sm:block">{branding.tagline}</p></div>
          </Link>
          <nav className="hidden items-center gap-6 whitespace-nowrap text-[13px] font-semibold uppercase tracking-[.14em] text-cocoa xl:flex 2xl:gap-8">
            {NAV.map(([href, label]) => <a key={href} href={href} className={`relative transition hover:text-krust after:absolute after:-bottom-1 after:left-0 after:h-px after:bg-krust after:transition-all hover:after:w-full ${isActive(href) ? "text-krust after:w-full" : "after:w-0"}`}>{label}</a>)}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <SocialRow links={socialLinks} className="hidden 2xl:flex" small />
            <MyOrdersButton />
            <AccountButton />
            <button onClick={() => setCheckoutOpen(true)} className="relative flex h-11 items-center gap-2 rounded-full bg-krust px-5 text-sm font-semibold text-white shadow-[0_10px_26px_rgba(236,36,39,.28)] transition hover:bg-krust-deep">
              <ShoppingBag size={17} /><span className="hidden sm:inline">Basket</span>
              {cartItems > 0 && <span key={cartItems} className="reveal rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-krust">{cartItems}</span>}
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" className="grid h-11 w-11 place-items-center rounded-full border border-petal bg-white xl:hidden"><Menu size={19} /></button>
          </div>
        </div>
        {menuOpen && <nav className="fade-in border-t border-petal bg-cream px-5 py-5 text-sm font-semibold xl:hidden"><div className="flex flex-col gap-4">{NAV.map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className={isActive(href) ? "text-krust" : ""}>{label}</a>)}<SocialRow links={socialLinks} small /></div></nav>}
      </header>
      {config.festive.enabled && <DiwaliGarland />}

      {page === "home" ? <Hero /> : page === "product" ? null : <PageBanner page={page} />}

      {page === "product" && productId && <ProductDetail productId={productId} />}

      {page === "orders" && <section className="mx-auto max-w-3xl px-5 py-10"><AccountContent clientId={settings.googleClientId} online={!!config.payments?.razorpay} /></section>}

      {page === "home" && <>

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
            const Icon = categoryIcon(cat.name);
            return (
              <button key={cat.id} onClick={() => pickCategory(cat.name)} data-reveal style={{ "--reveal-delay": `${(i % 5) * 70}ms` } as React.CSSProperties} className={`lift group relative overflow-hidden rounded-[22px] border border-white p-5 text-left ${tints[i % tints.length]}`}>
                <span className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white text-krust shadow-[0_6px_16px_rgba(236,36,39,.15)] transition duration-500 group-hover:rotate-12 group-hover:scale-110 group-hover:bg-krust group-hover:text-white"><Icon size={20} strokeWidth={2} /></span>
                <span className="badge bg-white/80 text-krust">{count} items</span>
                <p className="mt-8 font-display text-xl leading-tight sm:text-2xl">{cat.name}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[.16em] text-krust">Shop <ArrowRight size={13} className="transition group-hover:translate-x-1" /></span>
              </button>
            );
          })}
        </div>
      </section>

      </>}

      {(page === "home" || page === "shop") && liveHampers.length > 0 && <HamperSection festive={config.festive} hampers={liveHampers} onOpen={openHamper} />}

      {(page === "home" || page === "shop") && featured.length > 0 && <section className="mx-auto max-w-[1440px] px-5 pt-20 lg:px-10 lg:pt-24">
        <SectionHeading eyebrow="Bestsellers" title="The ones they come back for" />
        <div className="no-scrollbar -mx-5 mt-10 flex snap-x gap-4 overflow-x-auto px-5 pb-4">
          {featured.map((p) => <div key={p.id} className="w-[200px] shrink-0 snap-start sm:w-[290px]"><ProductCard product={p} /></div>)}
        </div>
      </section>}

      {(page === "home" || page === "shop") && <section id="menu" className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading eyebrow="The daily bake" title="Choose your favourites." copy="All prices include GST. Pick a size, set the quantity and your total updates instantly." />
          <label className="flex h-12 w-full items-center gap-3 rounded-full border border-petal bg-white px-5 shadow-sm transition focus-within:border-krust lg:w-80"><Search size={17} className="text-cocoa" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the bake…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-cocoa/60" /></label>
        </div>
        <div className="no-scrollbar mt-10 flex gap-2 overflow-x-auto pb-2">
          {["All", ...activeCategories.map((c) => c.name)].map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-5 py-2.5 text-[13px] font-semibold transition ${category === item ? "border-krust bg-krust text-white shadow-[0_8px_20px_rgba(236,36,39,.25)]" : "border-petal bg-white text-cocoa hover:border-krust hover:text-krust"}`}>{item}</button>)}
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((product, i) => <div key={product.id} data-reveal style={{ "--reveal-delay": `${(i % 4) * 60}ms` } as React.CSSProperties}><ProductCard product={product} /></div>)}
        </div>
        {filtered.length === 0 && <div className="mt-8 rounded-3xl border border-dashed border-petal py-20 text-center text-sm text-cocoa">Nothing matched that search. Try another bake.</div>}
      </section>}

      {(page === "home" || page === "story") && <>

      <StoryCarousel slides={config.slides.filter((s) => s.active)} />

      <StorySection />

      <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28">
        <SectionHeading eyebrow="How it works" title="From our oven to your table" center />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {([[ShoppingBag, "Pick your bakes", "Browse today's menu and add favourites to your basket."], [Clock3, "Choose a date", "Pick the delivery day that suits you."], [ChefHat, "We bake fresh", "Your order is baked and packed the same morning."], [Truck, "Doorstep delivery", "Delivered warm with a GST invoice for every order."]] as const).map(([Icon, title, copy], i) => (
            <div key={title} data-reveal style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties} className="lift relative rounded-[26px] border border-petal bg-white p-7">
              <span className="font-display absolute right-6 top-5 text-5xl text-petal">0{i + 1}</span>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blush text-krust"><Icon size={21} /></span>
              <p className="mt-6 font-display text-2xl">{title}</p>
              <p className="mt-2 text-sm leading-6 text-cocoa">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <Reviews />
      </>}

      {page === "home" && <>

      <section className="overflow-hidden border-y border-petal bg-white py-9">
        <p className="eyebrow mb-5 text-center">Trusted by</p>
        <div className="marquee-track flex items-center gap-16 font-display text-3xl text-cocoa/60">{[0, 1].flatMap((n) => ["Taj Hotels", "Beachville", "Nuts & Spices", "Double Roti", "Kamala · Kasi · Vetri"].map((name) => <span key={`${n}-${name}`} className="flex items-center gap-16">{name}<Sparkles size={16} className="text-krust/50" /></span>))}</div>
      </section>

      {config.faqs.some((f) => f.active) && <section className="mx-auto max-w-[980px] px-5 py-20 lg:py-28">
        <SectionHeading eyebrow="Good to know" title="Questions, answered" center />
        <div className="mt-10 space-y-3">
          {config.faqs.filter((f) => f.active).map((f) => (
            <details key={f.id} data-reveal className="group rounded-2xl border border-petal bg-white px-6 py-5 open:border-krust open:shadow-[0_14px_40px_-20px_rgba(236,36,39,.4)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl">{f.question}<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blush text-krust transition group-open:rotate-45"><Plus size={16} /></span></summary>
              <p className="mt-3 text-sm leading-7 text-cocoa">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>}
      </>}

      <Footer />

      {socialLinks.whatsapp && <WhatsAppFab href={socialLinks.whatsapp} raised={cartItems > 0} />}

      {cartItems > 0 && <div className="reveal fixed inset-x-0 bottom-0 z-40 border-t-2 border-krust bg-white/95 px-4 py-3 shadow-[0_-18px_50px_rgba(236,36,39,.14)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-5"><span className="grid h-11 w-11 place-items-center rounded-full bg-krust text-white"><ShoppingBag size={19} /></span><div><p className="text-[11px] text-cocoa">{cartItems} item{cartItems === 1 ? "" : "s"} in your basket</p><p className="font-display text-xl">{formatInr(subtotal)}</p></div></div>
          <div className="hidden text-right md:block">{subtotal < settings.minimumOrder ? <><p className="text-xs font-semibold text-krust">Add {formatInr(settings.minimumOrder - subtotal)} for delivery</p><div className="mt-1.5 h-1.5 w-48 overflow-hidden rounded-full bg-blush"><div className="h-full rounded-full bg-krust transition-all" style={{ width: `${Math.min(100, (subtotal / settings.minimumOrder) * 100)}%` }} /></div></> : <p className="flex items-center gap-2 text-xs font-semibold text-[#2f7a4a]"><Check size={14} /> Delivery minimum reached</p>}</div>
          <button onClick={() => setCheckoutOpen(true)} disabled={subtotal < settings.minimumOrder} className="flex h-12 items-center gap-2 rounded-full bg-krust px-6 text-sm font-bold text-white transition hover:bg-krust-deep disabled:cursor-not-allowed disabled:bg-petal disabled:text-cocoa">Checkout <ArrowRight size={16} /></button>
        </div>
      </div>}
      {checkoutOpen && <CheckoutSheet onClose={() => setCheckoutOpen(false)} />}
      <FestiveLayer festive={config.festive} hampers={liveHampers} open={hamperOpen} setOpen={setHamperOpen} focus={hamperFocus} setFocus={setHamperFocus} raised={cartItems > 0} />
      <AccountSheetHost clientId={settings.googleClientId} online={!!config.payments?.razorpay} />
    </main>
  );
}

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase(); }

/** Social proof: rating summary card plus a rotating spotlight review. */
function Reviews() {
  const { testimonials, branding } = useConfig();
  const shopHref = useShopHref();
  const items = testimonials.filter((t) => t.active);
  const [index, setIndex] = useState(0);
  const count = items.length;
  useEffect(() => {
    if (count < 2) return;
    const timer = setTimeout(() => setIndex((v) => (v + 1) % count), 7000);
    return () => clearTimeout(timer);
  }, [index, count]);
  if (!count) return null;
  const current = items[index % count];
  return (
    <section id="reviews" className="relative overflow-hidden bg-[#f7ebd0] py-20 lg:py-28">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-krust/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-white/60 blur-3xl" />
      <div className="relative mx-auto max-w-[1280px] px-5 lg:px-10">
        <SectionHeading eyebrow="Kind words" title="Loved across Chennai" center />
        <div className="mt-12 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <div data-reveal className="relative flex flex-col justify-between overflow-hidden rounded-[32px] bg-krust p-8 text-white shadow-[0_30px_70px_-25px_rgba(236,36,39,.7)] sm:p-10">
            <Quote size={120} className="absolute -right-4 -top-4 text-white/10" />
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.24em] text-white/80">Customer rating</p>
              <div className="mt-4 flex items-end gap-3"><p className="font-display text-7xl font-black leading-none sm:text-8xl">{branding.ratingValue}</p><p className="mb-2 text-lg font-bold text-white/80">/ 5</p></div>
              <div className="mt-4 flex gap-1">{Array.from({ length: 5 }, (_, s) => <Star key={s} size={22} fill="currentColor" className="text-[#ffd45c]" />)}</div>
              <p className="mt-4 text-lg font-bold">{branding.ratingCount}</p>
            </div>
            <div className="mt-10">
              <div className="flex -space-x-3">{items.slice(0, 5).map((t) => <span key={t.id} className="grid h-11 w-11 place-items-center rounded-full border-2 border-krust bg-white text-xs font-extrabold text-krust">{initials(t.name)}</span>)}</div>
              <a href={shopHref} className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-extrabold text-krust transition hover:-translate-y-0.5">Taste what they love <ArrowRight size={16} /></a>
            </div>
          </div>
          <div data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties} className="flex flex-col rounded-[32px] border-[3px] border-krust bg-white p-8 shadow-[0_30px_70px_-35px_rgba(43,26,20,.45)] sm:p-12">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-1 text-krust">{Array.from({ length: current.rating ?? 5 }, (_, s) => <Star key={s} size={18} fill="currentColor" />)}</div>
              <span className="badge bg-blush text-krust"><Check size={12} /> Verified customer</span>
            </div>
            <blockquote key={current.id} className="fade-in mt-8 flex-1 font-display text-2xl font-bold leading-snug text-ink sm:text-[2.1rem] sm:leading-[1.3]">“{current.quote}”</blockquote>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t border-petal pt-6">
              <div key={`p-${current.id}`} className="fade-in flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-full bg-krust text-base font-extrabold text-white">{initials(current.name)}</span><div><p className="text-lg font-extrabold">{current.name}</p><p className="text-xs font-bold uppercase tracking-[.16em] text-cocoa">{current.role}</p></div></div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIndex((v) => (v - 1 + count) % count)} aria-label="Previous review" className="grid h-11 w-11 place-items-center rounded-full border-2 border-krust text-krust transition hover:bg-blush"><ArrowLeft size={17} /></button>
                <button onClick={() => setIndex((v) => (v + 1) % count)} aria-label="Next review" className="grid h-11 w-11 place-items-center rounded-full bg-krust text-white transition hover:bg-krust-deep"><ArrowRight size={17} /></button>
              </div>
            </div>
            <div className="mt-6 flex gap-2">{items.map((t, i) => <button key={t.id} onClick={() => setIndex(i)} aria-label={`Show review from ${t.name}`} className={`h-1.5 rounded-full transition-all ${i === index % count ? "w-10 bg-krust" : "w-4 bg-petal"}`} />)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Accepts a Google Maps embed URL or pasted <iframe> code; falls back to the address. */
function mapEmbedSrc(raw: string, address: string) {
  const src = raw.match(/src=["']([^"']+)["']/)?.[1] ?? raw.trim();
  if (/^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/.test(src) || /^https:\/\/maps\.google\.[a-z.]+\/maps\?.*output=embed/.test(src)) return src;
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`;
}

function Footer() {
  const { branding, settings, socialLinks } = useConfig();
  const tel = `tel:${branding.phone.replace(/\s/g, "")}`;
  return (
    <footer id="visit" className="border-t-4 border-krust bg-[#f7ebd0] px-5 pb-8 pt-16 text-ink lg:px-10">
      <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[1fr_.6fr_1.3fr]">
        <div>
          <img src={branding.wordmarkUrl} alt={branding.storeName} className="w-[220px]" />
          <p className="mt-4 max-w-sm text-sm font-medium leading-7 text-cocoa">Breads, tea cakes, cookies, brownies and savouries, baked fresh in Guindy, Chennai.</p>
          <SocialRow links={socialLinks} className="mt-6" />
          <div className="mt-8 space-y-3 text-sm font-semibold">
            <a href={tel} className="flex items-center gap-3 hover:text-krust"><span className="grid h-9 w-9 place-items-center rounded-full bg-white text-krust"><Phone size={15} /></span>{branding.phone}</a>
            <a href={`mailto:${branding.email}`} className="flex items-center gap-3 hover:text-krust"><span className="grid h-9 w-9 place-items-center rounded-full bg-white text-krust"><Mail size={15} /></span>{branding.email}</a>
          </div>
        </div>
        <div><p className="eyebrow">Explore</p><div className="mt-5 flex flex-col gap-3 text-sm font-semibold text-cocoa">{[["/shop", "Shop the bake"], ["/#collections", "Collections"], ["/our-story", "Our story"], ["/#reviews", "Reviews"], ["#visit", "Visit us"]].map(([h, l]) => <a key={h} href={h} className="transition hover:translate-x-1 hover:text-krust">{l}</a>)}</div></div>
        <div className="overflow-hidden rounded-[28px] border-[3px] border-krust bg-white shadow-[0_24px_60px_-30px_rgba(236,36,39,.55)]">
          <iframe title="Krust on Google Maps" src={mapEmbedSrc(branding.mapsEmbedUrl, branding.address)} className="h-56 w-full border-0 sm:h-64" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-krust text-white"><MapPin size={17} /></span><div><p className="text-sm font-extrabold">Krust bakehouse</p><p className="text-xs font-medium leading-5 text-cocoa">{branding.address}</p></div></div>
            <a href={branding.mapsUrl} target="_blank" rel="noreferrer" className="action shrink-0 justify-center">Get directions <ArrowRight size={14} /></a>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-[1440px] flex-col gap-2 border-t border-krust/20 pt-5 text-[11px] font-semibold text-cocoa sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} {branding.storeName}. Made fresh in Chennai.</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">{[["/terms", "Terms"], ["/privacy", "Privacy"], ["/refund-policy", "Refunds & cancellation"], ["/shipping-policy", "Shipping & delivery"], ["/contact", "Contact"]].map(([h, l]) => <Link key={h} href={h} className="hover:text-krust">{l}</Link>)}</nav>
        <p>Prices include GST{settings.gstin && ` · GSTIN ${settings.gstin}`}{settings.fssai && ` · FSSAI ${settings.fssai}`}</p>
      </div>
    </footer>
  );
}

/** Floating WhatsApp button with a small connected label for bulk orders. */
function WhatsAppFab({ href, raised }: { href: string; raised: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`fixed right-4 z-40 flex flex-col items-end transition-all sm:right-6 ${raised ? "bottom-28" : "bottom-6"}`}>
      {open && <div className="reveal relative mb-3 flex items-center gap-2 rounded-full border-2 border-[#25d366] bg-white py-2 pl-4 pr-2 shadow-[0_16px_36px_-14px_rgba(37,211,102,.6)]">
        <a href={href} target="_blank" rel="noreferrer" className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#1a9e4b]">Bulk &amp; custom orders</a>
        <button onClick={() => setOpen(false)} aria-label="Hide label" className="grid h-6 w-6 place-items-center rounded-full text-cocoa hover:bg-cream"><X size={12} /></button>
        <span className="absolute -bottom-[9px] right-5 h-4 w-4 rotate-45 border-b-2 border-r-2 border-[#25d366] bg-white" />
      </div>}
      <a href={href} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp for bulk and custom orders" className="pulse-ring grid h-14 w-14 place-items-center rounded-full bg-[#25d366] text-white shadow-xl transition hover:scale-105"><WhatsAppIcon size={27} /></a>
    </div>
  );
}

function StorySection() {
  const { story } = useConfig();
  return (
    <section id="story" className="pastel-wash">
      <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 py-20 lg:grid-cols-[.95fr_1.05fr] lg:px-10 lg:py-28">
        <div data-reveal className="relative mx-auto w-full max-w-[520px]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[36px] border-[5px] border-krust shadow-[0_30px_80px_-30px_rgba(176,20,24,.5)]"><img src={story.imageUrl || HERO} alt="Our story" className={`ken-burns h-full w-full object-cover ${story.imageUrl === HERO ? "object-[78%_50%]" : ""}`} /></div>
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

function PageBanner({ page }: { page: Exclude<StorePage, "home" | "product"> }) {
  const copy = page === "shop"
    ? { eyebrow: "The daily bake", title: "Shop", accent: "fresh.", text: "Breads, tea cakes, cookies, brownies and savouries, baked this morning. All prices include GST." }
    : page === "orders"
      ? { eyebrow: "Your Krust account", title: "Your", accent: "orders.", text: "Every order you've placed, its live status, receipts, and the option to pay online." }
      : { eyebrow: "From Melbourne to Madras", title: "Our", accent: "story.", text: "Sixteen years at the bench, one standard: honest ingredients, patient technique and everything made fresh." };
  return (
    <section className="pastel-wash relative isolate overflow-hidden border-b border-petal/70">
      <div className="grain absolute inset-0 -z-10 opacity-60" />
      <div className="reveal mx-auto max-w-[1440px] px-5 py-16 lg:px-10 lg:py-20">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.16em] text-cocoa hover:text-krust"><ArrowLeft size={14} /> Home</Link>
        <p className="eyebrow mt-6">{copy.eyebrow}</p>
        <h1 className="mt-3 text-[clamp(2.8rem,6vw,5.2rem)] leading-[1]">{copy.title} <span className="font-hero shimmer-text">{copy.accent}</span></h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-cocoa">{copy.text}</p>
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
            <a href="#menu" className="group flex h-14 items-center gap-3 rounded-full bg-krust px-7 text-sm font-bold text-white shadow-[0_16px_40px_rgba(236,36,39,.3)] transition hover:bg-krust-deep">Order from today&apos;s bake <ArrowRight size={17} className="transition group-hover:translate-x-1" /></a>
            <Link href="/our-story" className="flex h-14 items-center rounded-full border-2 border-krust bg-white/70 px-7 text-sm font-bold text-krust backdrop-blur transition hover:bg-white">Meet the baker</Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">{["No MSG", "No bromides", "Eggless options", "No artificial colours"].map((t) => <span key={t} className="badge border border-krust/20 bg-white text-krust"><Check size={12} /> {t}</span>)}</div>
        </div>
        <div className="relative mx-auto w-full max-w-[560px]">
          <div className="reveal relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[40px] border-[6px] border-krust bg-peach shadow-[0_40px_90px_-30px_rgba(176,20,24,.55)]" style={{ animationDelay: "120ms" }}>
            <img src={branding.heroImage || HERO} alt="Freshly baked artisan breads and pastries" className="ken-burns h-full w-full object-cover" />
          </div>
          <div className="soft-float absolute -left-3 top-16 rounded-2xl border-2 border-krust bg-white px-4 py-3 shadow-xl sm:-left-10"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-cocoa">Baker&apos;s note</p><p className="font-display text-lg italic">“Patience is an ingredient.”</p></div>
          <div className="soft-float absolute -right-2 bottom-14 grid h-28 w-28 place-items-center rounded-full bg-krust text-center text-white shadow-xl sm:-right-6" style={{ animationDelay: "1.5s" }}><div><p className="font-display text-3xl leading-none">100%</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[.16em]">Baked<br />fresh</p></div></div>
        </div>
      </div>
    </section>
  );
}

/** Sign-in and account only; orders have their own button. */
function AccountButton() {
  const { customer, setAccountOpen } = useCustomerStore();
  const label = customer ? customer.name.split(" ")[0] : "Sign in";
  return <button onClick={() => setAccountOpen(true)} aria-label={customer ? "Your account" : "Sign in"} className="flex h-11 items-center gap-2 rounded-full border-2 border-krust bg-white pl-1 pr-1 text-sm font-extrabold text-krust transition hover:bg-blush sm:pr-4">
    {customer?.picture ? <img src={customer.picture} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-blush"><UserRound size={16} /></span>}
    <span className="hidden max-w-24 truncate sm:inline">{label}</span>
  </button>;
}

function MyOrdersButton() {
  return <Link href="/orders" aria-label="My orders" className="flex h-11 items-center gap-2 rounded-full border-2 border-krust bg-white px-2.5 text-sm font-extrabold text-krust transition hover:bg-blush sm:px-4">
    <PackageCheck size={17} /><span className="hidden whitespace-nowrap sm:inline">My orders</span>
  </Link>;
}

function AccountSheetHost({ clientId, online }: { clientId: string; online: boolean }) {
  const open = useCustomerStore((state) => state.accountOpen);
  return open ? <AccountSheet clientId={clientId} online={online} /> : null;
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

/** Full product page: photo gallery, sizes, quantity, details, and more from the same category. */
function ProductDetail({ productId }: { productId: string }) {
  const config = useConfig();
  const product = config.products.find((p) => p.id === productId);
  const [variantId, setVariantId] = useState(product?.variants[0]?.id);
  const [qty, setQty] = useState(1);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const inCart = useCartStore((state) => state.lines.find((l) => l.key === `${productId}:${variantId}`)?.quantity ?? 0);
  const mounted = useHydrated();
  if (!product) return <section className="mx-auto max-w-3xl px-5 py-24 text-center"><h1 className="text-3xl">This product isn&apos;t available</h1><Link href="/shop" className="action mt-6">Back to the shop</Link></section>;
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const photos = galleryOf(product);
  const related = config.products.filter((p) => p.id !== product.id && p.active !== false && p.category === product.category).slice(0, 4);
  const add = () => { setQuantity(product.id, variant.id, (mounted ? inCart : 0) + qty); toast.success(`${qty} × ${product.name} added to basket`, { description: `${variant.name} · ${formatInr(variant.price * qty)}` }); };
  return <>
    <section className="mx-auto max-w-[1200px] px-5 py-8 lg:px-10 lg:py-12">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-cocoa"><Link href="/" className="hover:text-krust">Home</Link><span>/</span><Link href={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-krust">{product.category}</Link><span>/</span><span className="text-ink">{product.name}</span></nav>
      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="lg:sticky lg:top-24 lg:self-start">
          {photos.length && !(photos.length === 1 && photos[0] === HERO)
            ? <PhotoCarousel photos={photos} alt={product.name} thumbnails className="[&>div:first-child]:aspect-square [&>div:first-child]:border [&>div:first-child]:border-petal" rounded="rounded-[26px]" />
            : <div className="group relative aspect-square overflow-hidden rounded-[26px] border border-petal bg-peach"><ProductImage product={product} /></div>}
        </div>
        <div>
          <div className="flex flex-wrap gap-2"><span className="badge bg-blush text-krust">{product.category}</span><span className={`badge ${product.eggless ? "bg-mint text-[#2f7a4a]" : "bg-butter text-[#8a5a13]"}`}>{product.eggless ? "Eggless" : "Contains egg"}</span>{product.featured && <span className="badge bg-krust text-white"><Star size={10} fill="currentColor" /> Bestseller</span>}</div>
          <h1 className="mt-4 text-4xl leading-tight sm:text-5xl">{product.name}</h1>
          <p className="mt-4 font-display text-4xl font-extrabold text-krust">{formatInr(variant.price)}</p>
          <p className="mt-1 text-xs font-semibold text-cocoa">Inclusive of {product.gstRate}% GST · {variant.name}</p>
          {product.variants.length > 1 && <div className="mt-6"><p className="label">Choose size</p><div className="flex flex-wrap gap-2">{product.variants.map((v) => <button key={v.id} onClick={() => setVariantId(v.id)} className={`rounded-xl border-2 px-4 py-2.5 text-left text-sm font-bold transition ${v.id === variant.id ? "border-krust bg-blush text-krust" : "border-petal bg-white text-ink hover:border-krust"}`}>{v.name}<span className="block text-xs font-semibold text-cocoa">{formatInr(v.price)}</span></button>)}</div></div>}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex h-13 items-center rounded-xl border-2 border-petal bg-white"><button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer" className="grid h-12 w-12 place-items-center"><Minus size={16} /></button><span className="w-10 text-center text-base font-extrabold">{qty}</span><button onClick={() => setQty((q) => Math.min(100, q + 1))} aria-label="More" className="grid h-12 w-12 place-items-center"><Plus size={16} /></button></div>
            <button onClick={add} className="action h-13 flex-1 justify-center text-sm"><ShoppingBag size={17} /> Add to basket · {formatInr(variant.price * qty)}</button>
          </div>
          {mounted && inCart > 0 && <p className="mt-3 flex items-center gap-2 text-xs font-bold text-[#2f7a4a]"><Check size={14} /> {inCart} in your basket</p>}
          {product.description && <div className="mt-8"><h2 className="text-2xl">About this bake</h2><p className="mt-2 whitespace-pre-line text-sm leading-7 text-ink/85">{product.description}</p></div>}
          <div className="mt-8 overflow-hidden rounded-2xl border border-petal bg-white">
            {([["Size", product.variants.map((v) => v.name).join(", ")], ["Egg", product.eggless ? "Eggless" : "Contains egg"], ["Category", product.category], ["GST", `${product.gstRate}% (included in price)`], ["HSN code", product.hsn]] as const).map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-petal/60 px-5 py-3 text-sm last:border-0"><span className="text-cocoa">{k}</span><span className="text-right font-semibold">{v}</span></div>)}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex gap-3 rounded-2xl bg-mint/60 p-4 text-xs"><Truck size={18} className="shrink-0 text-[#2f7a4a]" /><span><b className="block text-sm">Fresh delivery in Chennai</b>Home delivery on orders of {formatInr(config.settings.minimumOrder)} or more</span></div>
            <div className="flex gap-3 rounded-2xl bg-butter/70 p-4 text-xs"><ChefHat size={18} className="shrink-0 text-[#8a5a13]" /><span><b className="block text-sm">Baked fresh daily</b>No MSG, no artificial colours</span></div>
          </div>
        </div>
      </div>
    </section>
    {related.length > 0 && <section className="mx-auto max-w-[1440px] px-5 pb-20 lg:px-10"><SectionHeading eyebrow="More to love" title={`More from ${product.category}`} /><div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div></section>}
  </>;
}

function ProductCard({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const quantity = useCartStore((state) => state.lines.find((line) => line.key === `${product.id}:${variantId}`)?.quantity ?? 0);
  const mounted = useHydrated();
  const router = useRouter();
  const variant = product.variants.find((item) => item.id === variantId) ?? product.variants[0];
  if (!variant) return null;
  // Anywhere on the card opens the product, except the size picker and basket controls.
  const open = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("a, button, select, input")) router.push(`/product/${product.id}`); };
  const qty = mounted ? quantity : 0;
  const add = () => { setQuantity(product.id, variant.id, 1); toast.success(`${product.name} added to basket`); };
  return (
    <article onClick={open} className="lift group flex h-full cursor-pointer flex-col overflow-hidden rounded-[20px] border border-petal bg-white sm:rounded-[26px]">
      <Link href={`/product/${product.id}`} aria-label={`View ${product.name}`} className="relative block h-36 overflow-hidden bg-peach sm:h-52">
        <ProductImage product={product} />
        {galleryOf(product).length > 1 && <span className="badge absolute bottom-2 right-2 bg-white/90 !px-2 !text-[9px] text-ink">{galleryOf(product).length} photos</span>}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5 sm:left-4 sm:top-4 sm:gap-2">
          <span className={`badge !px-2 !text-[8px] sm:!px-[.7rem] sm:!text-[10px] ${product.eggless ? "bg-mint text-[#2f7a4a]" : "bg-butter text-[#8a5a13]"}`}>{product.eggless ? "Eggless" : "Egg"}</span>
          {product.featured && <span className="badge !px-2 !text-[8px] bg-krust text-white sm:!px-[.7rem] sm:!text-[10px]"><Star size={10} fill="currentColor" /> <span className="hidden sm:inline">Bestseller</span></span>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <p className="text-[9px] font-extrabold uppercase tracking-[.18em] text-krust sm:text-[10px]">{product.category}</p>
        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4"><Link href={`/product/${product.id}`} className="hover:text-krust"><h3 className="text-[15px] leading-snug sm:text-2xl sm:leading-tight">{product.name}</h3></Link><p className="shrink-0 font-display text-lg font-extrabold text-krust sm:text-xl">{formatInr(variant.price)}</p></div>
        <p className="mt-2 hidden min-h-10 text-xs leading-5 text-cocoa sm:block">{product.description}</p>
        <div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:gap-3 sm:pt-5">
          <div className="relative min-w-0 flex-1"><select value={variant.id} onChange={(e) => setVariantId(e.target.value)} aria-label={`Select ${product.name} size`} className="h-9 w-full appearance-none rounded-lg border border-petal bg-cream px-2.5 pr-7 text-[11px] font-bold outline-none focus:border-krust sm:h-11 sm:rounded-xl sm:px-3 sm:text-xs">{product.variants.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatInr(item.price)}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cocoa" /></div>
          {qty === 0 ? <button onClick={add} className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-krust px-5 text-xs font-extrabold text-white transition hover:bg-krust-deep sm:h-11 sm:rounded-xl"><Plus size={14} /> Add</button> : <div className="flex h-9 items-center justify-between rounded-lg bg-krust text-white sm:h-11 sm:rounded-xl"><button onClick={() => setQuantity(product.id, variant.id, qty - 1)} aria-label="Decrease quantity" className="grid h-full w-10 place-items-center"><Minus size={14} /></button><input aria-label="Quantity" inputMode="numeric" value={qty} onChange={(e) => setQuantity(product.id, variant.id, Math.min(100, Math.max(0, Number(e.target.value) || 0)))} className="w-7 bg-transparent text-center text-sm font-extrabold outline-none" /><button onClick={() => setQuantity(product.id, variant.id, qty + 1)} aria-label="Increase quantity" className="grid h-full w-10 place-items-center"><Plus size={14} /></button></div>}
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
  const shopHref = useShopHref();
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
        <article key={slide.id} className="grid overflow-hidden rounded-[34px] border-[5px] border-krust bg-white shadow-[0_34px_80px_-30px_rgba(176,20,24,.45)] lg:grid-cols-[1.05fr_.95fr]">
          <div className="relative min-h-[300px] overflow-hidden bg-peach sm:min-h-[400px]"><img src={slide.imageUrl || HERO} alt={slide.title} className="slide-image absolute inset-0 h-full w-full object-cover" /><span className="badge absolute left-5 top-5 bg-krust text-white">{String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</span></div>
          <div className="slide-copy flex items-center border-t-[5px] border-krust p-8 sm:p-12 lg:border-l-[5px] lg:border-t-0 lg:p-16">
            <div>
              <p className="eyebrow">{slide.eyebrow}</p>
              <h3 className="mt-4 text-4xl font-bold leading-[1.05] sm:text-5xl">{slide.title}</h3>
              <div className="gold-rule my-6 w-28" />
              <p className="max-w-lg text-base leading-8 text-cocoa">{slide.copy}</p>
              {slide.ctaLabel && <a href={shopHref} className="action mt-8">{slide.ctaLabel} <ArrowRight size={15} /></a>}
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
  const { settings, socialLinks, payments } = useConfig();
  const online = !!payments?.razorpay;
  const needsSignIn = !!settings.googleClientId;
  const clear = useCartStore((state) => state.clear);
  const { customer, lastDetails, refresh: refreshCustomer, setAccountOpen } = useCustomerStore();
  const [step, setStep] = useState<"details" | "success">("details");
  type Method = "RAZORPAY" | "UPI" | "ONLINE" | "PAY_ON_DELIVERY";
  const [payment, setPayment] = useState<Method>(online ? "RAZORPAY" : "UPI");
  const [payState, setPayState] = useState<"none" | "paying" | "paid" | "unpaid">("none");
  const [payError, setPayError] = useState("");
  const methods: Array<[Method, string, string]> = online
    ? [["RAZORPAY", "Pay online", "UPI, cards, net banking, wallets"], ["PAY_ON_DELIVERY", "Pay on delivery", "Cash or UPI at door"]]
    : [["UPI", "UPI QR", "Scan & pay"], ["ONLINE", "Online", "Card / netbanking"], ["PAY_ON_DELIVERY", "Pay on delivery", "Cash or UPI at door"]];

  async function pay(order: { id: string; token: string }) {
    setPayState("paying"); setPayError("");
    const result = await payOnline(order.id, order.token);
    if (result.status === "paid") { setPayState("paid"); toast.success("Payment received. Thank you!"); }
    else { setPayState("unpaid"); if (result.status === "failed") setPayError(result.message); }
    void refreshCustomer();
  }
  const [placed, setPlaced] = useState<{ id: string; token: string; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [today] = useState(localToday);
  useBackClose(true, onClose);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const field = (k: string) => String(data.get(k) ?? "").trim();
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        customer: field("name"), phone: field("phone"), whatsapp: field("whatsapp"), email: field("email"), address: field("address"), landmark: field("landmark"), pincode: field("pincode"),
        deliveryDate: field("date"), paymentMethod: payment, note: field("note"),
        lines: resolved.map(({ line }) => ({ productId: line.productId, variantId: line.variantId, quantity: line.quantity })),
      }) });
      const body = (await response.json()) as { id: string; token: string; total: number; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not place the order");
      setPlaced(body); clear(); setStep("success"); void refreshCustomer();
      if (payment === "RAZORPAY") void pay(body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const waNumber = socialLinks.whatsapp.match(/wa\.me\/(\d+)/)?.[1] ?? "919840477330";
  return <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Checkout"><button onClick={onClose} className="absolute inset-0 cursor-default" aria-label="Close checkout" /><aside className="relative h-full w-full max-w-[610px] overflow-y-auto bg-cream shadow-2xl" style={{ animation: "slide-in-right .45s cubic-bezier(.2,.8,.2,1) both" }}>
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-petal bg-cream/95 px-5 py-5 backdrop-blur sm:px-8"><div><p className="eyebrow">Secure order</p><h2 className="text-3xl">{step === "details" ? "Checkout" : "Order confirmed"}</h2></div><button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-petal bg-white" aria-label="Close"><X size={18} /></button></div>
    {step === "success" && placed ? <div className="reveal flex min-h-[75vh] flex-col items-center justify-center px-7 text-center"><div className="pulse-ring grid h-20 w-20 place-items-center rounded-full bg-krust text-white"><Check size={36} /></div><p className="eyebrow mt-7">Order {placed.id}</p><h3 className="mt-3 text-5xl leading-none">Your bake is <span className="font-hero text-krust">booked.</span></h3><p className="mt-5 max-w-md text-sm leading-6 text-cocoa">We&apos;ve received your order. The bakery will confirm your delivery shortly on WhatsApp.</p><div className="mt-7 w-full max-w-sm rounded-2xl border-2 border-krust bg-white p-5 text-left"><div className="flex justify-between text-sm"><span className="text-cocoa">Order total</span><span className="font-bold">{formatInr(placed.total)}</span></div><div className="mt-3 flex justify-between text-sm"><span className="text-cocoa">Payment</span><span className="font-semibold">{payment === "PAY_ON_DELIVERY" ? "Pay on delivery" : payment === "RAZORPAY" ? (payState === "paid" ? "Paid online" : payState === "paying" ? "Waiting for payment…" : "Not paid yet") : payment}</span></div></div>
    {payment === "RAZORPAY" && payState === "paid" && <p className="mt-4 flex items-center gap-2 rounded-full bg-mint px-4 py-2 text-xs font-bold text-[#2f7a4a]"><Check size={14} /> Payment received</p>}
    {payment === "RAZORPAY" && payState === "paying" && <p className="mt-4 flex items-center gap-2 text-xs font-bold text-cocoa"><Loader2 size={14} className="animate-spin" /> Complete the payment in the Razorpay window</p>}
    {payment === "RAZORPAY" && payState === "unpaid" && <div className="mt-4 w-full max-w-sm rounded-2xl border-2 border-dashed border-krust/50 bg-white p-4 text-left"><p className="text-xs font-bold text-krust-deep">{payError || "The payment was not completed."}</p><p className="mt-1 text-[11px] text-cocoa">Your order is saved. You can pay now, or later from My orders.</p><button onClick={() => void pay(placed)} className="action mt-3 w-full justify-center"><CreditCard size={15} /> Pay {formatInr(placed.total)} now</button></div>}<div className="mt-7 grid w-full max-w-sm gap-3 sm:grid-cols-2">{payState === "paid" ? <button onClick={() => void downloadReceiptFor(placed.id, placed.token).catch((e: Error) => toast.error(e.message))} className="flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-sm font-bold text-white"><Download size={15} /> Download receipt</button> : <Link href={`/invoice/${placed.id}?t=${placed.token}`} className="flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-sm font-bold text-white">View GST invoice</Link>}<a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi Krust, I placed order ${placed.id} for ${formatInr(placed.total)}.`)}`} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#25d366] text-sm font-bold text-white"><WhatsAppIcon size={16} /> WhatsApp</a></div></div> :
    <form key={customer?.id ?? "guest"} onSubmit={submit} className="px-5 py-7 sm:px-8">
      {!customer && needsSignIn ? null : customer ? <div className="mb-5 flex items-center gap-3 rounded-2xl bg-mint/70 p-4 text-xs font-bold text-[#2f7a4a]"><Check size={16} /> Signed in as {customer.email}. This order will appear in My orders.</div> : <button type="button" onClick={() => setAccountOpen(true)} className="mb-5 flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-krust/40 bg-white p-4 text-left text-xs font-bold text-ink transition hover:border-krust"><span>Sign in with Google to save this order to your account <span className="block font-medium text-cocoa">Or simply continue as a guest below.</span></span><ArrowRight size={16} className="shrink-0 text-krust" /></button>}
      <div className="rounded-2xl border-2 border-krust/70 bg-white p-5"><div className="flex items-center justify-between"><h3 className="text-xl">Your order</h3><span className="badge bg-blush text-krust">{items} items</span></div><div className="mt-4 space-y-3">{resolved.map(({ line, product, variant }) => <div key={line.key} className="flex justify-between gap-3 text-xs"><span className="text-cocoa">{line.quantity} × {product.name} <span className="opacity-60">({variant.name})</span></span><span className="font-semibold">{formatInr(variant.price * line.quantity)}</span></div>)}{!resolved.length && <p className="text-xs text-cocoa">Your basket is empty.</p>}</div><div className="mt-4 border-t border-petal pt-4"><div className="flex justify-between text-xs text-cocoa"><span>Included GST</span><span>{formatInr(gst)}</span></div>{settings.deliveryFee > 0 && <div className="mt-1 flex justify-between text-xs text-cocoa"><span>Delivery</span><span>{formatInr(settings.deliveryFee)}</span></div>}<div className="mt-2 flex justify-between"><span className="font-semibold">Total</span><span className="font-display text-2xl">{formatInr(subtotal + settings.deliveryFee)}</span></div></div></div>
      {!customer && needsSignIn ? <div className="mt-8 rounded-3xl border-2 border-krust bg-white p-6 text-center sm:p-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blush text-krust"><UserRound size={24} /></span>
        <h3 className="mt-4 text-2xl">Sign in to place your order</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-cocoa">Sign in with Google in one tap. Your basket stays as it is, and you can track this order and download its receipt any time.</p>
        <div className="mt-6"><GoogleButton clientId={settings.googleClientId} /></div>
        <p className="mt-4 text-[11px] text-cocoa">We only use your name and email for your orders.</p>
      </div> : <>
      <SectionTitle number="01" title="Delivery details" /><div className="grid gap-4 sm:grid-cols-2"><Field label="Full name" name="name" placeholder="Your name" required minLength={2} defaultValue={lastDetails?.name ?? customer?.name} /><Field label="Phone number" name="phone" placeholder="98765 43210" required {...MOBILE_INPUT} defaultValue={tenDigits(lastDetails?.phone)} /><Field label="WhatsApp number" name="whatsapp" placeholder="Same as phone" {...MOBILE_INPUT} defaultValue={tenDigits(lastDetails?.whatsapp)} /><Field label="Email (optional)" name="email" type="email" placeholder="you@example.com" defaultValue={customer?.email} readOnly={!!customer} /><label className="sm:col-span-2"><span className="label">Delivery address</span><textarea name="address" required minLength={8} rows={3} placeholder="House / flat, street and area" className="input" defaultValue={lastDetails?.address} /></label><Field label="Landmark" name="landmark" placeholder="Near metro station" /><Field label="Pincode" name="pincode" inputMode="numeric" pattern="[1-9][0-9]{5}" placeholder="600032" required defaultValue={lastDetails?.pincode} /></div>
      <SectionTitle number="02" title="Delivery date" /><div className="grid gap-4 sm:grid-cols-2"><Field label="Delivery date" name="date" type="date" min={today} defaultValue={today} required /><label className="sm:col-span-2"><span className="label">Order note / cake message</span><textarea name="note" rows={2} placeholder="Anything the baker should know?" className="input" /></label></div>
      <SectionTitle number="03" title="Payment" /><div className={`grid gap-3 ${methods.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>{methods.map(([method, title, copy]) => <button type="button" key={method} onClick={() => setPayment(method)} className={`rounded-xl border-2 p-4 text-left transition ${payment === method ? "border-krust bg-blush" : "border-petal bg-white"}`}><span className="block text-xs font-bold">{title}</span><span className="mt-1 block text-[10px] text-cocoa">{copy}</span></button>)}</div>
      {error && <p className="mt-6 rounded-xl border border-krust/30 bg-blush p-4 text-xs font-semibold text-krust-deep">{error}</p>}
      <button type="submit" disabled={submitting || !resolved.length || subtotal < settings.minimumOrder} className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-full bg-krust text-sm font-bold text-white shadow-[0_12px_32px_rgba(236,36,39,.28)] transition hover:bg-krust-deep disabled:opacity-60">{submitting ? "Placing order…" : <>{payment === "RAZORPAY" ? "Pay" : "Place order"} · {formatInr(subtotal + settings.deliveryFee)} <ShieldCheck size={18} /></>}</button>
      {subtotal < settings.minimumOrder && <p className="mt-3 text-center text-xs font-semibold text-krust">Minimum order for delivery is {formatInr(settings.minimumOrder)}.</p>}
      <p className="mt-3 text-center text-[10px] leading-4 text-cocoa">By placing this order, you agree to the delivery and cancellation policy. We never store card details.{payment === "RAZORPAY" && " Payments are processed securely by Razorpay."}</p>
      </>}
    </form>}
  </aside></div>;
}

function SectionTitle({ number, title }: { number: string; title: string }) { return <div className="mb-4 mt-9 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-krust text-[11px] font-bold text-white">{number}</span><h3 className="text-2xl">{title}</h3></div>; }
/** Indian mobile number: digits only, at most 10 (a pasted +91 prefix is dropped). */
const tenDigits = (value?: string) => { const d = (value ?? "").replace(/D/g, ""); return (d.length > 10 && d.startsWith("91") ? d.slice(2) : d).slice(0, 10); };
const MOBILE_INPUT = { type: "tel", inputMode: "numeric", maxLength: 10, pattern: "[6-9][0-9]{9}", title: "Enter a 10-digit mobile number", onInput: (e: FormEvent<HTMLInputElement>) => { e.currentTarget.value = tenDigits(e.currentTarget.value); } } as const;

function Field({ label, ...inputProps }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label><span className="label">{label}</span><input {...inputProps} className="input" /></label>; }
