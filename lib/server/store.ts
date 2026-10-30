import { sqliteDatabase } from "./db";

// Server secrets and settings come from environment variables (.env locally, hPanel on Hostinger).
const env = process.env;
import { z } from "zod";
import {
  galleryOf, HAMPER_CATEGORY, ORDER_STATUSES, PAYMENT_STATUSES, seedConfig, sellableCatalog, slug,
  type AdminAction, type AdminData, type Customer, type AdminRole, type AdminUser, type AuditEntry, type PlaceOrderInput, type PublicConfig, type StoreOrder,
} from "@/lib/store-core";
import type { Product } from "@/lib/types";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type AdminRecord = AdminUser & { passwordHash: string; salt: string };

const SESSION_COOKIE = "krust_admin";
const SESSION_DAYS = 7;
const DEFAULT_ADMIN = { username: "admin", password: "krust2026", name: "Jinu" };

export function database() {
  return sqliteDatabase();
}

let schemaReady: Promise<void> | null = null;
export function ready() {
  schemaReady ??= database().batch([
    database().prepare("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    database().prepare("CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)"),
    database().prepare("CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, at TEXT NOT NULL, data TEXT NOT NULL)"),
    database().prepare("CREATE TABLE IF NOT EXISTS admins (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, data TEXT NOT NULL)"),
    database().prepare("CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, admin_id TEXT NOT NULL, expires_at INTEGER NOT NULL)"),
    database().prepare("CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL)"),
    database().prepare("CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, email TEXT NOT NULL, data TEXT NOT NULL)"),
    database().prepare("CREATE TABLE IF NOT EXISTS customer_sessions (token_hash TEXT PRIMARY KEY, customer_id TEXT NOT NULL, expires_at INTEGER NOT NULL)"),
    database().prepare("CREATE TABLE IF NOT EXISTS page_views (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, day TEXT NOT NULL, visitor TEXT NOT NULL, path TEXT NOT NULL)"),
    database().prepare("CREATE INDEX IF NOT EXISTS page_views_day ON page_views (day)"),
  ]).then(async () => {
    // Orders created before customer accounts existed lack this column; adding it again fails harmlessly.
    await database().prepare("ALTER TABLE orders ADD COLUMN customer_id TEXT").run().catch(() => undefined);
    await database().prepare("CREATE INDEX IF NOT EXISTS orders_customer ON orders (customer_id)").run();
    // One page view per visitor, page and day: refreshing must not raise the counts. Old duplicates are removed once.
    await database().prepare("DELETE FROM page_views WHERE id NOT IN (SELECT MIN(id) FROM page_views GROUP BY day, visitor, path)").run();
    await database().prepare("CREATE UNIQUE INDEX IF NOT EXISTS page_views_unique ON page_views (day, visitor, path)").run();
    // Visits keyed by person: "c:<customer id>" when signed in, else "d:<device id>". One row per person, page and day.
    await database().prepare("CREATE TABLE IF NOT EXISTS page_visits (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, day TEXT NOT NULL, who TEXT NOT NULL, device TEXT NOT NULL, path TEXT NOT NULL)").run();
    await database().prepare("CREATE UNIQUE INDEX IF NOT EXISTS page_visits_unique ON page_visits (day, who, path)").run();
    await database().prepare("CREATE INDEX IF NOT EXISTS page_visits_device ON page_visits (day, device)").run();
    await database().prepare("INSERT OR IGNORE INTO page_visits (at, day, who, device, path) SELECT MIN(at), day, 'd:' || visitor, visitor, path FROM page_views GROUP BY day, visitor, path").run();
  }).catch((error) => { schemaReady = null; throw error; });
  return schemaReady;
}

const now = () => new Date().toISOString();

// ---------- config (catalogue + content) ----------

export const razorpayKeys = () => (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET ? { keyId: env.RAZORPAY_KEY_ID, keySecret: env.RAZORPAY_KEY_SECRET } : null);
const paymentsFlag = () => ({ razorpay: !!razorpayKeys() });

export async function getConfig(): Promise<PublicConfig> {
  await ready();
  const row = await database().prepare("SELECT value FROM kv WHERE key = 'config'").first<{ value: string }>();
  const seed = seedConfig();
  if (!row) {
    await saveConfig(seed);
    return { ...seed, payments: paymentsFlag() };
  }
  const stored = JSON.parse(row.value) as Partial<PublicConfig>;
  // One-time content update: the original GST invoice FAQ becomes the artificial colours FAQ (left alone once edited).
  const faq4 = stored.faqs?.find((f) => f.id === "f-4" && f.question === "Can I get a GST invoice?");
  const newFaq4 = seed.faqs.find((f) => f.id === "f-4");
  if (faq4 && newFaq4) Object.assign(faq4, { question: newFaq4.question, answer: newFaq4.answer });
  // Merge so fields added in later releases get their defaults.
  return { ...seed, ...stored, payments: paymentsFlag(), settings: { ...seed.settings, ...stored.settings }, branding: { ...seed.branding, ...stored.branding }, socialLinks: { ...seed.socialLinks, ...stored.socialLinks }, story: { ...seed.story, ...stored.story }, festive: { ...seed.festive, ...stored.festive } };
}

