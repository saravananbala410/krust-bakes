"use client";

import Link from "next/link";
import { Gift, Sparkles, Activity, ArrowDown, ArrowLeft, ArrowUp, BadgeIndianRupee, Bell, Check, ChevronRight, CircleDollarSign, ClipboardList, Download, Eye, EyeOff, FileClock, FileText, ImageIcon, KeyRound, LayoutDashboard, LockKeyhole, LogOut, Menu, Package, Pencil, Plus, Receipt, RefreshCw, RotateCcw, Search, Settings, Share2, ShieldCheck, ShoppingBag, Star, Tags, Trash2, Upload, UserPlus, Users, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/app-store";
import { calculateInclusiveGst, formatInr } from "@/lib/gst";
import { ORDER_STATUSES, PAYMENT_STATUSES, ROLE_LABELS, ROLE_TABS, type AdminRole, type AdminTab, type AdminUser, type AuditEntry, type CarouselSlide, type Faq, type Festive, type Hamper, type StoreOrder, type TeamMember, type Testimonial } from "@/lib/store-core";
import type { Product, Variant } from "@/lib/types";
import { downloadXlsx } from "@/lib/xlsx";
import { socialIcons, socialLabels } from "./social-icons";

type Tab = AdminTab;
const nav: Array<[Tab, typeof LayoutDashboard]> = [["Overview", LayoutDashboard], ["Orders", ClipboardList], ["Recycle bin", Trash2], ["Products", Package], ["Categories", Tags], ["Hampers", Gift], ["GST", Receipt], ["Customers & payments", Users], ["Content studio", ImageIcon], ["Social links", Share2], ["Settings", Settings], ["Admin users", ShieldCheck], ["History", FileClock]];
const POLL_MS = 15000;

export function AdminDashboard() {
  const { me, loaded, refresh, error, clearError } = useAppStore();
  const admin = useAppStore((s) => s.admin);
  const [chosenTab, setTab] = useState<Tab | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const knownOrders = useRef<Set<string> | null>(null);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (error) { toast.error(error); clearError(); } }, [error, clearError]);
  // Poll so orders placed on the storefront appear without a manual refresh.
  useEffect(() => {
    if (!me) return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [me, refresh]);
  useEffect(() => {
    if (!admin) return;
    const ids = new Set(admin.orders.map((o) => o.id));
    if (knownOrders.current) {
      const fresh = admin.orders.filter((o) => !knownOrders.current!.has(o.id) && o.status === "PENDING");
      fresh.forEach((o) => toast.success(`New order ${o.id} from ${o.customer}`, { description: formatInr(o.total) }));
    }
    knownOrders.current = ids;
  }, [admin]);

  if (!loaded) return <main className="grid min-h-screen place-items-center bg-cream"><div className="h-12 w-12 animate-spin rounded-full border-4 border-petal border-t-krust" /></main>;
  if (!me || !admin) return <LoginScreen />;

  const pending = admin.orders.filter((o) => o.status === "PENDING").length;
  const allowedTabs = ROLE_TABS[me.role];
  const tab: Tab = chosenTab && allowedTabs.includes(chosenTab) ? chosenTab : allowedTabs[0];
  return <main className="min-h-screen bg-cream text-ink lg:grid lg:grid-cols-[272px_1fr]">
    {sidebar && <button aria-label="Close menu" onClick={() => setSidebar(false)} className="fixed inset-0 z-40 bg-ink/30 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 w-[272px] border-r border-petal bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${sidebar ? "translate-x-0" : "-translate-x-full"}`}>
      <BrandBlock onClose={() => setSidebar(false)} />
      <nav className="no-scrollbar h-[calc(100vh-176px)] space-y-1 overflow-y-auto px-3 py-5">{nav.filter(([item]) => allowedTabs.includes(item)).map(([item, Icon]) => {
        const count = item === "Recycle bin" ? admin.recycleBin.length : item === "Orders" ? pending : 0;
        return <button key={item} onClick={() => { setTab(item); setSidebar(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[13px] font-semibold transition ${tab === item ? "bg-krust text-white shadow-[0_10px_24px_rgba(236,36,39,.25)]" : "text-cocoa hover:bg-blush hover:text-krust"}`}><Icon size={17} />{item}{count > 0 && <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${tab === item ? "bg-white text-krust" : "bg-krust text-white"}`}>{count}</span>}</button>;
      })}</nav>
      <SessionCard me={me} />
    </aside>
    <section className="min-w-0">
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-petal bg-cream/90 px-5 backdrop-blur-xl lg:px-8">
        <div className="flex items-center gap-3"><button onClick={() => setSidebar(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-petal bg-white lg:hidden"><Menu size={18} /></button><div><p className="eyebrow !text-[10px]">Krust operations</p><h1 className="text-2xl sm:text-3xl">{tab}</h1></div></div>
        <div className="flex gap-2">
          <button onClick={() => refresh().then(() => toast.success("Up to date"))} className="hidden h-10 items-center gap-2 rounded-xl border border-petal bg-white px-4 text-xs font-bold text-cocoa sm:flex"><RefreshCw size={14} /> Refresh</button>
          <Link href="/" target="_blank" className="hidden h-10 items-center gap-2 rounded-xl border border-petal bg-white px-4 text-xs font-bold text-cocoa sm:flex"><ArrowLeft size={14} /> Storefront</Link>
          <button onClick={() => setTab("Orders")} aria-label="Pending orders" className="relative grid h-10 w-10 place-items-center rounded-xl border border-petal bg-white"><Bell size={16} />{pending > 0 && <span className="pulse-ring absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-krust px-1 text-[9px] font-bold text-white">{pending}</span>}</button>
        </div>
      </header>
      <div key={tab} className="fade-in p-5 lg:p-8">
        {tab === "Overview" && <Overview go={setTab} />}
        {tab === "Orders" && <Orders />}
        {tab === "Recycle bin" && <RecycleBin />}
        {tab === "Products" && <Products />}
        {tab === "Categories" && <Categories />}
        {tab === "Hampers" && <Hampers />}
        {tab === "GST" && <Gst />}
        {tab === "Customers & payments" && <Customers />}
        {tab === "Content studio" && <ContentStudio />}
        {tab === "Social links" && <SocialLinksPanel />}
        {tab === "Settings" && <StoreSettingsPanel />}
        {tab === "Admin users" && <AdminUsers />}
        {tab === "History" && <History />}
      </div>
    </section>
  </main>;
}

function BrandBlock({ onClose }: { onClose: () => void }) {
  const branding = useAppStore((s) => s.config.branding);
  return <div className="flex h-24 items-center justify-between border-b border-petal px-5"><Link href="/" className="flex items-center gap-3"><img src={branding.logoUrl} alt="" className="h-11 w-11 rounded-xl object-contain shadow-sm" /><div><p className="font-display text-xl">Krust</p><p className="text-[9px] font-bold uppercase tracking-[.24em] text-krust">Command centre</p></div></Link><button onClick={onClose} className="lg:hidden" aria-label="Close menu"><X size={18} /></button></div>;
}

function SessionCard({ me }: { me: AdminUser }) {
  const logout = useAppStore((s) => s.logout);
  const [passwordOpen, setPasswordOpen] = useState(false);
  return <div className="absolute inset-x-3 bottom-4 rounded-2xl border border-petal bg-blush/60 p-3"><div className="flex items-center gap-2"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-krust text-xs font-extrabold text-white">{me.name.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-xs font-extrabold">{me.name}</p><p className="text-[9px] font-extrabold uppercase tracking-wider text-krust">{ROLE_LABELS[me.role]}</p></div><button onClick={() => setPasswordOpen(true)} aria-label="My account" title="My account: name, user ID, password" className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-krust hover:bg-white"><KeyRound size={15} /></button><button onClick={() => void logout()} aria-label="Sign out" title="Sign out" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-krust hover:bg-white"><LogOut size={15} /></button></div>{passwordOpen && <Drawer title="My account" onClose={() => setPasswordOpen(false)}><ProfileForm me={me} /><div className="gold-rule my-8" /><h3 className="mb-4 text-xl">Change password</h3><PasswordForm onDone={() => setPasswordOpen(false)} /></Drawer>}</div>;
}

function ProfileForm({ me }: { me: AdminUser }) {
  const run = useDispatch();
  const [form, setForm] = useState({ name: me.name, username: me.username, current: "" });
  return <form onSubmit={(e) => { e.preventDefault(); void run({ type: "admin.updateOwnProfile", ...form }, "Account details saved").then((ok) => ok && setForm((f) => ({ ...f, current: "" }))); }} className="grid gap-4"><h3 className="text-xl">Name &amp; user ID</h3><Field label="Display name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><Field label="User ID (used to sign in)" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required pattern="[a-zA-Z0-9._-]{3,40}" autoComplete="username" /><Field label="Current password (to confirm)" type="password" autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required /><button className="action w-fit"><Check size={15} /> Save account details</button></form>;
}

function PasswordForm({ onDone }: { onDone?: () => void }) {
  const run = useDispatch();
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  return <form onSubmit={(e) => { e.preventDefault(); if (pw.next !== pw.confirm) return void toast.error("New passwords do not match"); void run({ type: "admin.changeOwnPassword", current: pw.current, next: pw.next }, "Password changed").then((ok) => { if (ok) { setPw({ current: "", next: "", confirm: "" }); onDone?.(); } }); }} className="grid gap-4"><Field label="Current password" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /><Field label="New password (min 8 characters)" type="password" autoComplete="new-password" minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /><Field label="Confirm new password" type="password" autoComplete="new-password" minLength={8} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required /><button className="action w-fit"><KeyRound size={15} /> Update password</button></form>;
}

function LoginScreen() {
  const login = useAppStore((s) => s.login);
  const branding = useAppStore((s) => s.config.branding);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError("");
    const message = await login(String(data.get("username")), String(data.get("password")));
    setBusy(false);
    if (message) setError(message);
  };
  return <main className="pastel-wash grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative hidden overflow-hidden lg:block"><img src={branding.heroImage} alt="" className="ken-burns absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-tr from-krust-deep/80 via-krust/30 to-transparent" /><div className="reveal absolute bottom-16 left-16 max-w-xl text-white"><p className="text-xs font-bold uppercase tracking-[.28em] text-white/80">Krust operations</p><h1 className="mt-4 text-6xl leading-[.95]">Every bake.<br />Every order.<br /><span className="font-hero text-7xl">in one place.</span></h1></div></section>
    <section className="flex items-center justify-center p-6"><form onSubmit={submit} className="reveal w-full max-w-md rounded-[32px] border-[3px] border-krust bg-white p-8 shadow-[0_30px_80px_-20px_rgba(236,36,39,.3)] sm:p-10">
      <img src={branding.wordmarkUrl} alt={branding.storeName} className="w-[210px]" />
      <h2 className="mt-8 text-4xl">Admin sign in</h2><p className="mt-2 text-sm text-cocoa">Use your authorised Krust user ID and password.</p>
      <label className="mt-7 block"><span className="label">User ID</span><input name="username" required autoComplete="username" className="input" /></label>
      <label className="mt-4 block"><span className="label">Password</span><span className="relative block"><input name="password" required type={show ? "text" : "password"} autoComplete="current-password" className="input pr-11" /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
      {error && <p className="fade-in mt-4 rounded-xl bg-blush p-3 text-xs font-bold text-krust-deep">{error}</p>}
      <button disabled={busy} className="action mt-6 h-13 w-full justify-center text-sm"><LockKeyhole size={16} /> {busy ? "Signing in…" : "Sign in securely"}</button>
    </form></section>
  </main>;
}

// ---------- shared helpers ----------

function useDispatch() {
  const dispatch = useAppStore((s) => s.dispatch);
  return async (action: Parameters<typeof dispatch>[0], success?: string) => { const ok = await dispatch(action); if (ok && success) toast.success(success); return ok; };
}

function orderGst(order: StoreOrder) {
  return order.lines.reduce((acc, l) => { const t = calculateInclusiveGst(l.unitPrice * l.quantity, l.gstRate); return { taxable: acc.taxable + t.taxableValue, gst: acc.gst + t.gstAmount, cgst: acc.cgst + t.cgst, sgst: acc.sgst + t.sgst }; }, { taxable: 0, gst: 0, cgst: 0, sgst: 0 });
}
const r2 = (n: number) => Math.round(n * 100) / 100;
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

function flatOrder(o: StoreOrder) {
  const g = orderGst(o);
  return { Order: o.id, Created: fmtDate(o.createdAt), Customer: o.customer, Phone: o.phone, WhatsApp: o.whatsapp, Email: o.email ?? "", Address: o.address, Pincode: o.pincode ?? "", "Delivery date": o.deliveryDate ?? "", Slot: o.slot, Items: o.items, Status: o.status, "Payment method": o.paymentMethod, "Payment status": o.paymentStatus, "Taxable value": r2(g.taxable), CGST: r2(g.cgst), SGST: r2(g.sgst), "Total GST": r2(g.gst), Total: o.total, "Customer note": o.customerNote ?? "", "Internal note": o.note ?? "" };
}
function lineRows(orders: StoreOrder[]) {
  return orders.flatMap((o) => o.lines.map((l) => { const t = calculateInclusiveGst(l.unitPrice * l.quantity, l.gstRate); return { Order: o.id, Date: fmtDate(o.createdAt), Customer: o.customer, Product: l.productName, Size: l.variantName, HSN: l.hsn ?? "1905", Qty: l.quantity, "Unit price": l.unitPrice, "GST %": l.gstRate, "Line total": l.unitPrice * l.quantity, "Taxable value": t.taxableValue, CGST: t.cgst, SGST: t.sgst }; }));
}
function paymentRows(orders: StoreOrder[]) {
  return orders.map((o) => ({ Order: o.id, Date: fmtDate(o.createdAt), Customer: o.customer, Phone: o.phone, Method: o.paymentMethod === "RAZORPAY" ? "Online (Razorpay)" : o.paymentMethod.replaceAll("_", " "), "Payment status": o.paymentStatus, "Order status": o.status, Amount: o.total, "GST included": r2(orderGst(o).gst), "Payment ID": o.paymentId ?? "", "Paid at": o.paidAt ? fmtDate(o.paidAt) : "" }));
}
function customerRows(orders: StoreOrder[]) {
  const map = new Map<string, { Customer: string; Phone: string; WhatsApp: string; Email: string; Address: string; Orders: number; "Lifetime value": number; "Paid value": number; "Last order": string }>();
  [...orders].reverse().forEach((o) => {
    const key = o.phone.replace(/\D/g, "").slice(-10);
    const row = map.get(key) ?? { Customer: o.customer, Phone: o.phone, WhatsApp: o.whatsapp, Email: o.email ?? "", Address: o.address, Orders: 0, "Lifetime value": 0, "Paid value": 0, "Last order": "" };
    row.Orders++; row["Lifetime value"] += o.total; if (o.paymentStatus === "PAID") row["Paid value"] += o.total;
    row.Customer = o.customer; row.Address = o.address; row["Last order"] = fmtDate(o.createdAt); if (o.email) row.Email = o.email;
    map.set(key, row);
  });
  return [...map.values()].sort((a, b) => b["Lifetime value"] - a["Lifetime value"]);
}
function gstSummary(orders: StoreOrder[]) {
  const map = new Map<number, { "GST %": number; "Taxable value": number; CGST: number; SGST: number; "Total GST": number; "Gross sales": number }>();
  orders.filter((o) => o.status !== "CANCELLED").forEach((o) => o.lines.forEach((l) => { const t = calculateInclusiveGst(l.unitPrice * l.quantity, l.gstRate); const row = map.get(l.gstRate) ?? { "GST %": l.gstRate, "Taxable value": 0, CGST: 0, SGST: 0, "Total GST": 0, "Gross sales": 0 }; row["Taxable value"] = r2(row["Taxable value"] + t.taxableValue); row.CGST = r2(row.CGST + t.cgst); row.SGST = r2(row.SGST + t.sgst); row["Total GST"] = r2(row["Total GST"] + t.gstAmount); row["Gross sales"] = r2(row["Gross sales"] + t.inclusiveTotal); map.set(l.gstRate, row); }));
  return [...map.values()].sort((a, b) => a["GST %"] - b["GST %"]);
}

// ---------- overview ----------

function Overview({ go }: { go: (tab: Tab) => void }) {
  const { orders, audit } = useAppStore((s) => s.admin!);
  const products = useAppStore((s) => s.config.products);
  const live = orders.filter((o) => o.status !== "CANCELLED");
  const revenue = live.reduce((sum, o) => sum + o.total, 0);
  const gst = live.reduce((sum, o) => sum + orderGst(o).gst, 0);
  const pending = orders.filter((o) => o.status === "PENDING").length;
  const exportAll = () => downloadXlsx("krust-complete-report", { Orders: orders.map(flatOrder), "Order items": lineRows(orders), Payments: paymentRows(orders), Customers: customerRows(orders), "GST summary": gstSummary(orders) });
  return <div className="space-y-6">
    <Header title="The bakehouse, live." copy="Every order, product and change, saved to the server and shared across devices." action={<button onClick={exportAll} className="action"><Download size={15} /> Export complete XL</button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Revenue" value={formatInr(revenue)} icon={CircleDollarSign} tint="bg-blush" />
      <Metric label="GST collected" value={formatInr(gst)} icon={BadgeIndianRupee} tint="bg-peach" />
      <Metric label="Pending orders" value={String(pending)} icon={ShoppingBag} tint="bg-lilac" onClick={() => go("Orders")} />
      <Metric label="Active products" value={String(products.filter((p) => p.active !== false).length)} icon={Package} tint="bg-mint" />
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <Panel title="Recent orders" action="Manage orders" onAction={() => go("Orders")}><OrderTable orders={orders.slice(0, 6)} /></Panel>
      <Panel title="Latest changes" action="Full history" onAction={() => go("History")}><div className="divide-y divide-petal/70">{audit.slice(0, 8).map((e) => <div key={e.id} className="py-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold">{e.action}</p><span className="text-[10px] text-cocoa">{new Date(e.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></div><p className="mt-1 text-[11px] text-cocoa">{e.entity} · {e.detail} <span className="text-krust">· {e.actor}</span></p></div>)}{!audit.length && <p className="py-6 text-center text-xs text-cocoa">No activity yet.</p>}</div></Panel>
    </div>
  </div>;
}

// ---------- orders ----------

function Orders() {
  const orders = useAppStore((s) => s.admin!.orders);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = orders.filter((o) => (status === "ALL" || o.status === status) && `${o.id} ${o.customer} ${o.phone} ${o.address}`.toLowerCase().includes(query.toLowerCase()));
  const selected = orders.find((o) => o.id === selectedId) ?? null;
  return <div>
    <Header title="Orders" copy="Customer orders arrive here automatically. Change status inline or open an order for details." action={<div className="flex flex-wrap gap-2"><button onClick={() => downloadXlsx("krust-orders", { Orders: filtered.map(flatOrder), "Order items": lineRows(filtered) })} className="action secondary"><Download size={14} /> Orders XL</button><button onClick={() => downloadXlsx("krust-payments", { Payments: paymentRows(filtered) })} className="action"><Download size={14} /> Payments XL</button></div>} />
    <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex h-11 w-full max-w-md items-center gap-2 rounded-xl border border-petal bg-white px-3"><Search size={15} className="text-cocoa" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search order, customer, phone or area" className="w-full bg-transparent text-xs outline-none" /></div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">{["ALL", ...ORDER_STATUSES].map((s) => <button key={s} onClick={() => setStatus(s)} className={`shrink-0 rounded-full border px-3.5 py-2 text-[10px] font-bold tracking-wider transition ${status === s ? "border-krust bg-krust text-white" : "border-petal bg-white text-cocoa hover:border-krust"}`}>{s.replaceAll("_", " ")} <span className="opacity-70">{s === "ALL" ? orders.length : orders.filter((o) => o.status === s).length}</span></button>)}</div>
    </div>
    <div className="mt-4 overflow-hidden rounded-2xl border border-petal bg-white"><OrderTable orders={filtered} onSelect={(o) => setSelectedId(o.id)} editable /></div>
    {selected && <OrderEditor key={selected.id} order={selected} onClose={() => setSelectedId(null)} />}
  </div>;
}

function OrderTable({ orders, onSelect, editable = false }: { orders: StoreOrder[]; onSelect?: (o: StoreOrder) => void; editable?: boolean }) {
  const run = useDispatch();
  return <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="bg-blush/70 text-[10px] uppercase tracking-[.14em] text-cocoa"><tr><th className="p-4">Order</th><th className="p-4">Customer</th><th className="p-4">Delivery</th><th className="p-4">Status</th><th className="p-4">Payment</th><th className="p-4 text-right">Total</th>{editable && <th className="p-4" />}</tr></thead>
    <tbody className="divide-y divide-petal/60">{orders.map((o) => <tr key={o.id} className="transition hover:bg-cream">
      <td className="p-4"><button onClick={() => onSelect?.(o)} className="text-left"><p className="text-xs font-bold text-krust">{o.id}</p><p className="mt-1 text-[10px] text-cocoa">{fmtDate(o.createdAt)}</p></button></td>
      <td className="p-4"><p className="text-xs font-semibold">{o.customer}</p><p className="mt-1 text-[10px] text-cocoa">{o.phone}</p></td>
      <td className="p-4 text-[11px] text-cocoa">{o.deliveryDate ?? ""}<br />{o.slot}</td>
      <td className="p-4">{editable ? <StatusSelect value={o.status} options={ORDER_STATUSES} onChange={(v) => void run({ type: "order.update", id: o.id, patch: { status: v } }, `${o.id} → ${v.replaceAll("_", " ")}`)} /> : <StatusBadge status={o.status} />}</td>
      <td className="p-4">{editable ? <StatusSelect value={o.paymentStatus} options={PAYMENT_STATUSES} onChange={(v) => void run({ type: "order.update", id: o.id, patch: { paymentStatus: v } }, `${o.id} payment → ${v}`)} /> : <StatusBadge status={o.paymentStatus} />}<p className="mt-1 text-[10px] text-cocoa">{o.paymentMethod.replaceAll("_", " ")}</p></td>
      <td className="p-4 text-right text-sm font-bold">{formatInr(o.total)}</td>
      {editable && <td className="p-4 text-right"><button onClick={() => onSelect?.(o)} className="inline-flex items-center gap-1 rounded-lg border border-petal px-3 py-2 text-[10px] font-bold text-krust hover:border-krust">Open <ChevronRight size={12} /></button></td>}
    </tr>)}</tbody></table>{!orders.length && <p className="p-10 text-center text-xs text-cocoa">No orders here yet.</p>}</div>;
}

const statusTone = (s: string) => s === "DELIVERED" || s === "PAID" ? "bg-mint text-[#2f7a4a]" : s === "CANCELLED" || s === "FAILED" || s === "REFUNDED" ? "bg-[#eee] text-[#666]" : s === "PENDING" ? "bg-butter text-[#8a5a13]" : s === "CONFIRMED" ? "bg-lilac text-[#5b3f8a]" : "bg-blush text-krust";
function StatusBadge({ status }: { status: string }) { return <span className={`badge ${statusTone(status)}`}>{status.replaceAll("_", " ")}</span>; }
function StatusSelect({ value, options, onChange }: { value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className={`cursor-pointer rounded-full border-0 py-1.5 pl-3 pr-7 text-[10px] font-bold uppercase tracking-wider outline-none ring-krust focus:ring-2 ${statusTone(value)}`}>{options.map((o) => <option key={o} value={o}>{o.replaceAll("_", " ")}</option>)}</select>;
}

function OrderEditor({ order, onClose }: { order: StoreOrder; onClose: () => void }) {
  const run = useDispatch();
  const canDelete = useAppStore((s) => s.me?.role !== "SALES_ADMIN");
  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const [note, setNote] = useState(order.note ?? "");
  const [saving, setSaving] = useState(false);
  const g = orderGst(order);
  const save = async () => { setSaving(true); const ok = await run({ type: "order.update", id: order.id, patch: { status, paymentStatus, note } }, `Order ${order.id} saved`); setSaving(false); if (ok) onClose(); };
  const recycle = async () => { if (confirm(`Move ${order.id} to the recycle bin?`) && (await run({ type: "order.recycle", id: order.id }, `${order.id} moved to recycle bin`))) onClose(); };
  return <Drawer title={`Order ${order.id}`} onClose={onClose}>
    <div className="rounded-2xl border-2 border-krust bg-blush/50 p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-display text-2xl">{order.customer}</p><p className="mt-1 text-xs text-cocoa">{order.phone}{order.email && ` · ${order.email}`}</p></div><StatusBadge status={order.status} /></div><p className="mt-3 text-xs leading-5 text-cocoa">{order.address}{order.pincode && ` · ${order.pincode}`}</p><p className="mt-1 text-xs text-cocoa">Delivery: {order.deliveryDate}{order.slot && ` · ${order.slot}`}</p>{order.paymentId && <p className="mt-2 rounded-xl bg-mint p-3 text-xs font-semibold text-[#2f7a4a]">Paid online via Razorpay · {order.paymentId}{order.paidAt && ` · ${fmtDate(order.paidAt)}`}</p>}{order.customerNote && <p className="mt-3 rounded-xl bg-white p-3 text-xs"><b>Customer note:</b> {order.customerNote}</p>}</div>
    <div className="mt-5 overflow-hidden rounded-2xl border border-petal bg-white"><table className="w-full text-left text-xs"><thead className="bg-cream text-[10px] uppercase tracking-wider text-cocoa"><tr><th className="p-3">Item</th><th className="p-3 text-center">Qty</th><th className="p-3 text-right">GST</th><th className="p-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-petal/60">{order.lines.map((l, i) => <tr key={i}><td className="p-3"><p className="font-semibold">{l.productName}</p><p className="text-[10px] text-cocoa">{l.variantName} · HSN {l.hsn ?? "1905"} · {formatInr(l.unitPrice)}</p></td><td className="p-3 text-center">{l.quantity}</td><td className="p-3 text-right">{l.gstRate}%</td><td className="p-3 text-right font-bold">{formatInr(l.unitPrice * l.quantity)}</td></tr>)}</tbody></table>
      <div className="space-y-1.5 border-t border-petal p-4 text-xs"><Row k="Taxable value" v={`₹${g.taxable.toFixed(2)}`} /><Row k="CGST" v={`₹${g.cgst.toFixed(2)}`} /><Row k="SGST" v={`₹${g.sgst.toFixed(2)}`} /><div className="flex justify-between border-t border-petal pt-2 text-sm font-bold"><span>Total (incl. GST)</span><span>{formatInr(order.total)}</span></div></div></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><FieldSelect label="Order status" value={status} onChange={setStatus} options={ORDER_STATUSES} /><FieldSelect label="Payment status" value={paymentStatus} onChange={setPaymentStatus} options={PAYMENT_STATUSES} /></div>
    <label className="mt-4 block"><span className="label">Internal note</span><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="input" /></label>
    <div className={`mt-6 grid gap-3 ${canDelete ? "grid-cols-2" : ""}`}>{canDelete && <button onClick={recycle} className="action secondary justify-center"><Trash2 size={14} /> Delete order</button>}<button onClick={save} disabled={saving} className="action justify-center"><Check size={14} /> {saving ? "Saving…" : "Save update"}</button></div>
    <Link href={`/invoice/${order.id}`} target="_blank" className="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl border border-petal bg-white text-xs font-bold text-cocoa hover:border-krust hover:text-krust"><FileText size={14} /> Open GST invoice</Link>
  </Drawer>;
}

function RecycleBin() {
  const rows = useAppStore((s) => s.admin!.recycleBin);
  const run = useDispatch();
  return <div>
    <Header title="Recycle bin" copy="Deleted orders wait here. Restore them, or delete permanently. Permanent deletion cannot be undone." action={rows.length > 0 ? <button onClick={() => confirm(`Permanently delete all ${rows.length} order(s)? This cannot be undone.`) && void run({ type: "recycle.empty" }, "Recycle bin emptied")} className="action"><Trash2 size={14} /> Empty bin</button> : undefined} />
    <div className="mt-6 space-y-3">{rows.map((o) => <article key={o.id} className="fade-in flex flex-col gap-4 rounded-2xl border border-petal bg-white p-5 sm:flex-row sm:items-center"><div><p className="text-sm font-bold"><span className="text-krust">{o.id}</span> · {o.customer}</p><p className="mt-1 text-[11px] text-cocoa">Deleted {fmtDate(o.deletedAt)} · {o.items} items · {o.status}</p></div><p className="font-display text-xl sm:ml-auto">{formatInr(o.total)}</p><button onClick={() => void run({ type: "order.restore", id: o.id }, `${o.id} restored`)} className="action secondary justify-center"><RotateCcw size={14} /> Restore</button><button onClick={() => confirm(`Permanently delete ${o.id}? This cannot be undone.`) && void run({ type: "order.purge", id: o.id }, `${o.id} permanently deleted`)} className="action justify-center !bg-ink"><Trash2 size={14} /> Delete forever</button></article>)}{!rows.length && <Empty icon={Trash2} text="Recycle bin is empty" />}</div>
  </div>;
}

// ---------- products & categories ----------

function Products() {
  const { products, categories, settings } = useAppStore((s) => s.config);
  const run = useDispatch();
  const [editing, setEditing] = useState<Product | null>(null);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [newCat, setNewCat] = useState("");
  const shown = products.filter((p) => (filter === "All" || p.category === filter) && `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()));
  const blank = (): Product => ({ id: "", name: "", description: "", category: filter !== "All" ? filter : categories[0]?.name ?? "", eggless: true, hsn: "1905", gstRate: settings.gstRates.includes(5) ? 5 : settings.gstRates[0] ?? 0, accent: "#f6c9c9", crop: "50% 50%", imageUrl: "/brand/krust-hero.png", active: true, featured: false, variants: [{ id: crypto.randomUUID(), name: "Standard", price: 0 }] });
  return <div>
    <Header title="Products" copy="Add, edit, price, categorise, publish or remove every item. Changes go live on the storefront instantly." action={<div className="flex gap-2"><button onClick={() => downloadXlsx("krust-products", { Products: products.flatMap((p) => p.variants.map((v) => ({ Product: p.name, Category: p.category, Size: v.name, "Price (incl. GST)": v.price, "GST %": p.gstRate, HSN: p.hsn, Eggless: p.eggless ? "Yes" : "No", Bestseller: p.featured ? "Yes" : "No", Status: p.active !== false ? "Active" : "Off" }))) })} className="action secondary"><Download size={14} /> XL</button><button onClick={() => setEditing(blank())} className="action"><Plus size={15} /> Add product</button></div>} />
    <Panel title="Categories" className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter("All")} className={`rounded-full border px-4 py-2 text-xs font-bold ${filter === "All" ? "border-krust bg-krust text-white" : "border-petal bg-white text-cocoa"}`}>All · {products.length}</button>
        {categories.map((c) => <span key={c.id} className={`flex items-center overflow-hidden rounded-full border ${filter === c.name ? "border-krust" : "border-petal"} ${c.active ? "" : "opacity-60"}`}><button onClick={() => setFilter(c.name)} className={`px-4 py-2 text-xs font-bold ${filter === c.name ? "bg-krust text-white" : "bg-white text-cocoa"}`}>{c.name} · {products.filter((p) => p.category === c.name).length}</button><button onClick={() => void run({ type: "category.update", id: c.id, active: !c.active }, `${c.name} turned ${c.active ? "off" : "on"}`)} title={c.active ? "Turn category off" : "Turn category on"} className={`border-l px-2.5 py-2 text-[9px] font-bold ${c.active ? "border-petal bg-mint text-[#2f7a4a]" : "border-petal bg-[#eee] text-[#777]"}`}>{c.active ? "ON" : "OFF"}</button></span>)}
        <form onSubmit={(e) => { e.preventDefault(); if (newCat.trim()) void run({ type: "category.add", name: newCat.trim() }, `Category “${newCat.trim()}” added`).then((ok) => ok && setNewCat("")); }} className="flex items-center gap-1"><input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category" className="h-9 w-36 rounded-full border border-dashed border-krust/50 bg-white px-3 text-xs outline-none focus:border-krust" /><button aria-label="Add category" className="grid h-9 w-9 place-items-center rounded-full bg-krust text-white"><Plus size={14} /></button></form>
      </div>
    </Panel>
    <div className="mt-5 flex h-11 max-w-md items-center gap-2 rounded-xl border border-petal bg-white px-3"><Search size={15} className="text-cocoa" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" className="w-full bg-transparent text-xs outline-none" /></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shown.map((p) => <article key={p.id} className="lift overflow-hidden rounded-2xl border border-petal bg-white">
      <div className="relative h-36 bg-peach"><img src={p.imageUrl || "/brand/krust-hero.png"} alt="" className="h-full w-full object-cover" style={p.imageUrl === "/brand/krust-hero.png" ? { objectPosition: p.crop } : undefined} /><div className="absolute left-3 top-3 flex gap-1.5"><span className="badge bg-white/90 text-krust">{p.category}</span>{p.featured && <span className="badge bg-krust text-white"><Star size={9} fill="currentColor" /></span>}</div><span className={`badge absolute right-3 top-3 ${p.active !== false ? "bg-mint text-[#2f7a4a]" : "bg-[#eee] text-[#777]"}`}>{p.active !== false ? "Active" : "Off"}</span></div>
      <div className="p-5"><h3 className="text-xl">{p.name}</h3><p className="mt-1 text-[11px] text-cocoa">{p.variants.map((v) => `${v.name} · ${formatInr(v.price)}`).join("  |  ")}</p>
        <div className="mt-4 flex items-center justify-between border-t border-petal pt-4"><span className="badge bg-blush text-krust">GST {p.gstRate}% · HSN {p.hsn}</span><div className="flex gap-1.5"><button onClick={() => void run({ type: "product.save", product: { ...p, active: p.active === false } }, `${p.name} turned ${p.active === false ? "on" : "off"}`)} className="rounded-lg border border-petal px-2.5 py-2 text-[10px] font-bold hover:border-krust">{p.active === false ? "Turn on" : "Turn off"}</button><button onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`} className="grid h-8 w-8 place-items-center rounded-lg bg-krust text-white"><Pencil size={13} /></button><button onClick={() => confirm(`Delete ${p.name}? This removes it from the catalogue.`) && void run({ type: "product.delete", id: p.id }, `${p.name} deleted`)} aria-label={`Delete ${p.name}`} className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-white"><Trash2 size={13} /></button></div></div>
      </div>
    </article>)}</div>
    {!shown.length && <Empty icon={Package} text="No products in this view" />}
    {editing && <ProductEditor key={editing.id || "new"} product={editing} onClose={() => setEditing(null)} />}
  </div>;
}

function ProductEditor({ product, onClose }: { product: Product; onClose: () => void }) {
  const { categories, settings } = useAppStore((s) => s.config);
  const run = useDispatch();
  const [draft, setDraft] = useState<Product>(product);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setVariant = (i: number, patch: Partial<Variant>) => set("variants", draft.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const save = async (e: FormEvent) => { e.preventDefault(); setSaving(true); const ok = await run({ type: "product.save", product: draft }, `${draft.name} saved`); setSaving(false); if (ok) onClose(); };
  return <Drawer title={product.id ? "Edit product" : "Add product"} onClose={onClose}><form onSubmit={save} className="space-y-4">
    <ImageField label="Product photo" value={draft.imageUrl ?? ""} onChange={(v) => set("imageUrl", v)} />
    <Field label="Product name" value={draft.name} onChange={(e) => set("name", e.target.value)} required />
    <label className="block"><span className="label">Description</span><textarea value={draft.description} onChange={(e) => set("description", e.target.value)} rows={2} className="input" /></label>
    <div className="grid grid-cols-2 gap-3">
      <label><span className="label">Category</span><select value={draft.category} onChange={(e) => set("category", e.target.value)} className="input">{categories.map((c) => <option key={c.id} value={c.name}>{c.name}{c.active ? "" : " (off)"}</option>)}</select></label>
      <label><span className="label">GST rate</span><select value={draft.gstRate} onChange={(e) => set("gstRate", Number(e.target.value))} className="input">{settings.gstRates.map((r) => <option key={r} value={r}>{r}%</option>)}</select></label>
      <Field label="HSN code" value={draft.hsn} onChange={(e) => set("hsn", e.target.value)} />
    </div>
    <div><span className="label">Sizes &amp; prices (inclusive of GST)</span><div className="space-y-2">{draft.variants.map((v, i) => <div key={v.id} className="flex gap-2"><input value={v.name} onChange={(e) => setVariant(i, { name: e.target.value })} placeholder="Size e.g. 400g" className="input" required /><input type="number" min={0} step="0.01" value={v.price} onChange={(e) => setVariant(i, { price: Number(e.target.value) })} placeholder="Price" className="input !w-32" required /><button type="button" disabled={draft.variants.length === 1} onClick={() => set("variants", draft.variants.filter((_, j) => j !== i))} aria-label="Remove size" className="grid h-[2.9rem] w-11 shrink-0 place-items-center rounded-xl border border-petal text-krust disabled:opacity-30"><X size={15} /></button></div>)}</div><button type="button" onClick={() => set("variants", [...draft.variants, { id: crypto.randomUUID(), name: "", price: 0 }])} className="mt-2 flex items-center gap-1 text-xs font-bold text-krust"><Plus size={13} /> Add another size</button>
      {draft.variants[0] && <p className="mt-2 text-[11px] text-cocoa">At {formatInr(draft.variants[0].price)}: taxable ₹{calculateInclusiveGst(draft.variants[0].price, draft.gstRate).taxableValue.toFixed(2)} + GST ₹{calculateInclusiveGst(draft.variants[0].price, draft.gstRate).gstAmount.toFixed(2)}</p>}</div>
    <div className="flex flex-wrap gap-5 rounded-xl bg-cream p-4"><Toggle label="Active on storefront" checked={draft.active !== false} onChange={(v) => set("active", v)} /><Toggle label="Eggless" checked={draft.eggless} onChange={(v) => set("eggless", v)} /><Toggle label="Bestseller" checked={!!draft.featured} onChange={(v) => set("featured", v)} /></div>
    <button disabled={saving} className="action h-12 w-full justify-center">{saving ? "Saving…" : "Save product"}</button>
  </form></Drawer>;
}

function Categories() {
  const { categories, products } = useAppStore((s) => s.config);
  const run = useDispatch();
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  return <div className="max-w-3xl">
    <Header title="Categories" copy="Turn a category off to hide it and its products from the storefront without deleting anything." />
    <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) void run({ type: "category.add", name: name.trim() }, "Category added").then((ok) => ok && setName("")); }} className="mt-6 flex gap-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className="input" /><button className="action shrink-0"><Plus size={15} /> Add</button></form>
    <div className="mt-5 space-y-2">{categories.map((c) => { const count = products.filter((p) => p.category === c.name).length; return <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-petal bg-white p-4">
      {renaming?.id === c.id ? <form onSubmit={(e) => { e.preventDefault(); void run({ type: "category.update", id: c.id, name: renaming.name }, "Category renamed").then((ok) => ok && setRenaming(null)); }} className="flex flex-1 gap-2"><input autoFocus value={renaming.name} onChange={(e) => setRenaming({ id: c.id, name: e.target.value })} className="input" /><button className="action">Save</button><button type="button" onClick={() => setRenaming(null)} className="action secondary">Cancel</button></form>
        : <div className="min-w-0 flex-1"><p className="font-display text-lg">{c.name}</p><p className="text-[11px] text-cocoa">{count} product{count === 1 ? "" : "s"} · {c.active ? "Visible on storefront" : "Hidden from storefront"}</p></div>}
      {renaming?.id !== c.id && <><Toggle label={c.active ? "On" : "Off"} checked={c.active} onChange={(v) => void run({ type: "category.update", id: c.id, active: v }, `${c.name} turned ${v ? "on" : "off"}`)} /><button onClick={() => setRenaming({ id: c.id, name: c.name })} aria-label="Rename" className="grid h-9 w-9 place-items-center rounded-lg border border-petal text-krust"><Pencil size={14} /></button><button onClick={() => confirm(`Delete category “${c.name}”?`) && void run({ type: "category.delete", id: c.id }, "Category deleted")} aria-label="Delete" className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-white"><Trash2 size={14} /></button></>}
    </div>; })}</div>
  </div>;
}

// ---------- GST ----------

function Gst() {
  const settings = useAppStore((s) => s.config.settings);
  const products = useAppStore((s) => s.config.products);
  const orders = useAppStore((s) => s.admin!.orders);
  const run = useDispatch();
  const [form, setForm] = useState({ gstin: settings.gstin, fssai: settings.fssai, legalName: settings.legalName, placeOfSupply: settings.placeOfSupply });
  const [rate, setRate] = useState("");
  const summary = gstSummary(orders);
  const totals = summary.reduce((a, r) => ({ taxable: a.taxable + r["Taxable value"], cgst: a.cgst + r.CGST, sgst: a.sgst + r.SGST, gst: a.gst + r["Total GST"] }), { taxable: 0, cgst: 0, sgst: 0, gst: 0 });
  return <div className="space-y-5">
    <Header title="GST" copy="Business tax identity, the rates products may use, and a GST summary of all non-cancelled orders." action={<button onClick={() => downloadXlsx("krust-gst-report", { "GST summary": summary, "Order items": lineRows(orders.filter((o) => o.status !== "CANCELLED")) })} className="action"><Download size={14} /> GST report XL</button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Taxable value" value={formatInr(totals.taxable)} icon={Receipt} tint="bg-blush" /><Metric label="CGST" value={formatInr(totals.cgst)} icon={BadgeIndianRupee} tint="bg-peach" /><Metric label="SGST" value={formatInr(totals.sgst)} icon={BadgeIndianRupee} tint="bg-lilac" /><Metric label="Total GST" value={formatInr(totals.gst)} icon={CircleDollarSign} tint="bg-mint" /></div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Business tax details"><form onSubmit={(e) => { e.preventDefault(); void run({ type: "settings.update", patch: form }, "GST details saved"); }} className="space-y-4"><Field label="Legal business name" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} /><div className="grid gap-4 sm:grid-cols-2"><Field label="GSTIN" value={form.gstin} placeholder="33ABCDE1234F1Z5" maxLength={15} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} /><Field label="FSSAI licence" value={form.fssai} onChange={(e) => setForm({ ...form, fssai: e.target.value })} /></div><Field label="Place of supply" value={form.placeOfSupply} onChange={(e) => setForm({ ...form, placeOfSupply: e.target.value })} /><button className="action"><Check size={14} /> Save GST details</button></form></Panel>
      <Panel title="GST rates">
        <div className="flex flex-wrap gap-2">{settings.gstRates.map((r) => { const used = products.filter((p) => p.gstRate === r).length; return <span key={r} className="flex items-center gap-2 rounded-full border-2 border-krust bg-blush py-1.5 pl-4 pr-1.5 text-sm font-bold text-krust">{r}% <span className="text-[10px] font-semibold text-cocoa">{used} products</span><button onClick={() => void run({ type: "settings.update", patch: { gstRates: settings.gstRates.filter((x) => x !== r) } }, `GST ${r}% removed`)} aria-label={`Remove ${r}%`} className="grid h-6 w-6 place-items-center rounded-full bg-white text-krust"><X size={12} /></button></span>; })}</div>
        <form onSubmit={(e) => { e.preventDefault(); const n = Number(rate); if (rate !== "" && Number.isFinite(n)) void run({ type: "settings.update", patch: { gstRates: [...settings.gstRates, n] } }, `GST ${n}% added`).then((ok) => ok && setRate("")); }} className="mt-4 flex gap-2"><input type="number" min={0} max={40} step="0.25" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Add rate, e.g. 12" className="input" /><button className="action shrink-0"><Plus size={14} /> Add rate</button></form>
        <p className="mt-4 rounded-xl bg-cream p-4 text-[11px] leading-5 text-cocoa">Prices are GST-inclusive. Taxable value = price ÷ (1 + rate). Tamil Nadu orders split GST equally into CGST and SGST. Assign a rate to each product from the Products tab. Confirm your HSN codes and rates with your tax advisor.</p>
      </Panel>
    </div>
    <Panel title="GST summary by rate"><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead className="bg-blush/70 text-[10px] uppercase tracking-wider text-cocoa"><tr>{["GST %", "Taxable value", "CGST", "SGST", "Total GST", "Gross sales"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-petal/60">{summary.map((r) => <tr key={r["GST %"]}><td className="p-3 font-bold text-krust">{r["GST %"]}%</td><td className="p-3">₹{r["Taxable value"].toFixed(2)}</td><td className="p-3">₹{r.CGST.toFixed(2)}</td><td className="p-3">₹{r.SGST.toFixed(2)}</td><td className="p-3 font-bold">₹{r["Total GST"].toFixed(2)}</td><td className="p-3">₹{r["Gross sales"].toFixed(2)}</td></tr>)}</tbody></table>{!summary.length && <p className="p-6 text-center text-xs text-cocoa">No orders yet.</p>}</div></Panel>
  </div>;
}

// ---------- customers & payments ----------

function Customers() {
  const orders = useAppStore((s) => s.admin!.orders);
  const [view, setView] = useState<"customers" | "payments">("customers");
  const customers = customerRows(orders);
  const payments = paymentRows(orders);
  const paid = orders.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0);
  const due = orders.filter((o) => o.paymentStatus === "PENDING" && o.status !== "CANCELLED").reduce((s, o) => s + o.total, 0);
  return <div>
    <Header title="Customers & payments" copy="Download customers, orders and payments as separate Excel files." action={<div className="flex flex-wrap gap-2"><button onClick={() => downloadXlsx("krust-customers", { Customers: customers })} className="action secondary"><Download size={14} /> Customers XL</button><button onClick={() => downloadXlsx("krust-orders", { Orders: orders.map(flatOrder), "Order items": lineRows(orders) })} className="action secondary"><Download size={14} /> Orders XL</button><button onClick={() => downloadXlsx("krust-payments", { Payments: payments })} className="action"><Download size={14} /> Payments XL</button></div>} />
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><Metric label="Customers" value={String(customers.length)} icon={Users} tint="bg-lilac" /><Metric label="Payments received" value={formatInr(paid)} icon={CircleDollarSign} tint="bg-mint" /><Metric label="Payments pending" value={formatInr(due)} icon={BadgeIndianRupee} tint="bg-butter" /></div>
    <div className="mt-6 inline-flex rounded-full border border-petal bg-white p-1">{(["customers", "payments"] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`rounded-full px-5 py-2 text-xs font-bold capitalize ${view === v ? "bg-krust text-white" : "text-cocoa"}`}>{v}</button>)}</div>
    <div className="mt-4 overflow-x-auto rounded-2xl border border-petal bg-white">{view === "customers"
      ? <table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-blush/70 text-[10px] uppercase tracking-wider text-cocoa"><tr><th className="p-4">Customer</th><th className="p-4">Phone</th><th className="p-4">Address</th><th className="p-4">Orders</th><th className="p-4">Last order</th><th className="p-4 text-right">Lifetime value</th></tr></thead><tbody className="divide-y divide-petal/60">{customers.map((r) => <tr key={r.Phone}><td className="p-4 font-bold">{r.Customer}</td><td className="p-4">{r.Phone}</td><td className="max-w-[240px] truncate p-4 text-cocoa">{r.Address}</td><td className="p-4">{r.Orders}</td><td className="p-4 text-cocoa">{r["Last order"]}</td><td className="p-4 text-right font-bold">{formatInr(r["Lifetime value"])}</td></tr>)}</tbody></table>
      : <table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-blush/70 text-[10px] uppercase tracking-wider text-cocoa"><tr><th className="p-4">Order</th><th className="p-4">Date</th><th className="p-4">Customer</th><th className="p-4">Method</th><th className="p-4">Status</th><th className="p-4 text-right">Amount</th></tr></thead><tbody className="divide-y divide-petal/60">{payments.map((r) => <tr key={r.Order}><td className="p-4 font-bold text-krust">{r.Order}</td><td className="p-4 text-cocoa">{r.Date}</td><td className="p-4">{r.Customer}</td><td className="p-4">{r.Method}</td><td className="p-4"><StatusBadge status={r["Payment status"]} /></td><td className="p-4 text-right font-bold">{formatInr(r.Amount)}</td></tr>)}</tbody></table>}
      {!orders.length && <p className="p-10 text-center text-xs text-cocoa">No records yet.</p>}</div>
  </div>;
}

// ---------- content studio ----------

function ContentStudio() {
  const [section, setSection] = useState<"Branding" | "Our story" | "Carousel" | "Testimonials" | "FAQ">("Branding");
  return <div>
    <Header title="Content studio" copy="Logo, hero wording, carousel images and words, reviews and FAQs: all editable without touching code." />
    <div className="mt-6 inline-flex flex-wrap rounded-full border border-petal bg-white p-1">{(["Branding", "Our story", "Carousel", "Testimonials", "FAQ"] as const).map((v) => <button key={v} onClick={() => setSection(v)} className={`rounded-full px-5 py-2 text-xs font-bold ${section === v ? "bg-krust text-white" : "text-cocoa"}`}>{v}</button>)}</div>
    <div key={section} className="fade-in mt-6">{section === "Branding" ? <BrandingEditor /> : section === "Our story" ? <StoryEditor /> : section === "Carousel" ? <CarouselEditor /> : section === "Testimonials" ? <TestimonialsEditor /> : <FaqEditor />}</div>
  </div>;
}

function BrandingEditor() {
  const branding = useAppStore((s) => s.config.branding);
  const run = useDispatch();
  const [form, setForm] = useState(branding);
  const f = (k: keyof typeof form) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value }) });
  return <form onSubmit={(e) => { e.preventDefault(); void run({ type: "branding.update", patch: form }, "Branding published"); }} className="grid gap-5 xl:grid-cols-2">
    <Panel title="Logo & identity"><div className="grid gap-4 sm:grid-cols-2"><ImageField label="Logo mark (square)" value={form.logoUrl} onChange={(v) => setForm({ ...form, logoUrl: v })} contain /><ImageField label="Wordmark / name logo" value={form.wordmarkUrl} onChange={(v) => setForm({ ...form, wordmarkUrl: v })} contain /></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Store name" {...f("storeName")} /><Field label="Tagline" {...f("tagline")} /></div><div className="mt-4"><Field label="Announcement bar" {...f("announcement")} /></div></Panel>
    <Panel title="Hero section"><ImageField label="Hero image" value={form.heroImage} onChange={(v) => setForm({ ...form, heroImage: v })} /><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Small badge text" {...f("heroEyebrow")} /><Field label="Title" {...f("heroTitle")} /><Field label="Script hero word" {...f("heroAccent")} /></div><label className="mt-4 block"><span className="label">Hero paragraph</span><textarea rows={3} className="input" {...f("heroCopy")} /></label></Panel>
    <Panel title="Contact details"><div className="grid gap-4 sm:grid-cols-2"><Field label="Phone" {...f("phone")} /><Field label="Email" {...f("email")} /></div><label className="mt-4 block"><span className="label">Address</span><textarea rows={2} className="input" {...f("address")} /></label><div className="mt-4"><Field label="Directions link (opens Google Maps)" {...f("mapsUrl")} /></div><label className="mt-4 block"><span className="label">Footer map: Google Maps embed link or iframe code</span><textarea rows={3} className="input font-mono text-[11px]" placeholder='Google Maps → Share → Embed a map → Copy HTML, then paste here. Leave empty to use the address.' {...f("mapsEmbedUrl")} /></label></Panel>
    <Panel title="WhatsApp card & review rating"><Field label="WhatsApp card message" {...f("whatsappNote")} /><p className="mt-1 text-[11px] text-cocoa">Shown above the floating WhatsApp button. Leave empty to hide the card.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Rating (out of 5)" {...f("ratingValue")} /><Field label="Rating caption" {...f("ratingCount")} /></div></Panel>
    <div className="flex items-end"><button className="action h-12 w-full justify-center"><Check size={15} /> Publish branding</button></div>
  </form>;
}

