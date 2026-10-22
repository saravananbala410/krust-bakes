import { handleWebhook } from "@/lib/server/payments";
import { errorResponse } from "@/lib/server/store";

/** Razorpay → server notification. Signed with RAZORPAY_WEBHOOK_SECRET. */
export async function POST(request: Request) {
  try {
    return Response.json(await handleWebhook(await request.text(), request.headers.get("x-razorpay-signature")));
  } catch (error) {
    return errorResponse(error);
  }
}
