"use client";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance } }

let script: Promise<void> | null = null;
function loadCheckout() {
  script ??= new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = "https://checkout.razorpay.com/v1/checkout.js";
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => { script = null; reject(new Error("Could not load Razorpay. Check your internet connection and try again.")); };
    document.head.appendChild(el);
  });
  return script;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
  return data;
}

export type PayResult = { status: "paid"; paymentId: string } | { status: "dismissed" } | { status: "failed"; message: string };

/** Opens Razorpay Checkout for an order; the server verifies the signature before anything is marked paid. */
export async function payOnline(orderId: string, token: string): Promise<PayResult> {
  try {
    const [start] = await Promise.all([
      post<{ keyId: string; razorpayOrderId: string; amount: number; currency: string; name: string; description: string; image?: string; prefill: Record<string, string> }>("/api/payments/start", { orderId, token }),
      loadCheckout(),
    ]);
    if (!window.Razorpay) throw new Error("Razorpay did not load");
    return await new Promise<PayResult>((resolve) => {
      let settled = false;
      const rzp = new window.Razorpay!({
        key: start.keyId,
        order_id: start.razorpayOrderId,
        amount: start.amount,
        currency: start.currency,
        name: start.name,
        description: start.description,
        image: start.image,
        prefill: start.prefill,
        theme: { color: "#EC2427" },
        handler: async (response: RazorpayResponse) => {
          settled = true;
          try {
            const verified = await post<{ paymentId: string }>("/api/payments/verify", { orderId, token, ...response });
            resolve({ status: "paid", paymentId: verified.paymentId });
          } catch (e) {
            resolve({ status: "failed", message: (e as Error).message });
          }
        },
        // A failed attempt keeps Checkout open so the customer can retry; report it only if they then close it.
        modal: { ondismiss: () => { if (!settled) resolve(lastError ? { status: "failed", message: lastError } : { status: "dismissed" }); } },
      });
      let lastError = "";
      rzp.on("payment.failed", (r) => { lastError = r.error?.description ?? "Payment failed"; });
      rzp.open();
    });
  } catch (e) {
    return { status: "failed", message: (e as Error).message };
  }
}