function StoryEditor() {
  const story = useAppStore((s) => s.config.story);
  const run = useDispatch();
  const [d, setD] = useState(story);
  const f = (k: "eyebrow" | "titleStart" | "titleAccent" | "titleEnd" | "statValue" | "statLabel") => ({ value: d[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value }) });
  const setMember = (i: number, patch: Partial<TeamMember>) => setD({ ...d, team: d.team.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  return <form onSubmit={(e) => { e.preventDefault(); void run({ type: "story.update", story: d }, "Our story published"); }} className="grid gap-5 xl:grid-cols-2">
    <Panel title="Photo & badge"><ImageField label="Section photo (arch frame)" value={d.imageUrl} onChange={(v) => setD({ ...d, imageUrl: v })} /><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Badge number" placeholder="16+" {...f("statValue")} /><Field label="Badge text" placeholder="Years at the bench" {...f("statLabel")} /></div><p className="mt-2 text-[11px] text-cocoa">Leave the badge number empty to hide the badge.</p></Panel>
    <Panel title="Wording"><Field label="Small heading" {...f("eyebrow")} /><div className="mt-4 grid gap-4 sm:grid-cols-3"><Field label="Title start" {...f("titleStart")} /><Field label="Script word (red)" {...f("titleAccent")} /><Field label="Title end" {...f("titleEnd")} /></div><label className="mt-4 block"><span className="label">Story text (leave a blank line between paragraphs)</span><textarea rows={7} className="input" value={d.paragraphs} onChange={(e) => setD({ ...d, paragraphs: e.target.value })} /></label></Panel>
    <Panel title="Team members (founder, CEO, chefs…)" className="xl:col-span-2">
      <div className="grid gap-4 md:grid-cols-2">{d.team.map((m, i) => <div key={m.id} className="rounded-2xl border border-petal bg-cream p-4"><ImageField label="Photo" value={m.photoUrl} onChange={(v) => setMember(i, { photoUrl: v })} /><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Name" value={m.name} onChange={(e) => setMember(i, { name: e.target.value })} required /><Field label="Role" placeholder="CEO" value={m.role} onChange={(e) => setMember(i, { role: e.target.value })} /></div><button type="button" onClick={() => setD({ ...d, team: d.team.filter((_, j) => j !== i) })} className="mt-3 flex items-center gap-1 text-xs font-bold text-krust"><Trash2 size={13} /> Remove person</button></div>)}</div>
      <button type="button" onClick={() => setD({ ...d, team: [...d.team, { id: crypto.randomUUID(), name: "", role: "", photoUrl: "" }] })} className="action secondary mt-4"><UserPlus size={15} /> Add person</button>
    </Panel>
    <div className="xl:col-span-2"><button className="action h-12 w-full justify-center"><Check size={15} /> Publish our story</button></div>
  </form>;
}

function CarouselEditor() {
  const slides = useAppStore((s) => s.config.slides);
  const run = useDispatch();
  const [editing, setEditing] = useState<CarouselSlide | null>(null);
  return <div>
    <div className="flex justify-end"><button onClick={() => setEditing({ id: "", eyebrow: "", title: "", copy: "", imageUrl: "/brand/krust-hero.png", ctaLabel: "Order now", active: true })} className="action"><Plus size={15} /> Add slide</button></div>
    <div className="mt-4 grid gap-5 lg:grid-cols-2">{slides.map((s, i) => <article key={s.id} className={`overflow-hidden rounded-[26px] border-[4px] border-krust bg-white ${s.active ? "" : "opacity-60"}`}><div className="grid sm:grid-cols-2"><div className="relative h-48 bg-peach sm:h-full"><img src={s.imageUrl} alt="" className="h-full w-full object-cover" /><span className="badge absolute left-3 top-3 bg-krust text-white">#{i + 1}</span></div><div className="border-t-4 border-krust p-5 sm:border-l-4 sm:border-t-0"><p className="eyebrow !text-[9px]">{s.eyebrow}</p><h3 className="mt-2 text-xl font-bold">{s.title}</h3><p className="mt-2 line-clamp-3 text-xs leading-5 text-cocoa">{s.copy}</p></div></div>
      <div className="flex flex-wrap gap-2 border-t border-petal p-3"><button onClick={() => void run({ type: "slide.move", id: s.id, direction: -1 })} disabled={i === 0} aria-label="Move up" className="grid h-8 w-8 place-items-center rounded-lg border border-petal disabled:opacity-30"><ArrowUp size={13} /></button><button onClick={() => void run({ type: "slide.move", id: s.id, direction: 1 })} disabled={i === slides.length - 1} aria-label="Move down" className="grid h-8 w-8 place-items-center rounded-lg border border-petal disabled:opacity-30"><ArrowDown size={13} /></button><Toggle label={s.active ? "Live" : "Hidden"} checked={s.active} onChange={(v) => void run({ type: "slide.save", slide: { ...s, active: v } }, v ? "Slide is live" : "Slide hidden")} /><button onClick={() => setEditing(s)} className="ml-auto flex items-center gap-1 rounded-lg bg-krust px-3 py-2 text-[10px] font-bold text-white"><Pencil size={12} /> Edit</button><button onClick={() => confirm("Delete this slide?") && void run({ type: "slide.delete", id: s.id }, "Slide deleted")} className="rounded-lg bg-ink px-3 py-2 text-[10px] font-bold text-white">Delete</button></div>
    </article>)}</div>
    {!slides.length && <Empty icon={ImageIcon} text="No carousel slides yet" />}
    {editing && <SlideEditor key={editing.id || "new"} slide={editing} onClose={() => setEditing(null)} />}
  </div>;
}

function SlideEditor({ slide, onClose }: { slide: CarouselSlide; onClose: () => void }) {
  const run = useDispatch();
  const [d, setD] = useState(slide);
  return <Drawer title={slide.id ? "Edit slide" : "Add slide"} onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); void run({ type: "slide.save", slide: d }, "Slide published").then((ok) => ok && onClose()); }} className="space-y-4">
    <ImageField label="Slide image (shown on the left)" value={d.imageUrl} onChange={(v) => setD({ ...d, imageUrl: v })} />
    <Field label="Small heading" value={d.eyebrow} onChange={(e) => setD({ ...d, eyebrow: e.target.value })} placeholder="THE KRUST STANDARD" />
    <Field label="Main wording (bold)" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} required />
    <label className="block"><span className="label">Supporting text</span><textarea value={d.copy} onChange={(e) => setD({ ...d, copy: e.target.value })} rows={4} className="input" /></label>
    <Field label="Button label (optional)" value={d.ctaLabel ?? ""} onChange={(e) => setD({ ...d, ctaLabel: e.target.value })} />
    <Toggle label="Live on storefront" checked={d.active} onChange={(v) => setD({ ...d, active: v })} />
    <button className="action h-12 w-full justify-center">Publish slide</button>
  </form></Drawer>;
}

