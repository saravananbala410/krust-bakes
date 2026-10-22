import { currentCustomer } from "@/lib/server/customers";
import { startPayment } from "@/lib/server/payments";
import { errorResponse } from "@/lib/server/store";

/** Opens a Razorpay payment for an order (new order, or "Pay now" on an unpaid one). */
export async function POST(request: Request) {
  try {
    const { orderId, token } = (await request.json()) as { orderId?: string; token?: string };
    return Response.json(await startPayment(String(orderId ?? ""), token ?? null, await currentCustomer(request)));
  } catch (error) {
    return errorResponse(error);
  }
}
