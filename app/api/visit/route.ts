import { recordVisit } from "@/lib/server/analytics";

/** Anonymous storefront page view. Always answers 204 so tracking never affects the page. */
export async function POST(request: Request) {
  try {
    const { visitor, path } = (await request.json()) as { visitor?: string; path?: string };
    await recordVisit(String(visitor ?? ""), String(path ?? ""), request.headers.get("user-agent"));
  } catch (error) {
    console.error("visit tracking failed", error);
  }
  return new Response(null, { status: 204 });
}