async function saveConfig({ payments: _computed, ...config }: PublicConfig) {
  void _computed;
  await database().prepare("INSERT INTO kv (key, value, updated_at) VALUES ('config', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind(JSON.stringify(config), now()).run();
}

// ---------- admins, passwords, sessions ----------

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 100_000 }, key, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function listAdmins(): Promise<AdminRecord[]> {
  await ready();
  const { results } = await database().prepare("SELECT data FROM admins").all<{ data: string }>();
  if (!results.length) {
    const salt = crypto.randomUUID();
    const root: AdminRecord = { id: "root-admin", name: DEFAULT_ADMIN.name, username: DEFAULT_ADMIN.username, role: "DEV_ADMIN", active: true, createdAt: now(), salt, passwordHash: await hashPassword(DEFAULT_ADMIN.password, salt) };
    await writeAdmin(root);
    return [root];
  }
  return results.map((r) => normalizeRole(JSON.parse(r.data) as AdminRecord));
}

/** Maps accounts created before the three-role model: the main account is the dev admin, old "ADMIN" users become sales admins. */
function normalizeRole(admin: AdminRecord): AdminRecord {
  const legacy = admin.role as string;
  if (admin.id === "root-admin") return { ...admin, role: "DEV_ADMIN" };
  if (legacy === "ADMIN") return { ...admin, role: "SALES_ADMIN" };
  return ["DEV_ADMIN", "SUPER_ADMIN", "SALES_ADMIN"].includes(legacy) ? admin : { ...admin, role: "SALES_ADMIN" };
}
const ROLES: AdminRole[] = ["DEV_ADMIN", "SUPER_ADMIN", "SALES_ADMIN"];

async function writeAdmin(admin: AdminRecord) {
  await database().prepare("INSERT INTO admins (id, username, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET username = excluded.username, data = excluded.data").bind(admin.id, admin.username, JSON.stringify(admin)).run();
}

const publicAdmin = (admin: AdminRecord): AdminUser => ({ id: admin.id, name: admin.name, username: admin.username, role: admin.role, active: admin.active, createdAt: admin.createdAt });

export function readCookie(request: Request, name: string) {
  const match = request.headers.get("cookie")?.split(/;\s*/).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export async function login(request: Request, username: string, password: string) {
  const admins = await listAdmins();
  const admin = admins.find((a) => a.username.toLowerCase() === username.trim().toLowerCase());
  if (!admin || !admin.active || (await hashPassword(password, admin.salt)) !== admin.passwordHash) throw new HttpError(401, "Invalid user ID or password");
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  await database().batch([
    database().prepare("DELETE FROM sessions WHERE expires_at < ?").bind(Date.now()),
    database().prepare("INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)").bind(await sha256(token), admin.id, expires),
  ]);
  await logAudit(admin.name, "Signed in", admin.username, "Admin session started", admin.role);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return { user: publicAdmin(admin), cookie: `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}` };
}

export async function logout(request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) { await ready(); await database().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run(); }
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function currentAdmin(request: Request): Promise<AdminRecord | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  await ready();
  const session = await database().prepare("SELECT admin_id, expires_at FROM sessions WHERE token_hash = ?").bind(await sha256(token)).first<{ admin_id: string; expires_at: number }>();
  if (!session || session.expires_at < Date.now()) return null;
  const admin = (await listAdmins()).find((a) => a.id === session.admin_id);
  return admin?.active ? admin : null;
}

export async function requireAdmin(request: Request) {
  const admin = await currentAdmin(request);
  if (!admin) throw new HttpError(401, "Please sign in again");
  return admin;
}

export const toPublicAdmin = publicAdmin;

// ---------- orders, audit ----------

export async function logAudit(actor: string, action: string, entity: string, detail: string, actorRole?: AuditEntry["actorRole"]) {
  const entry: AuditEntry = { id: crypto.randomUUID(), at: now(), actor, actorRole, action, entity, detail };
  await database().prepare("INSERT INTO audit (id, at, data) VALUES (?, ?, ?)").bind(entry.id, entry.at, JSON.stringify(entry)).run();
}

