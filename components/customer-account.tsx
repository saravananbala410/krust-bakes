"use client";

import Link from "next/link";
import { ArrowRight, Check, ChefHat, CreditCard, Download, FileText, LogOut, PackageCheck, Search, ShoppingBag, Truck, UserRound, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCustomerStore } from "@/lib/customer-store";
import { formatInr } from "@/lib/gst";
import { payOnline } from "@/lib/razorpay-client";
import { downloadReceiptFor } from "@/lib/receipt-pdf";
import type { CustomerOrder } from "@/lib/store-core";

type GoogleId = {
  initialize: (options: { client_id: string; callback: (response: { credential: string }) => void; ux_mode?: "popup"; auto_select?: boolean }) => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
};
declare global { interface Window { google?: { accounts: { id: GoogleId } } } }

let gsiScript: Promise<void> | null = null;
function loadGoogleScript() {
  gsiScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { gsiScript = null; reject(new Error("Could not load Google sign-in")); };
    document.head.appendChild(script);
  });
  return gsiScript;
}

/** Official "Sign in with Google" button (Google Identity Services). */
export function GoogleButton({ clientId, onDone }: { clientId: string; onDone?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const signIn = useCustomerStore((s) => s.signIn);
  const [failed, setFailed] = useState("");
  useEffect(() => {
    let cancelled = false;
    loadGoogleScript().then(() => {
      if (cancelled || !ref.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: "popup",
        callback: async ({ credential }) => {
          const error = await signIn(credential);
          if (error) toast.error(error);
          else { toast.success("Signed in. Welcome to Krust!"); onDone?.(); }
        },
      });
      window.google.accounts.id.renderButton(ref.current, { theme: "outline", size: "large", shape: "pill", text: "continue_with", width: 300, logo_alignment: "left" });
    }).catch((e: Error) => setFailed(e.message));
    return () => { cancelled = true; };
  }, [clientId, signIn, onDone]);
  return <div>{failed ? <p className="text-xs font-bold text-krust">{failed}</p> : <div ref={ref} className="flex min-h-11 justify-center" />}</div>;
}

const STEPS = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
const STEP_LABEL: Record<string, string> = { PENDING: "Order placed", CONFIRMED: "Confirmed", PREPARING: "Baking", OUT_FOR_DELIVERY: "On the way", DELIVERED: "Delivered", CANCELLED: "Cancelled" };
const STEP_ICON = [ShoppingBag, Check, ChefHat, Truck, PackageCheck];

