"use client";

import type { Report } from "./server/analytics";
import type { Branding } from "./store-core";
import { imageData } from "./receipt-pdf";

type RGB = [number, number, number];
const RED: RGB = [236, 36, 39];
const INK: RGB = [43, 26, 20];
const MUTED: RGB = [107, 84, 70];
const PETAL: RGB = [240, 220, 192];
const CREAM: RGB = [255, 248, 231];
const LINE: RGB = [236, 222, 204];

// The built-in PDF fonts have no ₹ glyph, so amounts use "Rs."
const rs = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
const num = (n: number) => n.toLocaleString("en-IN");
const dayLabel = (d: string, year = false) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" });
const PAGE_NAMES: Record<string, string> = { "/": "Home", "/shop": "Shop", "/our-story": "Our story", "/orders": "My orders", "/product": "Product pages" };
const SHORT_METHOD: Record<string, string> = { RAZORPAY: "Online", ONLINE: "Online", UPI: "UPI", PAY_ON_DELIVERY: "COD" };
const pretty = (s: string) => (s === "UPI" ? "UPI" : s.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()));

type Column = { label: string; width: number; align?: "left" | "right" };

/** Builds the dev admin's business report for a date range and downloads it as a PDF. */
export async function downloadReportPdf(report: Report, branding: Branding) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 14, R = W - M, CW = W - 2 * M, BOTTOM = H - 16;
  const range = `${dayLabel(report.from, true)} – ${dayLabel(report.to, true)}`;
  const spanDays = report.days.length;

  const text = (s: string, x: number, y: number, o: { size?: number; bold?: boolean; serif?: boolean; color?: RGB; align?: "left" | "right" | "center"; maxWidth?: number } = {}) => {
    doc.setFont(o.serif ? "times" : "helvetica", o.bold ? "bold" : "normal");
    doc.setFontSize(o.size ?? 9);
    doc.setTextColor(...(o.color ?? INK));
    doc.text(s, x, y, { align: o.align ?? "left", maxWidth: o.maxWidth });
  };
  let y = 0;
  const newPage = () => { doc.addPage(); doc.setFillColor(...RED); doc.rect(0, 0, W, 3, "F"); y = 16; };
  const ensure = (h: number) => { if (y + h > BOTTOM) newPage(); };
  const heading = (title: string, note?: string) => {
    ensure(note ? 22 : 18);
    y += 4;
    text(title, M, y, { size: 14, bold: true, serif: true });
    if (note) { text(note, M, y + 5, { size: 8, color: MUTED }); y += 5; }
    y += 5;
  };

  /** A table with a repeating header row; long tables continue on the next page. */
  const table = (columns: Column[], rows: string[][], opts: { total?: string[] } = {}) => {
    const rowH = 6.4;
    const drawHeader = () => {
      doc.setFillColor(...PETAL);
      doc.roundedRect(M, y, CW, rowH, 1.2, 1.2, "F");
      let x = M;
      for (const c of columns) { text(c.label.toUpperCase(), c.align === "right" ? x + c.width - 2.5 : x + 2.5, y + 4.3, { size: 6.8, bold: true, color: MUTED, align: c.align === "right" ? "right" : "left" }); x += c.width; }
      y += rowH;
    };
    ensure(rowH * 2);
    drawHeader();
    const all = opts.total ? [...rows, opts.total] : rows;
    all.forEach((row, i) => {
      if (y + rowH > BOTTOM) { newPage(); drawHeader(); }
      const isTotal = !!opts.total && i === all.length - 1;
      if (isTotal) { doc.setFillColor(...CREAM); doc.rect(M, y, CW, rowH, "F"); }
      else if (i % 2) { doc.setFillColor(252, 249, 243); doc.rect(M, y, CW, rowH, "F"); }
      let x = M;
      row.forEach((cell, j) => {
        const c = columns[j];
        const fitted = doc.setFontSize(8).splitTextToSize(cell, c.width - 5)[0] ?? "";
        text(fitted, c.align === "right" ? x + c.width - 2.5 : x + 2.5, y + 4.3, { size: 8, bold: isTotal || j === 0, align: c.align === "right" ? "right" : "left" });
        x += c.width;
      });
      doc.setDrawColor(...LINE); doc.setLineWidth(0.15); doc.line(M, y + rowH, R, y + rowH);
      y += rowH;
    });
    if (!rows.length) { text("Nothing recorded in this period.", M + 2.5, y + 4.5, { size: 8, color: MUTED }); y += rowH; }
    y += 3;
  };

  // ---------- Cover header ----------
  doc.setFillColor(...RED);
  doc.rect(0, 0, W, 4, "F");
  y = 14;
  const logo = await imageData(branding.wordmarkUrl);
  if (logo) doc.addImage(logo.dataUrl, "JPEG", M, y - 4, 44, 44 / logo.ratio);
  else text(branding.storeName, M, y + 4, { size: 16, bold: true, serif: true, color: RED });
  text("Business report", R, y + 2, { size: 20, bold: true, serif: true, align: "right" });
  text(range, R, y + 8, { size: 9.5, bold: true, color: RED, align: "right" });
  text(`${spanDays} day${spanDays === 1 ? "" : "s"} · generated ${new Date(report.generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} IST`, R, y + 13, { size: 7.5, color: MUTED, align: "right" });
  y = Math.max(y + 22, logo ? y - 4 + 44 / logo.ratio + 8 : 0);

  // ---------- KPI tiles ----------
  const s = report.summary;
  const tiles: Array<[string, string, string]> = [
    ["Visitors", num(s.visitors), `${num(s.people)} unique people`],
    ["Page views", num(s.pageViews), s.visitors ? `${(s.pageViews / s.visitors).toFixed(1)} per visitor` : "—"],
    ["Orders", num(s.orders), `${num(s.customers)} customers`],
    ["Revenue", rs(s.revenue), "excl. cancelled"],
    ["Avg order value", rs(s.avgOrder), "per order"],
    ["Conversion", `${s.conversion}%`, "orders per 100 visitors"],
    ["Paid / unpaid", rs(s.paidRevenue), `${rs(s.unpaidRevenue)} awaiting payment`],
    ["Cancelled", num(s.cancelled), rs(s.cancelledValue)],
  ];
  const tw = (CW - 9) / 4, th = 21;
  tiles.forEach(([label, value, sub], i) => {
    const x = M + (i % 4) * (tw + 3), ty = y + Math.floor(i / 4) * (th + 3);
    doc.setFillColor(...CREAM); doc.setDrawColor(...LINE); doc.setLineWidth(0.25);
    doc.roundedRect(x, ty, tw, th, 2.2, 2.2, "FD");
    text(label.toUpperCase(), x + 3.5, ty + 5.5, { size: 6.5, bold: true, color: MUTED });
    text(value, x + 3.5, ty + 13, { size: value.length > 12 ? 11 : 14, bold: true, serif: true });
    text(sub, x + 3.5, ty + 18, { size: 6.5, color: MUTED, maxWidth: tw - 6 });
  });
  y += 2 * (th + 3) + 2;

  // ---------- Weekly chart ----------
  heading("Weekly page views and orders", "Weeks run Monday to Sunday; the first and last weeks may be partial.");
  const chartH = 50;
  ensure(chartH + 14);
  const weeks = report.weeks;
  const maxViews = Math.max(1, ...weeks.map((w) => w.pageViews));
  const maxOrders = Math.max(1, ...weeks.map((w) => w.orders));
  const slot = CW / Math.max(1, weeks.length);
  const barW = Math.min(9, slot / 3);
  doc.setDrawColor(...LINE); doc.setLineWidth(0.2);
  for (let g = 0; g <= 4; g++) { const gy = y + chartH - (chartH * g) / 4; doc.line(M, gy, R, gy); }
  weeks.forEach((w, i) => {
    const cx = M + slot * i + slot / 2;
    const vh = (w.pageViews / maxViews) * (chartH - 8);
    const oh = (w.orders / maxOrders) * (chartH - 8);
    doc.setFillColor(...PETAL); doc.rect(cx - barW - 0.6, y + chartH - vh, barW, vh, "F");
    doc.setFillColor(...RED); doc.rect(cx + 0.6, y + chartH - oh, barW, oh, "F");
    if (weeks.length <= 14) {
      if (w.pageViews) text(num(w.pageViews), cx - barW / 2 - 0.6, y + chartH - vh - 1.2, { size: 6, color: MUTED, align: "center" });
      if (w.orders) text(num(w.orders), cx + barW / 2 + 0.6, y + chartH - oh - 1.2, { size: 6, color: RED, align: "center" });
    }
    if (weeks.length <= 14 || i % Math.ceil(weeks.length / 14) === 0) text(dayLabel(w.start), cx, y + chartH + 4.5, { size: 6.2, color: MUTED, align: "center" });
  });
  y += chartH + 11;
  doc.setFillColor(...PETAL); doc.rect(M, y - 2.6, 3, 3, "F"); text("Page views", M + 4.5, y, { size: 7, color: MUTED });
  doc.setFillColor(...RED); doc.rect(M + 26, y - 2.6, 3, 3, "F"); text("Orders", M + 30.5, y, { size: 7, color: MUTED });
  y += 4;

  // ---------- Weekly table ----------
  heading("Week by week");
  table(
    [{ label: "Week", width: 52 }, { label: "Visitors", width: 26, align: "right" }, { label: "Page views", width: 28, align: "right" }, { label: "Orders", width: 22, align: "right" }, { label: "Revenue", width: 32, align: "right" }, { label: "Conversion", width: CW - 160, align: "right" }],
    weeks.map((w) => [w.start === w.end ? dayLabel(w.start) : `${dayLabel(w.start)} – ${dayLabel(w.end)}`, num(w.visitors), num(w.pageViews), num(w.orders), rs(w.revenue), w.visitors ? `${((w.orders / w.visitors) * 100).toFixed(1)}%` : "—"]),
    { total: ["Total", num(s.visitors), num(s.pageViews), num(s.orders), rs(s.revenue), `${s.conversion}%`] },
  );

  // ---------- Pages, products, statuses, payments ----------
  heading("Most visited pages");
  table([{ label: "Page", width: 102 }, { label: "Visitors", width: 40, align: "right" }, { label: "Views", width: CW - 142, align: "right" }], report.pages.map((p) => [PAGE_NAMES[p.path] ?? p.path, num(p.visitors), num(p.views)]));

  heading("Best-selling products", report.products.length > 20 ? `Top 20 of ${report.products.length} by revenue (cancelled orders excluded).` : "By revenue (cancelled orders excluded).");
  table([{ label: "Product", width: 112 }, { label: "Quantity", width: 30, align: "right" }, { label: "Revenue", width: CW - 142, align: "right" }], report.products.slice(0, 20).map((p) => [p.name, num(p.quantity), rs(p.revenue)]));

  heading("Orders by status");
  table([{ label: "Status", width: 102 }, { label: "Orders", width: 40, align: "right" }, { label: "Value", width: CW - 142, align: "right" }], report.statuses.map((x) => [pretty(x.status), num(x.orders), rs(x.revenue)]));

  heading("Payment methods", "Cancelled orders excluded.");
  table([{ label: "Method", width: 102 }, { label: "Orders", width: 40, align: "right" }, { label: "Revenue", width: CW - 142, align: "right" }], report.payments.map((x) => [x.method === "RAZORPAY" ? "Online (Razorpay)" : pretty(x.method), num(x.orders), rs(x.revenue)]));

  // ---------- Day by day ----------
  heading("Day by day");
  table(
    [{ label: "Date", width: 52 }, { label: "Visitors", width: 30, align: "right" }, { label: "Page views", width: 32, align: "right" }, { label: "Orders", width: 26, align: "right" }, { label: "Revenue", width: CW - 140, align: "right" }],
    report.days.map((d) => [new Date(`${d.day}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }), num(d.visitors), num(d.pageViews), num(d.orders), rs(d.revenue)]),
  );

  // ---------- Orders ----------
  heading("Orders", `${report.orders.length} order${report.orders.length === 1 ? "" : "s"} placed in this period, including cancelled.`);
  table(
    [{ label: "Date", width: 18 }, { label: "Order", width: 28 }, { label: "Customer", width: 36 }, { label: "Items", width: 12, align: "right" }, { label: "Total", width: 24, align: "right" }, { label: "Status", width: 28 }, { label: "Payment", width: CW - 146 }],
    report.orders.map((o) => [dayLabel(o.day), o.id, o.customer, num(o.items), rs(o.total), pretty(o.status), `${SHORT_METHOD[o.paymentMethod] ?? pretty(o.paymentMethod)} · ${pretty(o.paymentStatus || "pending")}`]),
  );

  // ---------- Footer on every page ----------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(M, H - 11, R, H - 11);
    text(`${branding.storeName} · Business report · ${range} · Confidential`, M, H - 7, { size: 7, color: MUTED });
    text(`Page ${p} of ${pages}`, R, H - 7, { size: 7, color: MUTED, align: "right" });
  }
  doc.save(`krust-report-${report.from}-to-${report.to}.pdf`);
}
