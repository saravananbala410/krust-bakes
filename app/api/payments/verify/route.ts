import { currentCustomer } from "@/lib/server/customers";
import { verifyPayment } from "@/lib/server/payments";
import { errorResponse } from "@/lib/server/store";

/** Confirms a Razorpay payment by checking its signature on the server. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { orderId?: string; token?: string; razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
    return Response.json(await verifyPayment(String(body.orderId ?? ""), body.token ?? null, await currentCustomer(request), body));
  } catch (error) {
    return errorResponse(error);
  }
}