function OrderCard({ order, online = false }: { order: CustomerOrder; online?: boolean }) {
  const step = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  const cancelled = order.status === "CANCELLED";
  const paid = order.paymentStatus === "PAID";
  const refresh = useCustomerStore((s) => s.refresh);
  const [paying, setPaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const download = async () => { setSaving(true); try { await downloadReceiptFor(order.id, order.token); } catch (e) { toast.error((e as Error).message); } setSaving(false); };
  const canPay = online && !paid && !cancelled && order.paymentMethod === "RAZORPAY";
  const pay = async () => {
    setPaying(true);
    const result = await payOnline(order.id, order.token);
    setPaying(false);
    if (result.status === "paid") toast.success("Payment received. Your receipt is ready.");
    else if (result.status === "failed") toast.error(result.message);
    void refresh();
  };
  return (
    <article className="rounded-2xl border-2 border-petal bg-white p-5 transition hover:border-krust/60">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-extrabold text-krust">{order.id}</p><p className="mt-0.5 text-[11px] font-semibold text-cocoa">{new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}{order.deliveryDate && ` · Delivery ${new Date(`${order.deliveryDate}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}</p></div>
        <p className="font-display text-xl font-extrabold">{formatInr(order.total)}</p>
      </div>
      <p className="mt-3 line-clamp-2 text-xs font-medium text-cocoa">{order.lines.map((l) => `${l.quantity} × ${l.productName}`).join(", ")}</p>
      {cancelled ? <p className="badge mt-4 bg-[#eee] text-[#666]">Cancelled</p> : (
        <div className="mt-5">
          <div className="flex items-center">{STEPS.map((s, i) => { const Icon = STEP_ICON[i]; const done = i <= step; return <div key={s} className="flex flex-1 items-center last:flex-none"><span title={STEP_LABEL[s]} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${done ? "bg-krust text-white" : "bg-cream text-cocoa/50"} ${i === step ? "pulse-ring" : ""}`}><Icon size={14} /></span>{i < STEPS.length - 1 && <span className={`mx-1 h-1 flex-1 rounded-full ${i < step ? "bg-krust" : "bg-petal"}`} />}</div>; })}</div>
          <p className="mt-3 text-xs font-extrabold text-ink">{STEP_LABEL[order.status] ?? order.status} <span className="font-semibold text-cocoa">· Payment {order.paymentStatus.toLowerCase()}</span></p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {paid ? <><button onClick={() => void download()} disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-krust px-4 text-xs font-extrabold text-white hover:bg-krust-deep disabled:opacity-60"><Download size={13} /> {saving ? "Preparing…" : "Download receipt"}</button><Link href={`/invoice/${order.id}?t=${order.token}`} className="inline-flex items-center gap-1.5 text-xs font-extrabold text-krust hover:underline"><FileText size={13} /> View</Link></>
          : <Link href={`/invoice/${order.id}?t=${order.token}`} className="inline-flex items-center gap-1.5 text-xs font-extrabold text-krust hover:underline"><FileText size={13} /> GST invoice</Link>}
        {canPay && <button onClick={() => void pay()} disabled={paying} className="inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-krust px-4 text-xs font-extrabold text-krust hover:bg-blush disabled:opacity-60"><CreditCard size={13} /> {paying ? "Opening…" : `Pay ${formatInr(order.total)} now`}</button>}
        {paid && order.paidAt && <span className="text-[11px] font-semibold text-[#2f7a4a]">Paid {new Date(order.paidAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>}
      </div>
    </article>
  );
}

function TrackOrder() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CustomerOrder | null>(null);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true); setResult(null);
    const response = await fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: data.get("id"), phone: data.get("phone") }) });
    const body = (await response.json()) as { order?: CustomerOrder; error?: string };
    setBusy(false);
    if (body.order) setResult(body.order); else toast.error(body.error ?? "Order not found");
  };
  return <div>
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input name="id" required placeholder="Order ID e.g. KA-1054" className="input" /><input name="phone" required type="tel" placeholder="Phone used on order" className="input" /><button disabled={busy} className="action justify-center"><Search size={14} /> {busy ? "…" : "Track"}</button></form>
    {result && <div className="fade-in mt-4"><OrderCard order={result} /></div>}
  </div>;
}

/** Slide-over for customer sign-in, order history and guest tracking. */
export function AccountSheet({ clientId, online = false }: { clientId: string; online?: boolean }) {
  const { customer, orders, setAccountOpen, signOut } = useCustomerStore();
  const close = () => setAccountOpen(false);
  useEffect(() => { const esc = (e: KeyboardEvent) => e.key === "Escape" && setAccountOpen(false); window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc); }, [setAccountOpen]);
  return <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Your account"><button onClick={close} className="absolute inset-0 cursor-default" aria-label="Close" /><aside className="relative h-full w-full max-w-[560px] overflow-y-auto bg-cream shadow-2xl" style={{ animation: "slide-in-right .45s cubic-bezier(.2,.8,.2,1) both" }}>
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-petal bg-cream/95 px-5 py-5 backdrop-blur sm:px-8"><div><p className="eyebrow">Your Krust account</p><h2 className="text-3xl">{customer ? "My orders" : "Sign in"}</h2></div><button onClick={close} className="grid h-10 w-10 place-items-center rounded-full border border-petal bg-white" aria-label="Close"><X size={18} /></button></div>
    <div className="px-5 py-7 sm:px-8">
      {customer ? <>
        <div className="flex items-center gap-4 rounded-3xl border-2 border-krust bg-white p-5">
          {customer.picture ? <img src={customer.picture} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full border-2 border-krust object-cover" /> : <span className="grid h-14 w-14 place-items-center rounded-full bg-krust text-white"><UserRound size={22} /></span>}
          <div className="min-w-0 flex-1"><p className="truncate text-lg font-extrabold">{customer.name}</p><p className="truncate text-xs font-semibold text-cocoa">{customer.email}</p></div>
          <button onClick={() => void signOut().then(() => toast.success("Signed out"))} className="flex items-center gap-1.5 rounded-full border border-petal px-3 py-2 text-[11px] font-extrabold text-krust hover:border-krust"><LogOut size={13} /> Sign out</button>
        </div>
        <div className="mt-6 space-y-3">{orders.map((o) => <OrderCard key={o.id} order={o} online={online} />)}</div>
        {!orders.length && <div className="mt-6 rounded-3xl border-2 border-dashed border-petal bg-white p-10 text-center"><ShoppingBag className="mx-auto text-krust" /><p className="mt-3 font-display text-xl">No orders yet</p><p className="mt-1 text-xs text-cocoa">Your orders will appear here with live status and GST invoices.</p><a href="#menu" onClick={close} className="action mt-5">Start shopping <ArrowRight size={14} /></a></div>}
      </> : <>
        <div className="rounded-3xl border-2 border-krust bg-white p-6 text-center sm:p-8">
          <p className="font-display text-2xl">Welcome to Krust</p>
          <p className="mx-auto mt-2 max-w-xs text-sm font-medium text-cocoa">Sign in to see all your orders, follow their status live and download GST invoices any time.</p>
          <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left text-xs font-bold">{["Order history in one place", "Live order status", "Faster checkout with saved details"].map((t) => <li key={t} className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-krust text-white"><Check size={11} /></span>{t}</li>)}</ul>
          <div className="mt-6">{clientId ? <GoogleButton clientId={clientId} /> : <p className="rounded-xl bg-cream p-3 text-xs font-bold text-cocoa">Google sign-in is coming soon.</p>}</div>
          <p className="mt-4 text-[10px] font-medium text-cocoa">We only use your name and email. You can still order as a guest.</p>
        </div>
        <div className="mt-8"><p className="eyebrow">Ordered as a guest?</p><h3 className="mt-2 text-xl">Track your order</h3><p className="mb-4 mt-1 text-xs text-cocoa">Enter the order ID from your confirmation and the phone number you used.</p><TrackOrder /></div>
      </>}
    </div>
  </aside></div>;
}
