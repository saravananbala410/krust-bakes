"use client";

import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { use, useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/social-icons";
import { downloadReceiptPdf } from "@/lib/receipt-pdf";
import { calculateInclusiveGst } from "@/lib/gst";
import type { Branding, StoreOrder, StoreSettings } from "@/lib/store-core";

type InvoiceData = { order: StoreOrder; settings: StoreSettings; branding: Branding };

const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function words(n: number): string {
  if (n < 20) return ones[n];
  if (n < 100) return `${tens[Math.floor(n / 10)]} ${ones[n % 10]}`.trim();
  if (n < 1000) return `${ones[Math.floor(n / 100)]} Hundred ${words(n % 100)}`.trim();
  if (n < 100000) return `${words(Math.floor(n / 1000))} Thousand ${words(n % 1000)}`.trim();
  if (n < 10000000) return `${words(Math.floor(n / 100000))} Lakh ${words(n % 100000)}`.trim();
  return `${words(Math.floor(n / 10000000))} Crore ${words(n % 10000000)}`.trim();
}
const money = (n: number) => `₹${n.toFixed(2)}`;

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<InvoiceData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("t") ?? "";
    fetch(`/api/orders/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (r) => { const body = (await r.json()) as InvoiceData & { error?: string }; if (!r.ok) throw new Error(body.error ?? "Invoice unavailable"); setData(body); })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) return <main className="grid min-h-screen place-items-center bg-cream p-6 text-center"><div><h1 className="text-3xl">Invoice unavailable</h1><p className="mt-2 text-sm text-cocoa">{error}</p><Link href="/" className="action mt-6">Back to the bakery</Link></div></main>;
  if (!data) return <main className="grid min-h-screen place-items-center bg-cream"><div className="h-10 w-10 animate-spin rounded-full border-4 border-petal border-t-krust" /></main>;

  const { order, settings, branding } = data;
  const rows = order.lines.map((l) => ({ ...l, amount: l.unitPrice * l.quantity, tax: calculateInclusiveGst(l.unitPrice * l.quantity, l.gstRate) }));
  const taxable = rows.reduce((s, r) => s + r.tax.taxableValue, 0);
  const cgst = rows.reduce((s, r) => s + r.tax.cgst, 0);
  const sgst = rows.reduce((s, r) => s + r.tax.sgst, 0);
  const itemsTotal = rows.reduce((s, r) => s + r.amount, 0);
  const deliveryFee = Math.max(0, order.total - itemsTotal);
  const created = new Date(order.createdAt);
  const paid = order.paymentStatus === "PAID";
  const method = order.paymentMethod === "RAZORPAY" ? "Online (Razorpay)" : order.paymentMethod.replaceAll("_", " ");
  const waNumber = branding.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1");

  return <main className="min-h-screen bg-[#f3ecea] px-4 py-6 sm:px-8 sm:py-10">
    <div className="no-print mx-auto mb-5 flex max-w-[900px] items-center justify-between gap-3"><Link href="/" className="flex items-center gap-2 text-xs font-bold text-cocoa"><ArrowLeft size={15} /> Back</Link><div className="flex gap-2"><button onClick={() => window.print()} className="flex h-10 items-center gap-2 rounded-xl border border-petal bg-white px-4 text-xs font-bold"><Printer size={15} /> Print</button><button onClick={() => void downloadReceiptPdf(data)} className="action h-10"><Download size={15} /> {paid ? "Download receipt" : "Download PDF"}</button></div></div>
    <article className="mx-auto max-w-[900px] border-t-[6px] border-krust bg-white p-6 shadow-[0_20px_70px_rgba(61,40,31,.14)] sm:p-12 print:shadow-none">
      <header className="flex flex-col justify-between gap-8 border-b-2 border-ink pb-8 sm:flex-row sm:items-start"><div><img src={branding.wordmarkUrl} alt={branding.storeName} className="h-auto w-[220px]" /><p className="mt-4 max-w-sm text-xs leading-5 text-cocoa">{settings.legalName}<br />{branding.address}<br />{branding.phone} · {branding.email}</p></div><div className="sm:text-right"><p className="font-display text-4xl">{paid ? "Tax invoice & receipt" : "Tax invoice"}</p><p className="mt-3 text-sm font-bold">#{order.id}</p><p className="mt-1 text-xs text-cocoa">{created.toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}</p><span className={`badge mt-3 ${order.paymentStatus === "PAID" ? "bg-mint text-[#2f7a4a]" : "bg-butter text-[#8a5a13]"}`}>{order.paymentStatus} · {method}</span></div></header>
      <section className="grid gap-6 border-b border-petal py-7 sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-cocoa">Billed &amp; delivered to</p><p className="mt-3 text-sm font-bold">{order.customer}</p><p className="mt-1 text-xs leading-5 text-cocoa">{order.phone}{order.email && <><br />{order.email}</>}<br />{order.address}{order.pincode && ` – ${order.pincode}`}</p></div><div className="sm:text-right"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-cocoa">Delivery</p><p className="mt-3 text-sm font-bold">{order.deliveryDate ? new Date(`${order.deliveryDate}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "long" }) : ""}</p><p className="mt-1 text-xs leading-5 text-cocoa">{order.slot}{order.customerNote && <><br />Note: “{order.customerNote}”</>}</p></div></section>
      <div className="mt-7 overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="bg-ink text-[10px] uppercase tracking-[.12em] text-white"><th className="px-4 py-3">Description</th><th className="px-4 py-3">HSN</th><th className="px-4 py-3 text-center">Qty</th><th className="px-4 py-3 text-right">Unit price</th><th className="px-4 py-3 text-right">Taxable</th><th className="px-4 py-3 text-right">GST</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-petal">{rows.map((r, i) => <tr key={i} className="text-xs"><td className="px-4 py-4"><p className="font-bold">{r.productName}</p><p className="mt-1 text-[10px] text-cocoa">{r.variantName}</p></td><td className="px-4 py-4 text-cocoa">{r.hsn ?? "1905"}</td><td className="px-4 py-4 text-center">{r.quantity}</td><td className="px-4 py-4 text-right">{money(r.unitPrice)}</td><td className="px-4 py-4 text-right">{money(r.tax.taxableValue)}</td><td className="px-4 py-4 text-right">{r.gstRate}%<br /><span className="text-[10px] text-cocoa">{money(r.tax.gstAmount)}</span></td><td className="px-4 py-4 text-right font-bold">{money(r.amount)}</td></tr>)}</tbody></table></div>
      <section className="mt-7 ml-auto max-w-sm space-y-3 text-xs"><div className="flex justify-between"><span className="text-cocoa">Taxable value</span><span>{money(taxable)}</span></div><div className="flex justify-between"><span className="text-cocoa">CGST</span><span>{money(cgst)}</span></div><div className="flex justify-between"><span className="text-cocoa">SGST</span><span>{money(sgst)}</span></div><div className="flex justify-between"><span className="text-cocoa">Delivery fee</span><span>{money(deliveryFee)}</span></div><div className="flex justify-between border-t-2 border-ink pt-4 text-lg font-bold"><span>Total</span><span>{money(order.total)}</span></div><p className="text-right text-[10px] text-cocoa">Indian Rupees {words(Math.round(order.total))} Only</p></section>
      {paid && <section className="mt-8 rounded-2xl border-2 border-[#2f7a4a]/40 bg-mint/50 p-5 text-xs"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#2f7a4a]">Payment receipt</p><div className="mt-3 grid gap-3 sm:grid-cols-4"><div><p className="text-cocoa">Amount paid</p><p className="mt-0.5 text-sm font-bold">{money(order.total)}</p></div><div><p className="text-cocoa">Paid on</p><p className="mt-0.5 font-bold">{order.paidAt ? new Date(order.paidAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</p></div><div><p className="text-cocoa">Method</p><p className="mt-0.5 font-bold">{method}</p></div><div><p className="text-cocoa">Payment ID</p><p className="mt-0.5 break-all font-bold">{order.paymentId ?? "—"}</p></div></div></section>}
      <footer className="mt-12 grid gap-6 border-t border-petal pt-7 sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-cocoa">Business details</p><p className="mt-2 text-[10px] leading-5 text-cocoa">{settings.gstin && <>GSTIN: {settings.gstin}<br /></>}{settings.fssai && <>FSSAI: {settings.fssai}<br /></>}Place of supply: {settings.placeOfSupply}</p></div><div className="sm:text-right"><p className="font-hero text-4xl text-krust">Thank you</p><p className="mt-2 text-[10px] leading-4 text-cocoa">This is a computer-generated invoice and does not require a signature.</p></div></footer>
    </article>
    <a className="no-print mx-auto mt-5 flex max-w-[900px] items-center justify-center gap-2 rounded-xl bg-[#25d366] py-3 text-xs font-bold text-white" href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi Krust, regarding order ${order.id}`)}`} target="_blank" rel="noreferrer"><WhatsAppIcon size={15} /> Send order details via WhatsApp</a>
  </main>;
}