export async function readOrder(id: string) {
  const row = await database().prepare("SELECT data, deleted FROM orders WHERE id = ?").bind(id).first<{ data: string; deleted: number }>();
  return row ? { order: JSON.parse(row.data) as StoreOrder, deleted: row.deleted === 1 } : null;
}

export async function writeOrder(order: StoreOrder, deleted: boolean) {
  await database().prepare("INSERT INTO orders (id, data, deleted, created_at, customer_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, deleted = excluded.deleted, customer_id = excluded.customer_id").bind(order.id, JSON.stringify(order), deleted ? 1 : 0, order.createdAt, order.customerId ?? null).run();
}

/** Operational data, trimmed to what the signed-in role may see. */
export async function getAdminData(viewer: AdminRecord): Promise<AdminData> {
  await ready();
  const [orders, audit, admins] = await Promise.all([
    database().prepare("SELECT data, deleted FROM orders ORDER BY created_at DESC").all<{ data: string; deleted: number }>(),
    database().prepare("SELECT data FROM audit ORDER BY at DESC LIMIT 1500").all<{ data: string }>(),
    listAdmins(),
  ]);
  const parsed = orders.results.map((r) => ({ order: JSON.parse(r.data) as StoreOrder, deleted: r.deleted === 1 }));
  const live = parsed.filter((r) => !r.deleted).map((r) => r.order);
  if (viewer.role === "SALES_ADMIN") return { orders: live, recycleBin: [], audit: [], admins: [] };
  const entries = audit.results.map((r) => JSON.parse(r.data) as AuditEntry);
  if (viewer.role === "SUPER_ADMIN") {
    // The dev admin's work history is private to dev admins.
    const devNames = new Set(admins.filter((a) => a.role === "DEV_ADMIN").map((a) => a.name));
    return { orders: live, recycleBin: [], audit: entries.filter((e) => e.actorRole !== "DEV_ADMIN" && !(e.actorRole === undefined && devNames.has(e.actor))), admins: [] };
  }
  return { orders: live, recycleBin: parsed.filter((r) => r.deleted).map((r) => r.order), audit: entries, admins: admins.map(publicAdmin) };
}

const phone = z.string().trim().refine((v) => /^(\+?91)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, "")), "Enter a valid 10-digit mobile number");
const placeOrderSchema = z.object({
  customer: z.string().trim().min(2).max(100),
  phone,
  whatsapp: z.union([phone, z.literal("")]).optional(),
  email: z.union([z.string().trim().email(), z.literal("")]).optional(),
  address: z.string().trim().min(8).max(500),
  landmark: z.string().trim().max(120).optional(),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit pincode"),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.string().trim().max(60).optional(),
  paymentMethod: z.enum(["ONLINE", "UPI", "PAY_ON_DELIVERY", "RAZORPAY"]),
  note: z.string().trim().max(500).optional(),
  lines: z.array(z.object({ productId: z.string(), variantId: z.string(), quantity: z.number().int().min(1).max(100) })).min(1).max(60),
});