function TestimonialsEditor() {
  const items = useAppStore((s) => s.config.testimonials);
  const run = useDispatch();
  const [editing, setEditing] = useState<Testimonial | null>(null);
  return <div>
    <div className="flex justify-end"><button onClick={() => setEditing({ id: "", name: "", role: "", quote: "", active: true })} className="action"><Plus size={15} /> Add testimonial</button></div>
    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((t) => <article key={t.id} className={`rounded-2xl border-2 border-krust/70 bg-white p-5 ${t.active ? "" : "opacity-60"}`}><p className="font-display text-lg leading-7">“{t.quote}”</p><p className="mt-3 text-xs font-bold">{t.name} <span className="font-normal text-cocoa">· {t.role}</span></p><div className="mt-4 flex gap-2 border-t border-petal pt-3"><Toggle label={t.active ? "Visible" : "Hidden"} checked={t.active} onChange={(v) => void run({ type: "testimonial.save", item: { ...t, active: v } })} /><button onClick={() => setEditing(t)} className="ml-auto rounded-lg bg-krust px-3 py-2 text-[10px] font-bold text-white">Edit</button><button onClick={() => confirm("Delete this testimonial?") && void run({ type: "testimonial.delete", id: t.id }, "Deleted")} className="rounded-lg bg-ink px-3 py-2 text-[10px] font-bold text-white">Delete</button></div></article>)}</div>
    {editing && <Drawer title={editing.id ? "Edit testimonial" : "Add testimonial"} onClose={() => setEditing(null)}><form onSubmit={(e) => { e.preventDefault(); void run({ type: "testimonial.save", item: editing }, "Testimonial saved").then((ok) => ok && setEditing(null)); }} className="space-y-4"><Field label="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /><Field label="Area / role" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} /><label className="block"><span className="label">Stars</span><select value={editing.rating ?? 5} onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })} className="input">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}</select></label><label className="block"><span className="label">Quote</span><textarea value={editing.quote} onChange={(e) => setEditing({ ...editing, quote: e.target.value })} rows={4} className="input" required /></label><button className="action h-12 w-full justify-center">Save</button></form></Drawer>}
  </div>;
}

