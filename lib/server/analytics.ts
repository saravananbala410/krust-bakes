import { database, ready } from "./store";

const IST_OFFSET_MINUTES = 330;
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|monitor|curl|wget|python|axios|node-fetch/i;
const TRACKED_PATHS = /^\/(shop|our-story|orders|product\/[\w-]+)?$/;

/** YYYY-MM-DD in Indian Standard Time. */
const istDay = (d = new Date()) => new Date(d.getTime() + IST_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);

/**
 * Records a storefront visit, counted once per person, page and day.
 * A signed-in customer is one person on every device ("c:<id>"); a different email is a different person.
 * Without sign-in the device is the person ("d:<device id>"). Browsing first and signing in later the
 * same day merges into one person. Bots are ignored.
 */
export async function recordVisit(device: string, path: string, userAgent: string | null, customerId?: string | null) {
  if (!userAgent || BOT.test(userAgent)) return;
  if (!/^[a-z0-9-]{16,64}$/i.test(device) || !TRACKED_PATHS.test(path)) return;
  await ready();
  const db = database();
  const now = new Date();
  const day = istDay(now);
  const anonymous = `d:${device}`;
  let who = anonymous;
  if (customerId) {
    who = `c:${customerId}`;
    // This device's earlier anonymous visits today belong to this customer.
    await db.prepare("UPDATE OR IGNORE page_visits SET who = ? WHERE day = ? AND who = ?").bind(who, day, anonymous).run();
    await db.prepare("DELETE FROM page_visits WHERE day = ? AND who = ?").bind(day, anonymous).run();
  } else {
    // Signed out on a device that was signed in today: still the same person.
    const known = await db.prepare("SELECT who FROM page_visits WHERE day = ? AND device = ? AND who LIKE 'c:%' ORDER BY at DESC LIMIT 1").bind(day, device).first<{ who: string }>();
    if (known) who = known.who;
  }
  await db.prepare("INSERT OR IGNORE INTO page_visits (at, day, who, device, path) VALUES (?, ?, ?, ?, ?)").bind(now.toISOString(), day, who, device, path).run();
}

export type DailyStat = { day: string; visitors: number; pageViews: number; orders: number; revenue: number };
export type Analytics = {
  today: { visitors: number; pageViews: number; orders: number };
  last30: { visitors: number; pageViews: number; orders: number; customers: number; revenue: number; conversion: number };
  days: DailyStat[];
  pages: Array<{ path: string; views: number; visitors: number }>;
};

/** Visitors vs orders for the last 30 days (IST). Cancelled and deleted orders are left out. */
export async function getAnalytics(): Promise<Analytics> {
  await ready();
  const today = istDay();
  const from = istDay(new Date(Date.now() - 29 * 86_400_000));
  const db = database();
  const pageGroup = "CASE WHEN path LIKE '/product/%' THEN '/product' ELSE path END";
  const [views, orders, pages, totals, buyers] = await Promise.all([
    db.prepare("SELECT day, COUNT(DISTINCT who) AS visitors, COUNT(*) AS pageViews FROM page_visits WHERE day >= ? GROUP BY day").bind(from).all<{ day: string; visitors: number; pageViews: number }>(),
    db.prepare(`SELECT date(created_at, '+${IST_OFFSET_MINUTES} minutes') AS day, COUNT(*) AS orders, COALESCE(SUM(json_extract(data, '$.total')), 0) AS revenue FROM orders WHERE deleted = 0 AND json_extract(data, '$.status') != 'CANCELLED' AND date(created_at, '+${IST_OFFSET_MINUTES} minutes') >= ? GROUP BY day`).bind(from).all<{ day: string; orders: number; revenue: number }>(),
    db.prepare(`SELECT ${pageGroup} AS path, COUNT(*) AS views, COUNT(DISTINCT who) AS visitors FROM page_visits WHERE day >= ? GROUP BY ${pageGroup} ORDER BY views DESC`).bind(from).all<{ path: string; views: number; visitors: number }>(),
    // A person counts once per day, so 30-day visitors are person-days added up.
    db.prepare("SELECT COUNT(*) AS visitors, COALESCE(SUM(n), 0) AS pageViews FROM (SELECT day, who, COUNT(*) AS n FROM page_visits WHERE day >= ? GROUP BY day, who)").bind(from).first<{ visitors: number; pageViews: number }>(),
    db.prepare(`SELECT COUNT(DISTINCT COALESCE(customer_id, json_extract(data, '$.phone'))) AS customers FROM orders WHERE deleted = 0 AND json_extract(data, '$.status') != 'CANCELLED' AND date(created_at, '+${IST_OFFSET_MINUTES} minutes') >= ?`).bind(from).first<{ customers: number }>(),
  ]);

  const byDay = new Map<string, DailyStat>();
  for (let i = 29; i >= 0; i--) { const day = istDay(new Date(Date.now() - i * 86_400_000)); byDay.set(day, { day, visitors: 0, pageViews: 0, orders: 0, revenue: 0 }); }
  for (const v of views.results) { const d = byDay.get(v.day); if (d) { d.visitors = v.visitors; d.pageViews = v.pageViews; } }
  for (const o of orders.results) { const d = byDay.get(o.day); if (d) { d.orders = o.orders; d.revenue = o.revenue; } }
  const days = [...byDay.values()];
  const t = byDay.get(today)!;
  const orders30 = days.reduce((s, d) => s + d.orders, 0);
  const visitors30 = totals?.visitors ?? 0;
  return {
    today: { visitors: t.visitors, pageViews: t.pageViews, orders: t.orders },
    last30: { visitors: visitors30, pageViews: totals?.pageViews ?? 0, orders: orders30, customers: buyers?.customers ?? 0, revenue: days.reduce((s, d) => s + d.revenue, 0), conversion: visitors30 ? Math.round((orders30 / visitors30) * 1000) / 10 : 0 },
    days,
    pages: pages.results,
  };
}