export async function placeOrder(input: PlaceOrderInput, customer?: Customer | null) {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid order");
  const data = parsed.data;
  const config = await getConfig();
  // When Google login is set up, every order must come from a signed-in customer.
  if (config.settings.googleClientId && !customer) throw new HttpError(401, "Please sign in with Google to place your order");
  if (data.paymentMethod === "RAZORPAY" && !razorpayKeys()) throw new HttpError(503, "Online payment is not available right now. Please choose pay on delivery.");
  const activeCategories = new Set(config.categories.filter((c) => c.active).map((c) => c.name));
  // Price from the server catalogue, never from the client.
  const catalog = sellableCatalog(config);
  const lines = data.lines.map((line) => {
    const product = catalog.find((p) => p.id === line.productId);
    const variant = product?.variants.find((v) => v.id === line.variantId);
    const listed = product && (product.category === HAMPER_CATEGORY ? config.festive.enabled : activeCategories.has(product.category));
    if (!product || !variant || product.active === false || !listed) throw new HttpError(409, "An item in your basket is no longer available. Please refresh and try again.");
    return { productId: product.id, productName: product.name, variantName: variant.name, hsn: product.hsn, quantity: line.quantity, unitPrice: variant.price, gstRate: product.gstRate };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  if (subtotal < config.settings.minimumOrder) throw new HttpError(422, `Minimum delivery order is ₹${config.settings.minimumOrder}`);
  const seq = await database().prepare("INSERT INTO kv (key, value, updated_at) VALUES ('orderSeq', '1051', ?) ON CONFLICT(key) DO UPDATE SET value = CAST(value AS INTEGER) + 1, updated_at = excluded.updated_at RETURNING value").bind(now()).first<{ value: string }>();
  const order: StoreOrder = {
    id: `KA-${seq?.value ?? Date.now()}`, token: crypto.randomUUID().replaceAll("-", ""),
    customer: data.customer, phone: data.phone, whatsapp: data.whatsapp || data.phone, email: data.email || customer?.email || undefined, customerId: customer?.id,
    address: [data.address, data.landmark].filter(Boolean).join(", "), pincode: data.pincode,
    deliveryDate: data.deliveryDate, slot: data.slot ?? "", total: subtotal + config.settings.deliveryFee, items: lines.reduce((s, l) => s + l.quantity, 0),
    status: "PENDING", paymentMethod: data.paymentMethod, paymentStatus: "PENDING", createdAt: now(), lines, customerNote: data.note || undefined,
  };
  await writeOrder(order, false);
  await logAudit("Customer", "Customer order placed", order.id, `${order.customer} · ₹${order.total} · ${order.paymentMethod}`, "CUSTOMER");
  return order;
}

export async function getOrderForInvoice(request: Request, id: string, token: string | null, customerId?: string) {
  await ready();
  const found = await readOrder(id);
  if (!found) throw new HttpError(404, "Order not found");
  if (found.order.token !== token && !(customerId && found.order.customerId === customerId) && !(await currentAdmin(request))) throw new HttpError(403, "This invoice link is not valid");
  const config = await getConfig();
  return { order: found.order, settings: config.settings, branding: config.branding };
}

// ---------- assets (uploaded images) ----------

export async function saveAsset(admin: AdminRecord, mime: string, base64: string) {
  if (admin.role !== "DEV_ADMIN" && admin.role !== "SUPER_ADMIN") throw new HttpError(403, "Your role cannot upload images");
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(mime)) throw new HttpError(415, "Only image uploads are allowed");
  if (base64.length > 2_000_000) throw new HttpError(413, "Image is too large. Please use one under 1.5 MB.");
  await ready();
  const id = crypto.randomUUID();
  await database().prepare("INSERT INTO assets (id, mime, data, created_at) VALUES (?, ?, ?, ?)").bind(id, mime, base64, now()).run();
  await logAudit(admin.name, "Image uploaded", id, mime, admin.role);
  return `/api/assets/${id}`;
}

export async function readAsset(id: string) {
  await ready();
  return database().prepare("SELECT mime, data FROM assets WHERE id = ?").bind(id).first<{ mime: string; data: string }>();
}

// ---------- admin actions ----------

const text = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);

function cleanProduct(p: Product, config: PublicConfig): Product {
  const name = text(p.name, 120);
  if (!name) throw new HttpError(400, "Product name is required");
  if (!config.categories.some((c) => c.name === p.category)) throw new HttpError(400, "Choose a valid category");
  const variants = (p.variants ?? []).map((v) => ({ id: text(v.id, 60) || crypto.randomUUID(), name: text(v.name, 60) || "Standard", price: Math.max(0, Math.round(Number(v.price) * 100) / 100) })).filter((v) => Number.isFinite(v.price));
  if (!variants.length) throw new HttpError(400, "Add at least one size and price");
  const gstRate = Number(p.gstRate);
  if (!config.settings.gstRates.includes(gstRate)) throw new HttpError(400, "Choose a configured GST rate");
  const images = galleryOf({ imageUrl: text(p.imageUrl, 300), images: (p.images ?? []).map((u) => text(u, 300)) });
  if (!images.length) images.push("/brand/krust-hero.png");
  return { id: text(p.id, 80) || crypto.randomUUID(), name, description: text(p.description, 1500), images, category: p.category, eggless: !!p.eggless, hsn: text(p.hsn, 12) || "1905", gstRate, accent: text(p.accent, 20) || "#f6c9c9", crop: text(p.crop, 30) || "50% 50%", imageUrl: images[0], active: p.active !== false, featured: !!p.featured, variants };
}

