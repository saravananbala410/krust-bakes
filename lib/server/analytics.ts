import { database, ready } from "./store";

const IST_OFFSET_MINUTES = 330;
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|monitor|curl|wget|python|axios|node-fetch/i;
const TRACKED_PATHS = /^\/(shop|our-story)?$/;

/** YYYY-MM-DD in Indian Standard Time. */
const istDay = (d = new Date()) => new Date(d.getTime() + IST_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);

/** Records one storefront page view for an anonymous visitor id. Bots are ignored. */
export async function recordVisit(visitor: string, path: string, userAgent: string | null) {
  if (!userAgent || BOT.test(userAgent)) return;
  if (!/^[a-z0-9-]{16,64}$/i.test(visitor) || !TRACKED_PATHS.test(path)) return;
  await ready();
  const now = new Date();
  await database().prepare("INSERT OR IGNORE INTO page_views (at, day, visitor, path) VALUES (?, ?, ?, ?)").bind(now.toISOString(), istDay(now), visitor, path).run();
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
  const [views, orders, pages, totals, buyers] = await Promise.all([
    db.prepare("SELECT day, COUNT(DISTINCT visitor) AS visitors, COUNT(*) AS pageViews FROM page_views WHERE day >= ? GROUP BY day").bind(from).all<{ day: string; visitors: number; pageViews: number }>(),
    db.prepare(`SELECT date(created_at, '+${IST_OFFSET_MINUTES} minutes') AS day, COUNT(*) AS orders, COALESCE(SUM(json_extract(data, '$.total')), 0) AS revenue FROM orders WHERE deleted = 0 AND json_extract(data, '$.status') != 'CANCELLED' AND date(created_at, '+${IST_OFFSET_MINUTES} minutes') >= ? GROUP BY day`).bind(from).all<{ day: string; orders: number; revenue: number }>(),
    db.prepare("SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors FROM page_views WHERE day >= ? GROUP BY path ORDER BY views DESC").bind(from).all<{ path: string; views: number; visitors: number }>(),
    db.prepare("SELECT COUNT(DISTINCT visitor) AS visitors, COUNT(*) AS pageViews FROM page_views WHERE day >= ?").bind(from).first<{ visitors: number; pageViews: number }>(),
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