// ---------- Date-range report (PDF download for the dev admin) ----------

export type ReportWeek = { start: string; end: string; visitors: number; pageViews: number; orders: number; revenue: number };
export type ReportOrder = { id: string; day: string; customer: string; items: number; total: number; status: string; paymentMethod: string; paymentStatus: string };
export type Report = {
  from: string; to: string; generatedAt: string;
  summary: { visitors: number; people: number; pageViews: number; orders: number; revenue: number; avgOrder: number; conversion: number; customers: number; cancelled: number; cancelledValue: number; paidRevenue: number; unpaidRevenue: number };
  weeks: ReportWeek[];
  days: DailyStat[];
  pages: Array<{ path: string; views: number; visitors: number }>;
  products: Array<{ name: string; quantity: number; revenue: number }>;
  statuses: Array<{ status: string; orders: number; revenue: number }>;
  payments: Array<{ method: string; orders: number; revenue: number }>;
  orders: ReportOrder[];
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const addDays = (day: string, n: number) => { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
/** Monday of the (IST) week a day falls in. */
const mondayOf = (day: string) => { const dow = new Date(`${day}T00:00:00Z`).getUTCDay(); return addDays(day, -((dow + 6) % 7)); };

/** Checks a from/to pair (YYYY-MM-DD, IST days). Throws a message suitable for a 400 response. */
export function validateRange(from: string | null, to: string | null): { from: string; to: string } {
  const real = (d: string | null): d is string => { if (!d || !DAY_RE.test(d)) return false; const t = Date.parse(`${d}T00:00:00Z`); return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === d; };
  if (!real(from) || !real(to)) throw new Error("Choose a valid start and end date");
  if (from > to) throw new Error("The start date must be on or before the end date");
  if (to > istDay()) throw new Error("The end date can't be in the future");
  const span = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;
  if (span > 366) throw new Error("Pick a range of one year or less");
  return { from, to };
}

/** Visits, orders and sales between two IST days (inclusive). Deleted orders are left out; cancelled ones are counted separately. */
export async function getReport(from: string, to: string): Promise<Report> {
  await ready();
  const db = database();
  const istDate = `date(created_at, '+${IST_OFFSET_MINUTES} minutes')`;
  const pageGroup = "CASE WHEN path LIKE '/product/%' THEN '/product' ELSE path END";
  const [views, people, pages, rows] = await Promise.all([
    db.prepare("SELECT day, COUNT(DISTINCT who) AS visitors, COUNT(*) AS pageViews FROM page_visits WHERE day BETWEEN ? AND ? GROUP BY day").bind(from, to).all<{ day: string; visitors: number; pageViews: number }>(),
    db.prepare("SELECT COUNT(DISTINCT who) AS people FROM page_visits WHERE day BETWEEN ? AND ?").bind(from, to).first<{ people: number }>(),
    db.prepare(`SELECT ${pageGroup} AS path, COUNT(*) AS views, COUNT(DISTINCT who) AS visitors FROM page_visits WHERE day BETWEEN ? AND ? GROUP BY ${pageGroup} ORDER BY views DESC`).bind(from, to).all<{ path: string; views: number; visitors: number }>(),
    db.prepare(`SELECT data, ${istDate} AS day, customer_id FROM orders WHERE deleted = 0 AND ${istDate} BETWEEN ? AND ? ORDER BY created_at`).bind(from, to).all<{ data: string; day: string; customer_id: string | null }>(),
  ]);

  const byDay = new Map<string, DailyStat>();
  for (let d = from; d <= to; d = addDays(d, 1)) byDay.set(d, { day: d, visitors: 0, pageViews: 0, orders: 0, revenue: 0 });
  for (const v of views.results) { const d = byDay.get(v.day); if (d) { d.visitors = v.visitors; d.pageViews = v.pageViews; } }

  const products = new Map<string, { name: string; quantity: number; revenue: number }>();
  const statuses = new Map<string, { status: string; orders: number; revenue: number }>();
  const payments = new Map<string, { method: string; orders: number; revenue: number }>();
  const buyers = new Set<string>();
  const orders: ReportOrder[] = [];
  let cancelled = 0, cancelledValue = 0, paidRevenue = 0, unpaidRevenue = 0;
  for (const row of rows.results) {
    let o: { id?: string; customer?: string; phone?: string; total?: number; items?: number; status?: string; paymentMethod?: string; paymentStatus?: string; lines?: Array<{ productName?: string; variantName?: string; quantity?: number; unitPrice?: number }> };
    try { o = JSON.parse(row.data); } catch { continue; }
    const total = Number(o.total) || 0;
    const status = o.status ?? "PENDING";
    const s = statuses.get(status) ?? { status, orders: 0, revenue: 0 };
    s.orders += 1; s.revenue += total; statuses.set(status, s);
    orders.push({ id: o.id ?? "", day: row.day, customer: o.customer ?? "", items: Number(o.items) || 0, total, status, paymentMethod: o.paymentMethod ?? "", paymentStatus: o.paymentStatus ?? "" });
    if (status === "CANCELLED") { cancelled += 1; cancelledValue += total; continue; }
    const d = byDay.get(row.day);
    if (d) { d.orders += 1; d.revenue += total; }
    buyers.add(row.customer_id ?? o.phone ?? o.id ?? "");
    if (o.paymentStatus === "PAID") paidRevenue += total; else unpaidRevenue += total;
    const method = o.paymentMethod ?? "UNKNOWN";
    const p = payments.get(method) ?? { method, orders: 0, revenue: 0 };
    p.orders += 1; p.revenue += total; payments.set(method, p);
    for (const line of o.lines ?? []) {
      const name = [line.productName, line.variantName].filter(Boolean).join(" · ") || "Item";
      const item = products.get(name) ?? { name, quantity: 0, revenue: 0 };
      item.quantity += Number(line.quantity) || 0; item.revenue += (Number(line.unitPrice) || 0) * (Number(line.quantity) || 0);
      products.set(name, item);
    }
  }

  const days = [...byDay.values()];
  const weeks: ReportWeek[] = [];
  for (const d of days) {
    const start = mondayOf(d.day) < from ? from : mondayOf(d.day);
    let w = weeks[weeks.length - 1];
    if (!w || w.start !== start) { w = { start, end: d.day, visitors: 0, pageViews: 0, orders: 0, revenue: 0 }; weeks.push(w); }
    w.end = d.day; w.visitors += d.visitors; w.pageViews += d.pageViews; w.orders += d.orders; w.revenue += d.revenue;
  }
  const visitors = days.reduce((n, d) => n + d.visitors, 0);
  const orderCount = days.reduce((n, d) => n + d.orders, 0);
  const revenue = days.reduce((n, d) => n + d.revenue, 0);
  return {
    from, to, generatedAt: new Date().toISOString(),
    summary: {
      visitors, people: people?.people ?? 0, pageViews: days.reduce((n, d) => n + d.pageViews, 0), orders: orderCount, revenue,
      avgOrder: orderCount ? Math.round(revenue / orderCount) : 0, conversion: visitors ? Math.round((orderCount / visitors) * 1000) / 10 : 0,
      customers: buyers.size, cancelled, cancelledValue, paidRevenue, unpaidRevenue,
    },
    weeks, days,
    pages: pages.results,
    products: [...products.values()].sort((a, b) => b.revenue - a.revenue),
    statuses: [...statuses.values()].sort((a, b) => b.orders - a.orders),
    payments: [...payments.values()].sort((a, b) => b.revenue - a.revenue),
    orders,
  };
}
