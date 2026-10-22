import type { Customer, CustomerOrder, StoreOrder } from "@/lib/store-core";
import { database, getConfig, HttpError, logAudit, readCookie, ready, sha256 } from "./store";

const COOKIE = "krust_customer";
const SESSION_DAYS = 60;
const GOOGLE_CERTS = "https://www.googleapis.com/oauth2/v3/certs";

type Jwk = JsonWebKey & { kid: string };
let certCache: { keys: Jwk[]; expires: number } | null = null;

async function googleKeys(force = false) {
  if (!force && certCache && certCache.expires > Date.now()) return certCache.keys;
  const response = await fetch(GOOGLE_CERTS);
  if (!response.ok) throw new HttpError(502, "Could not reach Google to verify sign-in. Please try again.");
  const maxAge = Number(response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ?? 3600);
  const { keys } = (await response.json()) as { keys: Jwk[] };
  certCache = { keys, expires: Date.now() + maxAge * 1000 };
  return keys;
}

const b64urlBytes = (part: string) => Uint8Array.from(atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const b64urlJson = <T>(part: string) => JSON.parse(new TextDecoder().decode(b64urlBytes(part))) as T;

type GoogleClaims = { iss: string; aud: string; sub: string; exp: number; email?: string; email_verified?: boolean; name?: string; picture?: string };

/** Verifies a Google Identity Services ID token (RS256) against Google's published keys. */
async function verifyGoogleToken(credential: string, clientId: string): Promise<GoogleClaims> {
  const parts = credential.split(".");
  if (parts.length !== 3) throw new HttpError(400, "Invalid Google sign-in response");
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = b64urlJson<{ alg: string; kid: string }>(headerPart);
  if (header.alg !== "RS256") throw new HttpError(400, "Unsupported Google token");
  let jwk = (await googleKeys()).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await googleKeys(true)).find((k) => k.kid === header.kid);
  if (!jwk) throw new HttpError(401, "Google sign-in could not be verified");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlBytes(signaturePart), new TextEncoder().encode(`${headerPart}.${payloadPart}`));
  if (!valid) throw new HttpError(401, "Google sign-in could not be verified");
  const claims = b64urlJson<GoogleClaims>(payloadPart);
  if (claims.iss !== "accounts.google.com" && claims.iss !== "https://accounts.google.com") throw new HttpError(401, "Google sign-in could not be verified");
  if (claims.aud !== clientId) throw new HttpError(401, "This sign-in was issued for a different website");
  if (claims.exp * 1000 < Date.now()) throw new HttpError(401, "Google sign-in expired. Please try again.");
  if (!claims.email || claims.email_verified === false) throw new HttpError(401, "Your Google account email is not verified");
  return claims;
}

async function readCustomer(id: string) {
  const row = await database().prepare("SELECT data FROM customers WHERE id = ?").bind(id).first<{ data: string }>();
  return row ? (JSON.parse(row.data) as Customer) : null;
}

async function writeCustomer(customer: Customer) {
  await database().prepare("INSERT INTO customers (id, email, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email, data = excluded.data").bind(customer.id, customer.email, JSON.stringify(customer)).run();
}

export async function signInWithGoogle(request: Request, credential: string) {
  const { settings } = await getConfig();
  if (!settings.googleClientId) throw new HttpError(503, "Google sign-in is not set up yet");
  const claims = await verifyGoogleToken(String(credential ?? ""), settings.googleClientId);
  await ready();
  const id = `google:${claims.sub}`;
  const existing = await readCustomer(id);
  const at = new Date().toISOString();
  const customer: Customer = { ...existing, id, email: claims.email!.toLowerCase(), name: claims.name || existing?.name || claims.email!.split("@")[0], picture: claims.picture, createdAt: existing?.createdAt ?? at, lastLoginAt: at };
  await writeCustomer(customer);
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  await database().batch([
    database().prepare("DELETE FROM customer_sessions WHERE expires_at < ?").bind(Date.now()),
    database().prepare("INSERT INTO customer_sessions (token_hash, customer_id, expires_at) VALUES (?, ?, ?)").bind(await sha256(token), id, Date.now() + SESSION_DAYS * 86_400_000),
  ]);
  if (!existing) await logAudit(customer.name, "Customer account created", customer.email, "Signed up with Google", "CUSTOMER");
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return { customer, cookie: `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}` };
}

export async function signOutCustomer(request: Request) {
  const token = readCookie(request, COOKIE);
  if (token) { await ready(); await database().prepare("DELETE FROM customer_sessions WHERE token_hash = ?").bind(await sha256(token)).run(); }
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function currentCustomer(request: Request): Promise<Customer | null> {
  const token = readCookie(request, COOKIE);
  if (!token) return null;
  await ready();
  const session = await database().prepare("SELECT customer_id, expires_at FROM customer_sessions WHERE token_hash = ?").bind(await sha256(token)).first<{ customer_id: string; expires_at: number }>();
  if (!session || session.expires_at < Date.now()) return null;
  return readCustomer(session.customer_id);
}

const toCustomerOrder = (o: StoreOrder): CustomerOrder => ({ id: o.id, token: o.token, createdAt: o.createdAt, deliveryDate: o.deliveryDate, status: o.status, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod, total: o.total, items: o.items, lines: o.lines, address: o.address, paymentId: o.paymentId, paidAt: o.paidAt });

/** Orders placed while signed in, plus earlier guest orders that used the same (Google-verified) email. */
export async function customerOrders(customer: Customer) {
  await ready();
  const { results } = await database().prepare("SELECT data FROM orders WHERE deleted = 0 AND (customer_id = ? OR lower(json_extract(data, '$.email')) = ?) ORDER BY created_at DESC LIMIT 200").bind(customer.id, customer.email).all<{ data: string }>();
  const orders = results.map((r) => JSON.parse(r.data) as StoreOrder);
  // Remember the latest delivery details so checkout can prefill them.
  const last = orders[0];
  return { orders: orders.map(toCustomerOrder), lastDetails: last ? { name: last.customer, phone: last.phone, whatsapp: last.whatsapp, address: last.address, pincode: last.pincode ?? "" } : null };
}

/** Guest order tracking: order ID plus the phone number used on the order. */
export async function trackOrder(id: string, phone: string) {
  await ready();
  const row = await database().prepare("SELECT data FROM orders WHERE id = ? AND deleted = 0").bind(id.trim().toUpperCase()).first<{ data: string }>();
  const digits = (v: string) => v.replace(/\D/g, "").slice(-10);
  const order = row ? (JSON.parse(row.data) as StoreOrder) : null;
  if (!order || digits(order.phone) !== digits(phone) || digits(phone).length < 10) throw new HttpError(404, "No order found with that order ID and phone number");
  return toCustomerOrder(order);
}
