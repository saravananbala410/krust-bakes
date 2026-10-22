import { env } from "cloudflare:workers";
import type { Customer, StoreOrder } from "@/lib/store-core";
import { database, getConfig, HttpError, logAudit, razorpayKeys, readOrder, ready, writeOrder } from "./store";

const RAZORPAY_API = "https://api.razorpay.com/v1";

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison so signature checks don't leak timing. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const paise = (rupees: number) => Math.round(rupees * 100);

/** The order, if this caller may pay for it: its private token, or the signed-in customer who placed it. */
async function payableOrder(id: string, token: string | null, customer: Customer | null) {
  await ready();
  const found = await readOrder(String(id ?? "").trim().toUpperCase());
  if (!found || found.deleted) throw new HttpError(404, "Order not found");
  const owner = customer && found.order.customerId === customer.id;
  if (found.order.token !== token && !owner) throw new HttpError(403, "This payment link is not valid");
  return found;
}

/** Creates (or reuses) the Razorpay order and returns what the browser's Checkout needs. */
export async function startPayment(id: string, token: string | null, customer: Customer | null) {
  const keys = razorpayKeys();
  if (!keys) throw new HttpError(503, "Online payment is not set up yet");
  const found = await payableOrder(id, token, customer);
  const order = found.order;
  if (order.paymentStatus === "PAID") throw new HttpError(409, "This order is already paid");
  if (order.status === "CANCELLED") throw new HttpError(409, "This order was cancelled");

  let razorpayOrderId = order.razorpayOrderId;
  if (!razorpayOrderId) {
    const response = await fetch(`${RAZORPAY_API}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${btoa(`${keys.keyId}:${keys.keySecret}`)}` },
      body: JSON.stringify({ amount: paise(order.total), currency: "INR", receipt: order.id, notes: { order_id: order.id } }),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };
    if (!response.ok || !body.id) {
      console.error("Razorpay order creation failed", response.status, body.error?.description);
      throw new HttpError(502, response.status === 401 ? "Razorpay rejected the API keys. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." : "Could not start the payment. Please try again.");
    }
    razorpayOrderId = body.id;
    await writeOrder({ ...order, razorpayOrderId, paymentMethod: "RAZORPAY", updatedAt: new Date().toISOString() }, found.deleted);
  }

  const { branding } = await getConfig();
  return {
    keyId: keys.keyId,
    razorpayOrderId,
    amount: paise(order.total),
    currency: "INR",
    name: branding.storeName,
    description: `Order ${order.id}`,
    image: branding.logoUrl.startsWith("http") ? branding.logoUrl : undefined,
    prefill: { name: order.customer, email: order.email ?? "", contact: order.phone.replace(/[^\d+]/g, "") },
  };
}

async function markPaid(order: StoreOrder, deleted: boolean, paymentId: string, via: string) {
  if (order.paymentStatus === "PAID" && order.paymentId === paymentId) return order;
  const paid: StoreOrder = { ...order, paymentStatus: "PAID", paymentMethod: "RAZORPAY", paymentId, paidAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await writeOrder(paid, deleted);
  await logAudit("Razorpay", "Online payment received", order.id, `₹${order.total} · ${paymentId} · via ${via}`, "CUSTOMER");
  return paid;
}

/** Called by the browser after Checkout succeeds; trusts nothing until the signature checks out. */
export async function verifyPayment(id: string, token: string | null, customer: Customer | null, payload: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string }) {
  const keys = razorpayKeys();
  if (!keys) throw new HttpError(503, "Online payment is not set up yet");
  const found = await payableOrder(id, token, customer);
  const { razorpay_order_id: rzpOrder = "", razorpay_payment_id: paymentId = "", razorpay_signature: signature = "" } = payload;
  if (!found.order.razorpayOrderId || found.order.razorpayOrderId !== rzpOrder) throw new HttpError(400, "Payment does not match this order");
  const expected = await hmacHex(keys.keySecret, `${rzpOrder}|${paymentId}`);
  if (!safeEqual(expected, String(signature))) throw new HttpError(400, "Payment could not be verified. If money was deducted, it will be confirmed automatically or refunded by Razorpay.");
  const paid = await markPaid(found.order, found.deleted, paymentId, "checkout");
  return { id: paid.id, paymentStatus: paid.paymentStatus, paymentId: paid.paymentId, paidAt: paid.paidAt };
}

type WebhookEvent = { event: string; payload?: { payment?: { entity?: { id: string; order_id: string; amount: number; status: string } } } };

/** Razorpay webhook: marks the order paid even if the customer closed the page before the browser could confirm. */
export async function handleWebhook(rawBody: string, signature: string | null) {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new HttpError(503, "Webhook secret is not configured");
  const expected = await hmacHex(secret, rawBody);
  if (!signature || !safeEqual(expected, signature)) throw new HttpError(401, "Invalid webhook signature");
  const event = JSON.parse(rawBody) as WebhookEvent;
  const payment = event.payload?.payment?.entity;
  if (!payment || !["payment.captured", "order.paid"].includes(event.event)) return { ignored: event.event };
  await ready();
  const row = await database().prepare("SELECT id FROM orders WHERE json_extract(data, '$.razorpayOrderId') = ?").bind(payment.order_id).first<{ id: string }>();
  if (!row) return { ignored: "unknown order" };
  const found = await readOrder(row.id);
  if (!found) return { ignored: "unknown order" };
  if (payment.amount !== paise(found.order.total)) {
    await logAudit("Razorpay", "Payment amount mismatch", found.order.id, `Paid ${payment.amount / 100}, expected ${found.order.total} · ${payment.id}`, "CUSTOMER");
    return { ignored: "amount mismatch" };
  }
  await markPaid(found.order, found.deleted, payment.id, "webhook");
  return { ok: true };
}
