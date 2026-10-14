import { errorResponse, placeOrder } from "@/lib/server/store";
import type { PlaceOrderInput } from "@/lib/store-core";

/** Public checkout endpoint. Prices, GST and minimum order are enforced server-side. */
export async function POST(request: Request) {
  try {
    const order = await placeOrder((await request.json()) as PlaceOrderInput);
    return Response.json({ id: order.id, token: order.token, total: order.total }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
