import { currentCustomer, customerOrders, signInWithGoogle, signOutCustomer } from "@/lib/server/customers";
import { errorResponse } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** The signed-in customer and their order history. */
export async function GET(request: Request) {
  try {
    const customer = await currentCustomer(request);
    return Response.json(customer ? { customer, ...(await customerOrders(customer)) } : { customer: null, orders: [], lastDetails: null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Sign in with a Google Identity Services credential. */
export async function POST(request: Request) {
  try {
    const { credential } = (await request.json()) as { credential?: string };
    const { customer, cookie } = await signInWithGoogle(request, String(credential ?? ""));
    return Response.json({ customer, ...(await customerOrders(customer)) }, { headers: { "Set-Cookie": cookie } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    return Response.json({ ok: true }, { headers: { "Set-Cookie": await signOutCustomer(request) } });
  } catch (error) {
    return errorResponse(error);
  }
}
