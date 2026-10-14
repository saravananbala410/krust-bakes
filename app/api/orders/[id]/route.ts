import { errorResponse, getOrderForInvoice } from "@/lib/server/store";

/** Invoice data: readable with the order's private token, or by a signed-in admin. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = new URL(request.url).searchParams.get("t");
    return Response.json(await getOrderForInvoice(request, (await params).id, token), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
