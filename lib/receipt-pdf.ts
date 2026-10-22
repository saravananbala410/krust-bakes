"use client";

import { calculateInclusiveGst } from "./gst";
import type { Branding, StoreOrder, StoreSettings } from "./store-core";

type InvoiceData = { order: StoreOrder; settings: StoreSettings; branding: Branding };

const RED: [number, number, number] = [236, 36, 39];
const INK: [number, number, number] = [43, 26, 20];
const MUTED: [number, number, number] = [107, 84, 70];
const GREEN: [number, number, number] = [47, 122, 74];

// The built-in PDF fonts have no ₹ glyph, so amounts use "Rs."
const rs = (n: number) => `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

async function imageData(url: string) {
  try {
    const blob = await (await fetch(url)).blob();
    const dataUrl = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(blob); });
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    return { dataUrl, ratio: img.naturalWidth / img.naturalHeight };
  } catch {
    return null;
  }
}

/** Builds the tax invoice + payment receipt as a real PDF file and downloads it. */
export async function downloadReceiptPdf({ order, settings, branding }: InvoiceData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 16, R = W - M;
  const paid = order.paymentStatus === "PAID";
  const method = order.paymentMethod === "RAZORPAY" ? "Online (Razorpay)" : order.paymentMethod.replaceAll("_", " ");
  const text = (s: string, x: number, y: number, o: { size?: number; bold?: boolean; color?: [number, number, number]; align?: "left" | "right" | "center"; maxWidth?: number } = {}) => {
    doc.setFont("helvetica", o.bold ? "bold" : "normal");
    doc.setFontSize(o.size ?? 9);
    doc.setTextColor(...(o.color ?? INK));
    doc.text(s, x, y, { align: o.align ?? "left", maxWidth: o.maxWidth });
  };

  // Header
  doc.setFillColor(...RED);
  doc.rect(0, 0, W, 4, "F");
  let y = 16;
  const logo = await imageData(branding.wordmarkUrl);
  if (logo) doc.addImage(logo.dataUrl, "PNG", M, y - 6, 48, 48 / logo.ratio);
  else text(branding.storeName, M, y, { size: 16, bold: true, color: RED });
  const addressLines = doc.splitTextToSize(branding.address, 80) as string[];
  let ly = y + (logo ? 48 / logo.ratio : 4);
  [settings.legalName, ...addressLines, `${branding.phone} · ${branding.email}`].forEach((line) => { text(line, M, ly, { size: 8, color: MUTED }); ly += 4; });
  text(paid ? "TAX INVOICE & RECEIPT" : "TAX INVOICE", R, y, { size: 15, bold: true, align: "right" });
  text(`#${order.id}`, R, y + 7, { size: 10, bold: true, align: "right" });
  text(new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" }), R, y + 12, { size: 8, color: MUTED, align: "right" });
  text(`${order.paymentStatus} · ${method}`, R, y + 17, { size: 8, bold: true, color: paid ? GREEN : MUTED, align: "right" });
  y = Math.max(ly, y + 22) + 4;
  doc.setDrawColor(...INK); doc.setLineWidth(0.5); doc.line(M, y, R, y);

  // Billed to / delivery
  y += 8;
  text("BILLED & DELIVERED TO", M, y, { size: 7, bold: true, color: MUTED });
  text("DELIVERY", R, y, { size: 7, bold: true, color: MUTED, align: "right" });
  y += 5;
  text(order.customer, M, y, { size: 10, bold: true });
  if (order.deliveryDate) text(new Date(`${order.deliveryDate}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "long" }), R, y, { size: 10, bold: true, align: "right" });
  y += 5;
  const billLines = [order.phone, order.email, ...(doc.splitTextToSize(`${order.address}${order.pincode ? ` - ${order.pincode}` : ""}`, 95) as string[])].filter(Boolean) as string[];
  billLines.forEach((line, i) => text(line, M, y + i * 4, { size: 8, color: MUTED }));
  if (order.customerNote) text(doc.splitTextToSize(`Note: "${order.customerNote}"`, 70) as unknown as string, R, y, { size: 8, color: MUTED, align: "right" });
  y += billLines.length * 4 + 6;

  // Items table
  const cols = [{ h: "Description", x: M + 2 }, { h: "HSN", x: 94 }, { h: "Qty", x: 110, a: "right" as const }, { h: "Unit price", x: 132, a: "right" as const }, { h: "Taxable", x: 155, a: "right" as const }, { h: "GST", x: 170, a: "right" as const }, { h: "Amount", x: R - 2, a: "right" as const }];
  doc.setFillColor(...INK); doc.rect(M, y, R - M, 8, "F");
  cols.forEach((c) => text(c.h.toUpperCase(), c.x, y + 5.3, { size: 7, bold: true, color: [255, 255, 255], align: c.a }));
  y += 8;
  let taxable = 0, cgst = 0, sgst = 0, itemsTotal = 0;
  for (const l of order.lines) {
    const amount = l.unitPrice * l.quantity;
    const tax = calculateInclusiveGst(amount, l.gstRate);
    taxable += tax.taxableValue; cgst += tax.cgst; sgst += tax.sgst; itemsTotal += amount;
    if (y > 250) { doc.addPage(); y = 20; }
    const name = doc.splitTextToSize(l.productName, 72) as string[];
    const rowH = Math.max(10, name.length * 4 + 6);
    text(name.join("\n"), cols[0].x, y + 5, { size: 8.5, bold: true });
    text(l.variantName, cols[0].x, y + 5 + name.length * 4, { size: 7, color: MUTED });
    text(l.hsn ?? "1905", cols[1].x, y + 5, { size: 8, color: MUTED });
    text(String(l.quantity), cols[2].x, y + 5, { size: 8.5, align: "right" });
    text(rs(l.unitPrice), cols[3].x, y + 5, { size: 8.5, align: "right" });
    text(rs(tax.taxableValue), cols[4].x, y + 5, { size: 8.5, align: "right" });
    text(`${l.gstRate}%`, cols[5].x, y + 5, { size: 8.5, align: "right" });
    text(rs(amount), cols[6].x, y + 5, { size: 8.5, bold: true, align: "right" });
    y += rowH;
    doc.setDrawColor(240, 220, 192); doc.setLineWidth(0.2); doc.line(M, y, R, y);
  }

  // Totals
  y += 6;
  const deliveryFee = Math.max(0, order.total - itemsTotal);
  [["Taxable value", taxable], ["CGST", cgst], ["SGST", sgst], ["Delivery fee", deliveryFee]].forEach(([k, v]) => { text(String(k), 128, y, { size: 8.5, color: MUTED }); text(rs(Number(v)), R, y, { size: 8.5, align: "right" }); y += 5; });
  doc.setDrawColor(...INK); doc.setLineWidth(0.5); doc.line(128, y, R, y);
  y += 6;
  text("Total", 128, y, { size: 12, bold: true });
  text(rs(order.total), R, y, { size: 12, bold: true, align: "right" });
  y += 5;
  text(`Indian Rupees ${words(Math.round(order.total))} Only`, R, y, { size: 7, color: MUTED, align: "right" });

  // Payment receipt
  if (paid) {
    y += 10;
    doc.setFillColor(228, 242, 230); doc.setDrawColor(...GREEN); doc.setLineWidth(0.4);
    doc.roundedRect(M, y, R - M, 24, 3, 3, "FD");
    text("PAYMENT RECEIPT", M + 5, y + 7, { size: 7.5, bold: true, color: GREEN });
    const cells: Array<[string, string]> = [["Amount paid", rs(order.total)], ["Paid on", order.paidAt ? new Date(order.paidAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-"], ["Method", method], ["Payment ID", order.paymentId ?? "-"]];
    cells.forEach(([k, v], i) => { const x = M + 5 + i * 45; text(k, x, y + 14, { size: 7.5, color: MUTED }); text(v, x, y + 19, { size: 8.5, bold: true, maxWidth: 42 }); });
    y += 24;
  }

  // Footer
  y = Math.max(y + 16, 262);
  doc.setDrawColor(240, 220, 192); doc.setLineWidth(0.3); doc.line(M, y, R, y);
  y += 6;
  text("BUSINESS DETAILS", M, y, { size: 7, bold: true, color: MUTED });
  [settings.gstin && `GSTIN: ${settings.gstin}`, settings.fssai && `FSSAI: ${settings.fssai}`, `Place of supply: ${settings.placeOfSupply}`].filter(Boolean).forEach((line, i) => text(String(line), M, y + 5 + i * 4, { size: 7.5, color: MUTED }));
  text("Thank you for choosing fresh.", R, y + 4, { size: 11, bold: true, color: RED, align: "right" });
  text("This is a computer-generated invoice and does not require a signature.", R, y + 9, { size: 7, color: MUTED, align: "right" });

  doc.save(`Krust-${paid ? "receipt" : "invoice"}-${order.id}.pdf`);
}

/** Fetches the order (by its private token, or the signed-in customer's session) and downloads the PDF. */
export async function downloadReceiptFor(orderId: string, token: string) {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}?t=${encodeURIComponent(token)}`, { cache: "no-store", credentials: "same-origin" });
  const body = (await response.json()) as InvoiceData & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Could not load the receipt");
  await downloadReceiptPdf(body);
}