function upsert<T extends { id: string }>(list: T[], item: T) {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

/** Which roles may run each admin action. The dev admin controls the whole site. */
function permittedRoles(action: AdminAction): AdminRole[] {
  switch (action.type) {
    case "order.update": case "admin.changeOwnPassword": case "admin.updateOwnProfile": return ["DEV_ADMIN", "SUPER_ADMIN", "SALES_ADMIN"];
    case "order.recycle": case "product.save": case "settings.update": case "hamper.save": case "hamper.delete": case "festive.update": return ["DEV_ADMIN", "SUPER_ADMIN"];
    default: return ["DEV_ADMIN"];
  }
}

export async function runAction(admin: AdminRecord, action: AdminAction) {
  const log = (what: string, entity: string, detail: string) => logAudit(admin.name, what, entity, detail, admin.role);
  const allowed = permittedRoles(action);
  if (!allowed.includes(admin.role)) throw new HttpError(403, "Your role does not have access to this action");

  if (action.type.startsWith("order.") || action.type === "recycle.empty") {
    await ready();
    switch (action.type) {
      case "order.update": {
        const found = await readOrder(action.id);
        if (!found) throw new HttpError(404, "Order not found");
        const patch: Partial<StoreOrder> = {};
        if (action.patch.status !== undefined) { if (!ORDER_STATUSES.includes(action.patch.status as never)) throw new HttpError(400, "Unknown status"); patch.status = action.patch.status; }
        if (action.patch.paymentStatus !== undefined) { if (!PAYMENT_STATUSES.includes(action.patch.paymentStatus as never)) throw new HttpError(400, "Unknown payment status"); patch.paymentStatus = action.patch.paymentStatus; }
        if (action.patch.note !== undefined) patch.note = text(action.patch.note, 1000);
        const changes = Object.entries(patch).filter(([k, v]) => found.order[k as keyof StoreOrder] !== v).map(([k, v]) => `${k}: ${found.order[k as keyof StoreOrder] ?? "—"} → ${v}`);
        await writeOrder({ ...found.order, ...patch, updatedAt: now() }, found.deleted);
        if (changes.length) await log("Order updated", action.id, changes.join(" · "));
        return;
      }
      case "order.recycle": case "order.restore": {
        const found = await readOrder(action.id);
        if (!found) throw new HttpError(404, "Order not found");
        const toBin = action.type === "order.recycle";
        await writeOrder({ ...found.order, deletedAt: toBin ? now() : undefined }, toBin);
        await log(toBin ? "Order moved to recycle bin" : "Order restored", action.id, `${found.order.customer} · ₹${found.order.total}`);
        return;
      }
      case "order.purge": {
        const found = await readOrder(action.id);
        if (!found?.deleted) throw new HttpError(400, "Only orders in the recycle bin can be deleted permanently");
        await database().prepare("DELETE FROM orders WHERE id = ? AND deleted = 1").bind(action.id).run();
        await log("Order permanently deleted", action.id, `${found.order.customer} · ₹${found.order.total}`);
        return;
      }
      case "recycle.empty": {
        const { meta } = await database().prepare("DELETE FROM orders WHERE deleted = 1").run();
        await log("Recycle bin emptied", "Orders", `${meta.changes ?? 0} order(s) permanently deleted`);
        return;
      }
    }
  }

  if (action.type.startsWith("admin.")) {
    const admins = await listAdmins();
    switch (action.type) {
      case "admin.create": {
        const username = text(action.username, 40).toLowerCase();
        if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new HttpError(400, "User ID must be 3–40 letters, numbers, dots or dashes");
        if (admins.some((a) => a.username.toLowerCase() === username)) throw new HttpError(409, "That user ID already exists");
        if (String(action.password).length < 8) throw new HttpError(400, "Password must be at least 8 characters");
        const salt = crypto.randomUUID();
        await writeAdmin({ id: crypto.randomUUID(), name: text(action.name, 80) || username, username, role: ROLES.includes(action.role) ? action.role : "SALES_ADMIN", active: true, createdAt: now(), salt, passwordHash: await hashPassword(action.password, salt) });
        await log("Admin created", username, action.role);
        return;
      }
      case "admin.update": {
        const target = admins.find((a) => a.id === action.id);
        if (!target) throw new HttpError(404, "Admin not found");
        if (target.id === "root-admin" && (action.active === false || (action.role && action.role !== "DEV_ADMIN"))) throw new HttpError(400, "The main dev admin cannot be disabled or demoted");
        const next = { ...target };
        const details: string[] = [];
        if (action.active !== undefined) { next.active = action.active; details.push(action.active ? "Enabled" : "Disabled"); }
        if (action.role) { if (!ROLES.includes(action.role)) throw new HttpError(400, "Unknown role"); next.role = action.role; details.push(`Role ${action.role}`); }
        if (action.password) {
          if (action.password.length < 8) throw new HttpError(400, "Password must be at least 8 characters");
          next.salt = crypto.randomUUID(); next.passwordHash = await hashPassword(action.password, next.salt); details.push("Password reset");
          await database().prepare("DELETE FROM sessions WHERE admin_id = ?").bind(target.id).run();
        }
        if (action.active === false) await database().prepare("DELETE FROM sessions WHERE admin_id = ?").bind(target.id).run();
        await writeAdmin(next);
        await log("Admin updated", target.username, details.join(" · "));
        return;
      }
      case "admin.delete": {
        if (action.id === "root-admin" || action.id === admin.id) throw new HttpError(400, "You cannot delete the main dev admin or yourself");
        const target = admins.find((a) => a.id === action.id);
        await database().batch([database().prepare("DELETE FROM admins WHERE id = ?").bind(action.id), database().prepare("DELETE FROM sessions WHERE admin_id = ?").bind(action.id)]);
        await log("Admin deleted", target?.username ?? action.id, "Account removed");
        return;
      }
      case "admin.updateOwnProfile": {
        if ((await hashPassword(action.current, admin.salt)) !== admin.passwordHash) throw new HttpError(400, "Current password is incorrect");
        const name = text(action.name, 80);
        const username = text(action.username, 40).toLowerCase();
        if (!name) throw new HttpError(400, "Name is required");
        if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new HttpError(400, "User ID must be 3–40 letters, numbers, dots or dashes");
        if (admins.some((a) => a.id !== admin.id && a.username.toLowerCase() === username)) throw new HttpError(409, "That user ID already exists");
        await writeAdmin({ ...admin, name, username });
        await log("Profile updated", username, [name !== admin.name && `Name: ${admin.name} → ${name}`, username !== admin.username && `User ID: ${admin.username} → ${username}`].filter(Boolean).join(" · ") || "No changes");
        return;
      }
      case "admin.changeOwnPassword": {
        if ((await hashPassword(action.current, admin.salt)) !== admin.passwordHash) throw new HttpError(400, "Current password is incorrect");
        if (String(action.next).length < 8) throw new HttpError(400, "New password must be at least 8 characters");
        const salt = crypto.randomUUID();
        await writeAdmin({ ...admin, salt, passwordHash: await hashPassword(action.next, salt) });
        await log("Password changed", admin.username, "Own password updated");
        return;
      }
    }
  }

  const config = await getConfig();
  let next: PublicConfig = config;
  let entry: [string, string, string];
  switch (action.type) {
    case "product.save": {
      const product = cleanProduct(action.product, config);
      const existing = config.products.find((p) => p.id === product.id);
      next = { ...config, products: existing ? config.products.map((p) => (p.id === product.id ? product : p)) : [product, ...config.products] };
      const diff = existing ? (["name", "category", "gstRate", "hsn", "active", "description", "imageUrl", "eggless", "featured"] as const).filter((k) => existing[k] !== product[k]).concat(JSON.stringify(existing.variants) !== JSON.stringify(product.variants) ? ["variants" as never] : []) : [];
      entry = [existing ? "Product updated" : "Product created", product.name, existing ? (diff.length ? `Changed ${diff.join(", ")}` : "Saved without changes") : `${product.category} · GST ${product.gstRate}% · ${product.variants.map((v) => `${v.name} ₹${v.price}`).join(", ")}`];
      break;
    }
    case "product.delete": {
      const item = config.products.find((p) => p.id === action.id);
      next = { ...config, products: config.products.filter((p) => p.id !== action.id) };
      entry = ["Product deleted", item?.name ?? action.id, "Removed from catalogue"];
      break;
    }
    case "category.add": {
      const name = text(action.name, 60);
      if (!name) throw new HttpError(400, "Category name is required");
      if (config.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) throw new HttpError(409, "That category already exists");
      next = { ...config, categories: [...config.categories, { id: `${slug(name)}-${Date.now().toString(36)}`, name, active: true }] };
      entry = ["Category created", name, "Visible on storefront"];
      break;
    }
    case "category.update": {
      const cat = config.categories.find((c) => c.id === action.id);
      if (!cat) throw new HttpError(404, "Category not found");
      const name = action.name !== undefined ? text(action.name, 60) : cat.name;
      if (!name) throw new HttpError(400, "Category name is required");
      if (name !== cat.name && config.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) throw new HttpError(409, "That category already exists");
      const active = action.active ?? cat.active;
      next = { ...config, categories: config.categories.map((c) => (c.id === cat.id ? { ...c, name, active } : c)), products: name !== cat.name ? config.products.map((p) => (p.category === cat.name ? { ...p, category: name } : p)) : config.products };
      entry = ["Category updated", name, [name !== cat.name && `Renamed from ${cat.name}`, active !== cat.active && (active ? "Turned on" : "Turned off")].filter(Boolean).join(" · ") || "No changes"];
      break;
    }
    case "category.delete": {
      const cat = config.categories.find((c) => c.id === action.id);
      if (!cat) throw new HttpError(404, "Category not found");
      const count = config.products.filter((p) => p.category === cat.name).length;
      if (count) throw new HttpError(409, `Move or delete the ${count} product(s) in “${cat.name}” first`);
      next = { ...config, categories: config.categories.filter((c) => c.id !== cat.id) };
      entry = ["Category deleted", cat.name, "Removed"];
      break;
    }
    case "settings.update": {
      const p = action.patch;
      const settings = { ...config.settings };
      if (p.minimumOrder !== undefined) settings.minimumOrder = Math.max(0, Number(p.minimumOrder) || 0);
      if (p.deliveryFee !== undefined) settings.deliveryFee = Math.max(0, Number(p.deliveryFee) || 0);
      if (p.gstRates !== undefined) {
        const rates = [...new Set(p.gstRates.map(Number).filter((r) => Number.isFinite(r) && r >= 0 && r <= 40))].sort((a, b) => a - b);
        const inUse = [...new Set([...config.products, ...config.hampers].map((x) => x.gstRate))].filter((r) => !rates.includes(r));
        if (inUse.length) throw new HttpError(409, `GST ${inUse.join("%, ")}% is still used by products or hampers. Change those first.`);
        settings.gstRates = rates;
      }
      if (p.gstin !== undefined) { const v = text(p.gstin, 15).toUpperCase(); if (v && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v)) throw new HttpError(400, "GSTIN format looks wrong (15 characters, e.g. 33ABCDE1234F1Z5)"); settings.gstin = v; }
      if (p.fssai !== undefined) settings.fssai = text(p.fssai, 20);
      if (p.legalName !== undefined) settings.legalName = text(p.legalName, 120);
      if (p.googleClientId !== undefined) {
        if (admin.role !== "DEV_ADMIN") throw new HttpError(403, "Only the dev admin can change Google login");
        const id = text(p.googleClientId, 200);
        if (id && !/^[0-9]+-[a-z0-9]+.apps.googleusercontent.com$/.test(id)) throw new HttpError(400, "That doesn't look like a Google Client ID (it ends with .apps.googleusercontent.com)");
        settings.googleClientId = id;
      }
      if (p.placeOfSupply !== undefined) settings.placeOfSupply = text(p.placeOfSupply, 60);
      next = { ...config, settings };
      entry = ["Settings updated", "Store & GST", Object.keys(p).join(", ")];
      break;
    }
    case "social.update": {
      const links = Object.fromEntries(Object.entries(action.links).map(([k, v]) => [k, text(v, 300)])) as PublicConfig["socialLinks"];
      for (const v of Object.values(links)) if (v && !/^https?:\/\//.test(v)) throw new HttpError(400, "Social links must start with https://");
      next = { ...config, socialLinks: { ...config.socialLinks, ...links } };
      entry = ["Social links updated", "Social", Object.keys(links).join(", ")];
      break;
    }
    case "story.update": {
      const s = action.story;
      const team = (s.team ?? []).slice(0, 12).map((m) => ({ id: text(m.id, 80) || crypto.randomUUID(), name: text(m.name, 80), role: text(m.role, 80), photoUrl: text(m.photoUrl, 300) })).filter((m) => m.name);
      next = { ...config, story: { eyebrow: text(s.eyebrow, 80), titleStart: text(s.titleStart, 120), titleAccent: text(s.titleAccent, 40), titleEnd: text(s.titleEnd, 120), paragraphs: text(s.paragraphs, 3000), imageUrl: text(s.imageUrl, 300) || "/brand/krust-hero.png", statValue: text(s.statValue, 12), statLabel: text(s.statLabel, 40), team } };
      entry = ["Our story updated", "Story section", `${team.length} team member(s)`];
      break;
    }
    case "hamper.save": {
      const h = action.hamper;
      const price = Math.round(Number(h.price) * 100) / 100;
      const hamper = {
        id: text(h.id, 80) || `${slug(text(h.name, 60))}-${Date.now().toString(36)}`,
        name: text(h.name, 100), description: text(h.description, 600), ...(() => { const images = galleryOf({ imageUrl: text(h.imageUrl, 300), images: (h.images ?? []).map((u) => text(u, 300)) }); if (!images.length) images.push("/brand/krust-hero.png"); return { imageUrl: images[0], images }; })(),
        price, gstRate: Number(h.gstRate), badge: text(h.badge, 30) || undefined, active: h.active !== false,
        contents: (h.contents ?? []).map((c) => text(c, 120)).filter(Boolean).slice(0, 30),
      };
      if (!hamper.name) throw new HttpError(400, "Hamper name is required");
      if (!Number.isFinite(price) || price <= 0) throw new HttpError(400, "Enter a hamper price above zero");
      if (!config.settings.gstRates.includes(hamper.gstRate)) throw new HttpError(400, "Choose a configured GST rate");
      if (!hamper.contents.length) throw new HttpError(400, "List at least one item inside the hamper");
      const existed = config.hampers.some((x) => x.id === hamper.id);
      next = { ...config, hampers: upsert(config.hampers, hamper) };
      entry = [existed ? "Hamper updated" : "Hamper created", hamper.name, `₹${hamper.price} · ${hamper.contents.length} items · ${hamper.active ? "Live" : "Hidden"}`];
      break;
    }
    case "hamper.delete": {
      const h = config.hampers.find((x) => x.id === action.id);
      next = { ...config, hampers: config.hampers.filter((x) => x.id !== action.id) };
      entry = ["Hamper deleted", h?.name ?? action.id, "Removed"];
      break;
    }
    case "festive.update": {
      const f = action.festive;
      const festive = {
        enabled: !!f.enabled, fireworks: !!f.fireworks, title: text(f.title, 60) || "Happy Diwali", subtitle: text(f.subtitle, 160),
        popupDelaySeconds: Math.min(60, Math.max(0, Math.round(Number(f.popupDelaySeconds) || 0))),
        repeatMinutes: Math.min(1440, Math.max(1, Math.round(Number(f.repeatMinutes) || 10))),
      };
      next = { ...config, festive };
      entry = ["Festive settings updated", "Hampers & fireworks", `Popup ${festive.enabled ? "on" : "off"} · Fireworks ${festive.fireworks ? "on" : "off"}`];
      break;
    }
    case "branding.update": {
      const patch = Object.fromEntries(Object.entries(action.patch).map(([k, v]) => [k, text(v, 600)]));
      next = { ...config, branding: { ...config.branding, ...patch } };
      entry = ["Branding updated", "Site content", Object.keys(patch).join(", ")];
      break;
    }
    case "slide.save": {
      const s = action.slide;
      const slide = { id: text(s.id, 80) || crypto.randomUUID(), eyebrow: text(s.eyebrow, 60), title: text(s.title, 120), copy: text(s.copy, 400), imageUrl: text(s.imageUrl, 300) || "/brand/krust-hero.png", ctaLabel: text(s.ctaLabel, 40), active: s.active !== false };
      if (!slide.title) throw new HttpError(400, "Slide wording is required");
      const existed = config.slides.some((x) => x.id === slide.id);
      next = { ...config, slides: upsert(config.slides, slide) };
      entry = [existed ? "Carousel slide updated" : "Carousel slide created", slide.title, slide.active ? "Live on storefront" : "Hidden"];
      break;
    }
    case "slide.delete": {
      const s = config.slides.find((x) => x.id === action.id);
      next = { ...config, slides: config.slides.filter((x) => x.id !== action.id) };
      entry = ["Carousel slide deleted", s?.title ?? action.id, "Removed"];
      break;
    }
    case "slide.move": {
      const i = config.slides.findIndex((x) => x.id === action.id);
      const j = i + action.direction;
      if (i < 0 || j < 0 || j >= config.slides.length) return;
      const slides = [...config.slides];
      [slides[i], slides[j]] = [slides[j], slides[i]];
      next = { ...config, slides };
      entry = ["Carousel reordered", slides[j].title, `Moved to position ${j + 1}`];
      break;
    }
    case "testimonial.save": {
      const t = action.item;
      const item = { id: text(t.id, 80) || crypto.randomUUID(), name: text(t.name, 80), role: text(t.role, 80), quote: text(t.quote, 500), rating: Math.min(5, Math.max(1, Math.round(Number(t.rating) || 5))), active: t.active !== false };
      if (!item.name || !item.quote) throw new HttpError(400, "Name and quote are required");
      next = { ...config, testimonials: upsert(config.testimonials, item) };
      entry = ["Testimonial saved", item.name, item.active ? "Visible" : "Hidden"];
      break;
    }
    case "testimonial.delete": {
      next = { ...config, testimonials: config.testimonials.filter((x) => x.id !== action.id) };
      entry = ["Testimonial deleted", action.id, "Removed"];
      break;
    }
    case "faq.save": {
      const f = action.item;
      const item = { id: text(f.id, 80) || crypto.randomUUID(), question: text(f.question, 200), answer: text(f.answer, 800), active: f.active !== false };
      if (!item.question || !item.answer) throw new HttpError(400, "Question and answer are required");
      next = { ...config, faqs: upsert(config.faqs, item) };
      entry = ["FAQ saved", item.question, item.active ? "Visible" : "Hidden"];
      break;
    }
    case "faq.delete": {
      next = { ...config, faqs: config.faqs.filter((x) => x.id !== action.id) };
      entry = ["FAQ deleted", action.id, "Removed"];
      break;
    }
    default:
      throw new HttpError(400, "Unknown action");
  }
  await saveConfig(next);
  await log(...entry);
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  console.error(error);
  return Response.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
}
