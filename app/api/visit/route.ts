import { recordVisit } from "@/lib/server/analytics";
import { currentCustomer } from "@/lib/server/customers";

/** Anonymous storefront page view. Always answers 204 so tracking never affects the page. */
export async function POST(request: Request) {
  try {
    const { visitor, path } = (await request.json()) as { visitor?: string; path?: string };
    const customer = await currentCustomer(request).catch(() => null);
    await recordVisit(String(visitor ?? ""), String(path ?? ""), request.headers.get("user-agent"), customer?.id);
  } catch (error) {
    console.error("visit tracking failed", error);
  }
  return new Response(null, { status: 204 });
}
