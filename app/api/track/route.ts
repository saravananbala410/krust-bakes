import { trackOrder } from "@/lib/server/customers";
import { errorResponse } from "@/lib/server/store";

/** Guest order tracking by order ID and phone number. */
export async function POST(request: Request) {
  try {
    const { id, phone } = (await request.json()) as { id?: string; phone?: string };
    return Response.json({ order: await trackOrder(String(id ?? ""), String(phone ?? "")) });
  } catch (error) {
    return errorResponse(error);
  }
}