function FaqEditor() {
  const items = useAppStore((s) => s.config.faqs);
  const run = useDispatch();
  const [editing, setEditing] = useState<Faq | null>(null);
  return <div>
    <div className="flex justify-end"><button onClick={() => setEditing({ id: "", question: "", answer: "", active: true })} className="action"><Plus size={15} /> Add question</button></div>
    <div className="mt-4 space-y-3">{items.map((f) => <article key={f.id} className={`flex flex-col gap-3 rounded-2xl border border-petal bg-white p-5 sm:flex-row sm:items-center ${f.active ? "" : "opacity-60"}`}><div className="min-w-0 flex-1"><p className="font-display text-lg">{f.question}</p><p className="mt-1 text-xs text-cocoa">{f.answer}</p></div><Toggle label={f.active ? "Visible" : "Hidden"} checked={f.active} onChange={(v) => void run({ type: "faq.save", item: { ...f, active: v } })} /><button onClick={() => setEditing(f)} className="rounded-lg bg-krust px-3 py-2 text-[10px] font-bold text-white">Edit</button><button onClick={() => confirm("Delete this question?") && void run({ type: "faq.delete", id: f.id }, "Deleted")} className="rounded-lg bg-ink px-3 py-2 text-[10px] font-bold text-white">Delete</button></article>)}</div>
    {editing && <Drawer title={editing.id ? "Edit question" : "Add question"} onClose={() => setEditing(null)}><form onSubmit={(e) => { e.preventDefault(); void run({ type: "faq.save", item: editing }, "FAQ saved").then((ok) => ok && setEditing(null)); }} className="space-y-4"><Field label="Question" value={editing.question} onChange={(e) => setEditing({ ...editing, question: e.target.value })} required /><label className="block"><span className="label">Answer</span><textarea value={editing.answer} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} rows={5} className="input" required /></label><button className="action h-12 w-full justify-center">Save</button></form></Drawer>}
  </div>;
}

