import { getAnalytics } from "@/lib/server/analytics";
import { errorResponse, HttpError, requireAdmin } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** Visitor and order statistics, for the dev admin only. */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (admin.role !== "DEV_ADMIN") throw new HttpError(403, "Only the dev admin can see visitor analytics");
    return Response.json(await getAnalytics(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