// ---------- festive hampers ----------

function Hampers() {
  const { hampers, festive, settings } = useAppStore((s) => s.config);
  const run = useDispatch();
  const [editing, setEditing] = useState<Hamper | null>(null);
  const blank = (): Hamper => ({ id: "", name: "", description: "", imageUrl: "/brand/krust-hero.png", price: 0, gstRate: settings.gstRates.includes(5) ? 5 : settings.gstRates[0] ?? 0, contents: [], badge: "", active: true });
  return <div className="space-y-6">
    <Header title="Festive hampers" copy="Gift hampers shown in the Diwali popup and on the shop. Customers open one to see what's inside and add it to their basket." action={<button onClick={() => setEditing(blank())} className="action"><Plus size={15} /> Add hamper</button>} />
    <FestiveSettings festive={festive} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{hampers.map((h) => <article key={h.id} className={`lift overflow-hidden rounded-2xl border-2 border-[#f5c542]/60 bg-white ${h.active ? "" : "opacity-60"}`}>
      <div className="relative h-40 bg-peach"><img src={h.imageUrl} alt="" className="h-full w-full object-cover" />{h.badge && <span className="badge absolute left-3 top-3 bg-krust text-white">{h.badge}</span>}<span className={`badge absolute right-3 top-3 ${h.active ? "bg-mint text-[#2f7a4a]" : "bg-[#eee] text-[#777]"}`}>{h.active ? "Live" : "Hidden"}</span></div>
      <div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="text-xl leading-tight">{h.name}</h3><p className="font-display text-xl text-krust">{formatInr(h.price)}</p></div>
        <p className="mt-1 text-[11px] text-cocoa">{h.contents.length} items · GST {h.gstRate}%</p>
        <ul className="mt-3 space-y-1 text-xs text-cocoa">{h.contents.slice(0, 4).map((c) => <li key={c}>• {c}</li>)}{h.contents.length > 4 && <li className="font-bold">+ {h.contents.length - 4} more</li>}</ul>
        <div className="mt-4 flex items-center gap-2 border-t border-petal pt-4"><Toggle label={h.active ? "Live" : "Hidden"} checked={h.active} onChange={(v) => void run({ type: "hamper.save", hamper: { ...h, active: v } }, v ? "Hamper is live" : "Hamper hidden")} /><button onClick={() => setEditing(h)} className="ml-auto flex items-center gap-1 rounded-lg bg-krust px-3 py-2 text-[10px] font-bold text-white"><Pencil size={12} /> Edit</button><button onClick={() => confirm(`Delete ${h.name}?`) && void run({ type: "hamper.delete", id: h.id }, "Hamper deleted")} aria-label="Delete hamper" className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-white"><Trash2 size={13} /></button></div>
      </div>
    </article>)}</div>
    {!hampers.length && <Empty icon={Gift} text="No hampers yet" />}
    {editing && <HamperEditor key={editing.id || "new"} hamper={editing} onClose={() => setEditing(null)} />}
  </div>;
}

function FestiveSettings({ festive }: { festive: Festive }) {
  const run = useDispatch();
  const [f, setF] = useState(festive);
  return <Panel title="Festive popup & fireworks">
    <form onSubmit={(e) => { e.preventDefault(); void run({ type: "festive.update", festive: f }, "Festive settings saved"); }} className="space-y-4">
      <div className="flex flex-wrap gap-6 rounded-xl bg-cream p-4"><Toggle label="Show hamper popup & section" checked={f.enabled} onChange={(v) => setF({ ...f, enabled: v })} /><Toggle label="Fireworks animation" checked={f.fireworks} onChange={(v) => setF({ ...f, fireworks: v })} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Popup heading" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /><Field label="Popup message" value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} /><Field label="Show popup after (seconds)" type="number" min={0} max={60} value={f.popupDelaySeconds} onChange={(e) => setF({ ...f, popupDelaySeconds: Number(e.target.value) })} /><Field label="Show again after closing (minutes)" type="number" min={1} max={1440} value={f.repeatMinutes} onChange={(e) => setF({ ...f, repeatMinutes: Number(e.target.value) })} /></div>
      <button className="action"><Sparkles size={15} /> Save festive settings</button>
    </form>
  </Panel>;
}

function HamperEditor({ hamper, onClose }: { hamper: Hamper; onClose: () => void }) {
  const { settings, products } = useAppStore((s) => s.config);
  const run = useDispatch();
  const [d, setD] = useState(hamper);
  const [contents, setContents] = useState(hamper.contents.join("\n"));
  const [pick, setPick] = useState("");
  const addProduct = () => { const p = products.find((x) => x.id === pick); if (!p) return; const line = `${p.name} (${p.variants[0]?.name ?? ""})`; setContents((c) => (c.trim() ? `${c.trim()}\n${line}` : line)); setPick(""); };
  const save = async (e: FormEvent) => { e.preventDefault(); const ok = await run({ type: "hamper.save", hamper: { ...d, contents: contents.split("\n").map((x) => x.trim()).filter(Boolean) } }, `${d.name || "Hamper"} saved`); if (ok) onClose(); };
  return <Drawer title={hamper.id ? "Edit hamper" : "Add hamper"} onClose={onClose}><form onSubmit={save} className="space-y-4">
    <ImageField label="Hamper photo" value={d.imageUrl} onChange={(v) => setD({ ...d, imageUrl: v })} />
    <Field label="Hamper name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Grand Diwali Hamper" required />
    <label className="block"><span className="label">Short description</span><textarea value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} rows={2} className="input" /></label>
    <div className="grid grid-cols-2 gap-3"><Field label="Price incl. GST (₹)" type="number" min={1} step="0.01" value={d.price || ""} onChange={(e) => setD({ ...d, price: Number(e.target.value) })} required /><label><span className="label">GST rate</span><select value={d.gstRate} onChange={(e) => setD({ ...d, gstRate: Number(e.target.value) })} className="input">{settings.gstRates.map((r) => <option key={r} value={r}>{r}%</option>)}</select></label><Field label="Badge (optional)" value={d.badge ?? ""} onChange={(e) => setD({ ...d, badge: e.target.value })} placeholder="Bestseller" /></div>
    <div><span className="label">What&apos;s inside (one item per line)</span><textarea value={contents} onChange={(e) => setContents(e.target.value)} rows={7} className="input" placeholder={"Lemon Tea Cake (200g)\nAnzac Cookies (200g)\nFestive gift box"} required />
      <div className="mt-2 flex gap-2"><select value={pick} onChange={(e) => setPick(e.target.value)} className="input !h-10 text-xs"><option value="">Add a product from the menu…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.variants[0]?.name}</option>)}</select><button type="button" onClick={addProduct} disabled={!pick} className="action secondary !h-10 shrink-0 disabled:opacity-40"><Plus size={14} /> Add</button></div></div>
    <Toggle label="Live on the website" checked={d.active} onChange={(v) => setD({ ...d, active: v })} />
    <button className="action h-12 w-full justify-center"><Check size={15} /> Save hamper</button>
  </form></Drawer>;
}

// ---------- social, settings, admins, history ----------

function SocialLinksPanel() {
  const links = useAppStore((s) => s.config.socialLinks);
  const run = useDispatch();
  const [form, setForm] = useState(links);
  return <div className="max-w-3xl">
    <Header title="Social links" copy="Paste your profile links. Icons appear in the header, contact section and footer, and a link left blank hides its icon." />
    <form onSubmit={(e) => { e.preventDefault(); void run({ type: "social.update", links: form }, "Social links saved"); }} className="mt-6 space-y-3">
      {(Object.keys(socialIcons) as Array<keyof typeof socialIcons>).map((k) => { const Icon = socialIcons[k]; return <label key={k} className="flex items-center gap-4 rounded-2xl border border-petal bg-white p-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-krust text-krust"><Icon size={20} /></span><span className="min-w-0 flex-1"><span className="label">{socialLabels[k]}</span><input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={k === "whatsapp" ? "https://wa.me/919840477330" : `https://${k === "twitter" ? "x" : k}.com/yourpage`} className="input" /></span></label>; })}
      <button className="action"><Check size={15} /> Save social links</button>
    </form>
  </div>;
}

function GoogleLoginPanel() {
  const saved = useAppStore((s) => s.config.settings.googleClientId);
  const run = useDispatch();
  const [clientId, setClientId] = useState(saved);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return <Panel title="Customer Google login">
    <div className="mb-4 flex items-center gap-2"><span className={`badge ${saved ? "bg-mint text-[#2f7a4a]" : "bg-butter text-[#8a5a13]"}`}>{saved ? "Active on storefront" : "Not set up"}</span></div>
    <form onSubmit={(e) => { e.preventDefault(); void run({ type: "settings.update", patch: { googleClientId: clientId.trim() } }, clientId.trim() ? "Google login enabled" : "Google login turned off"); }} className="space-y-3">
      <Field label="Google OAuth Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="1234567890-abc123.apps.googleusercontent.com" />
      <button className="action"><Check size={15} /> Save</button>
    </form>
    <details className="mt-4 rounded-xl bg-cream p-4 text-xs leading-6 text-cocoa"><summary className="cursor-pointer font-extrabold text-ink">How to get a Client ID (free)</summary><ol className="mt-2 list-decimal space-y-1 pl-5">
      <li>Open <b>console.cloud.google.com</b> and create a project (e.g. &ldquo;Krust website&rdquo;).</li>
      <li>Go to <b>APIs &amp; Services → OAuth consent screen</b>, choose <b>External</b>, fill in the app name and your email, and publish it.</li>
      <li>Go to <b>Credentials → Create credentials → OAuth client ID</b>, type <b>Web application</b>.</li>
      <li>Under <b>Authorised JavaScript origins</b> add <b>{origin || "your site address"}</b>{origin.includes("127.0.0.1") && <> and <b>http://localhost:5173</b></>} (and your live site address later).</li>
      <li>Click Create, copy the <b>Client ID</b> and paste it above.</li>
    </ol></details>
  </Panel>;
}

function StoreSettingsPanel() {
  const settings = useAppStore((s) => s.config.settings);
  const run = useDispatch();
  const [min, setMin] = useState(settings.minimumOrder);
  const [fee, setFee] = useState(settings.deliveryFee);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const isDev = useAppStore((s) => s.me?.role === "DEV_ADMIN");
  return <div className="max-w-3xl space-y-5">
    {isDev && <GoogleLoginPanel />}
    <Header title="Settings" copy="Ordering rules and your own account security." />
    <Panel title="Ordering"><form onSubmit={(e) => { e.preventDefault(); void run({ type: "settings.update", patch: { minimumOrder: min, deliveryFee: fee } }, "Ordering settings saved"); }} className="grid gap-4 sm:grid-cols-2"><Field label="Minimum delivery order (₹)" type="number" min={0} value={min} onChange={(e) => setMin(Number(e.target.value))} /><Field label="Delivery fee (₹)" type="number" min={0} value={fee} onChange={(e) => setFee(Number(e.target.value))} /><button className="action sm:col-span-2 sm:w-fit"><Check size={15} /> Save</button></form></Panel>
    <Panel title="Change my password"><form onSubmit={(e) => { e.preventDefault(); if (pw.next !== pw.confirm) return void toast.error("New passwords do not match"); void run({ type: "admin.changeOwnPassword", current: pw.current, next: pw.next }, "Password changed").then((ok) => ok && setPw({ current: "", next: "", confirm: "" })); }} className="grid gap-4 sm:grid-cols-3"><Field label="Current password" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /><Field label="New password" type="password" autoComplete="new-password" minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /><Field label="Confirm new password" type="password" autoComplete="new-password" minLength={8} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required /><button className="action sm:col-span-3 sm:w-fit"><KeyRound size={15} /> Update password</button></form></Panel>
  </div>;
}

function AdminUsers() {
  const admins = useAppStore((s) => s.admin!.admins);
  const me = useAppStore((s) => s.me!);
  const run = useDispatch();
  const [open, setOpen] = useState(false);
  const isDev = me.role === "DEV_ADMIN";
  const create = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const d = new FormData(e.currentTarget); if (await run({ type: "admin.create", name: String(d.get("name")), username: String(d.get("username")), password: String(d.get("password")), role: String(d.get("role")) as AdminUser["role"] }, "Admin account created")) setOpen(false); };
  return <div>
    <Header title="Admin users" copy={isDev ? "Create super admin and sales admin logins, reset passwords and switch access on or off." : "Only the dev admin can create or change admin accounts."} action={isDev ? <button onClick={() => setOpen(true)} className="action"><UserPlus size={15} /> Create admin</button> : undefined} />
    <div className="mt-6 grid gap-4 md:grid-cols-2">{admins.map((u) => <article key={u.id} className="rounded-2xl border border-petal bg-white p-5"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full bg-blush text-xs font-bold text-krust">{u.name.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{u.name} {u.id === me.id && <span className="text-krust">(you)</span>}</p><p className="text-[11px] text-cocoa">@{u.username} · {ROLE_LABELS[u.role]}{u.id === "root-admin" && " · main"}</p></div><span className={`badge ml-auto ${u.active ? "bg-mint text-[#2f7a4a]" : "bg-[#eee] text-[#777]"}`}>{u.active ? "Active" : "Off"}</span></div>
      {isDev && u.id !== "root-admin" && <div className="mt-4 flex flex-wrap gap-2 border-t border-petal pt-4"><Toggle label="Access" checked={u.active} onChange={(v) => void run({ type: "admin.update", id: u.id, active: v }, v ? "Access enabled" : "Access disabled")} /><select value={u.role} onChange={(e) => void run({ type: "admin.update", id: u.id, role: e.target.value as AdminUser["role"] }, "Role updated")} className="rounded-lg border border-petal px-2 text-[11px] font-bold">{(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select><button onClick={() => { const pw = prompt(`New password for ${u.username} (min 8 characters):`); if (pw) void run({ type: "admin.update", id: u.id, password: pw }, "Password reset"); }} className="ml-auto flex items-center gap-1 rounded-lg border border-petal px-3 py-2 text-[10px] font-bold text-krust"><KeyRound size={12} /> Reset password</button>{u.id !== me.id && <button onClick={() => confirm(`Delete admin ${u.username}?`) && void run({ type: "admin.delete", id: u.id }, "Admin deleted")} aria-label="Delete admin" className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-white"><Trash2 size={13} /></button>}</div>}
    </article>)}</div>
    {open && <Drawer title="Create admin account" onClose={() => setOpen(false)}><form onSubmit={create} className="space-y-4"><Field name="name" label="Full name" required /><Field name="username" label="User ID" required pattern="[a-zA-Z0-9._\-]{3,40}" title="3–40 letters, numbers, dots or dashes" autoComplete="off" /><Field name="password" label="Password (min 8 characters)" type="password" minLength={8} required autoComplete="new-password" /><label className="block"><span className="label">Role</span><select name="role" className="input"><option value="SALES_ADMIN">Sales admin: orders, customers &amp; payments</option><option value="SUPER_ADMIN">Super admin: overview, orders, GST, payments, settings, history</option><option value="DEV_ADMIN">Dev admin: full control of the website</option></select></label><button className="action h-12 w-full justify-center">Create account</button></form></Drawer>}
  </div>;
}

function History() {
  const audit = useAppStore((s) => s.admin!.audit);
  const [query, setQuery] = useState("");
  const rows = useMemo(() => audit.filter((a: AuditEntry) => `${a.action} ${a.entity} ${a.detail} ${a.actor}`.toLowerCase().includes(query.toLowerCase())), [audit, query]);
  return <div>
    <Header title="Working history" copy="Every order, product, category, content, settings and login change, with who did it and when." action={<button onClick={() => downloadXlsx("krust-history", { History: rows.map((a) => ({ Time: fmtDate(a.at), "Changed by": a.actor, Action: a.action, Item: a.entity, Details: a.detail })) })} className="action"><Download size={14} /> Export XL</button>} />
    <div className="mt-6 flex h-11 max-w-md items-center gap-2 rounded-xl border border-petal bg-white px-3"><Search size={15} className="text-cocoa" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search history" className="w-full bg-transparent text-xs outline-none" /></div>
    <div className="mt-4 overflow-hidden rounded-2xl border border-petal bg-white"><div className="divide-y divide-petal/60">{rows.map((a) => <div key={a.id} className="grid gap-2 p-4 sm:grid-cols-[170px_1fr_1.3fr]"><p className="text-[11px] text-cocoa">{fmtDate(a.at)}</p><div><p className="text-xs font-bold">{a.action}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-krust">by {a.actor}</p></div><p className="text-xs"><b>{a.entity}</b><br /><span className="text-[11px] text-cocoa">{a.detail}</span></p></div>)}</div>{!rows.length && <p className="p-10 text-center text-xs text-cocoa">No history yet.</p>}</div>
  </div>;
}

// ---------- primitives ----------

function ImageField({ label, value, onChange, contain = false }: { label: string; value: string; onChange: (v: string) => void; contain?: boolean }) {
  const upload = useAppStore((s) => s.upload);
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => { if (!file) return; setBusy(true); const url = await upload(file); setBusy(false); if (url) { onChange(url); toast.success("Image uploaded"); } };
  return <div><span className="label">{label}</span><div className="flex gap-3"><div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-petal bg-cream">{value && <img src={value} alt="" className={`h-full w-full ${contain ? "object-contain p-1" : "object-cover"}`} />}</div><div className="min-w-0 flex-1 space-y-2"><label className={`flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-krust/50 text-xs font-bold text-krust hover:bg-blush ${busy ? "opacity-60" : ""}`}><Upload size={14} /> {busy ? "Uploading…" : "Upload image"}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" disabled={busy} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} /></label><input value={value} onChange={(e) => onChange(e.target.value)} placeholder="…or paste an image URL" className="input !h-9 text-xs" /></div></div></div>;
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc); }, [onClose]);
  return <div className="fixed inset-0 z-[70] flex justify-end bg-ink/35 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}><button onClick={onClose} className="absolute inset-0" aria-label="Close" /><aside className="relative h-full w-full max-w-xl overflow-y-auto border-l-4 border-krust bg-cream p-6 shadow-2xl sm:p-8" style={{ animation: "slide-in-right .4s cubic-bezier(.2,.8,.2,1) both" }}><div className="mb-7 flex items-center justify-between"><h2 className="text-3xl">{title}</h2><button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full border border-petal bg-white"><X size={17} /></button></div>{children}</aside></div>;
}
function Header({ title, copy, action }: { title: string; copy: string; action?: React.ReactNode }) { return <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h2 className="text-3xl sm:text-4xl">{title}</h2><p className="mt-1 max-w-2xl text-sm text-cocoa">{copy}</p></div>{action}</div>; }
function Panel({ title, children, action, onAction, className = "" }: { title: string; children: React.ReactNode; action?: string; onAction?: () => void; className?: string }) { return <section className={`rounded-2xl border border-petal bg-white p-5 ${className}`}><div className="mb-4 flex items-center justify-between"><h3 className="text-lg">{title}</h3>{action && <button onClick={onAction} className="flex items-center gap-1 text-[11px] font-bold text-krust">{action}<ChevronRight size={13} /></button>}</div>{children}</section>; }
function Metric({ label, value, icon: Icon, tint, onClick }: { label: string; value: string; icon: typeof LayoutDashboard; tint: string; onClick?: () => void }) { return <button onClick={onClick} disabled={!onClick} className={`lift rounded-2xl border border-petal p-5 text-left disabled:cursor-default ${tint}`}><div className="flex items-start justify-between"><p className="text-[11px] font-bold uppercase tracking-wider text-cocoa">{label}</p><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-krust"><Icon size={17} /></span></div><p className="mt-4 font-display text-3xl">{value}</p></button>; }
function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="block"><span className="label">{label}</span><input {...props} className="input" /></label>; }
function FieldSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) { return <label className="block"><span className="label">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="input">{options.map((o) => <option key={o} value={o}>{o.replaceAll("_", " ")}</option>)}</select></label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) { return <label className="flex cursor-pointer items-center gap-2 text-xs font-bold"><button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-krust" : "bg-petal"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} /></button>{label}</label>; }
function Row({ k, v }: { k: string; v: string }) { return <div className="flex justify-between text-cocoa"><span>{k}</span><span>{v}</span></div>; }
function Empty({ icon: Icon, text }: { icon: typeof Trash2; text: string }) { return <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-petal bg-white text-center"><div><Icon className="mx-auto text-krust/40" /><p className="mt-3 text-sm font-bold">{text}</p></div></div>; }
