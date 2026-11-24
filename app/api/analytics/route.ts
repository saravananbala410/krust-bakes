import { getAnalytics, getReport, validateRange } from "@/lib/server/analytics";
import { errorResponse, HttpError, requireAdmin } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/**
 * Visitor and order statistics, for the dev admin only.
 * With ?from=YYYY-MM-DD&to=YYYY-MM-DD it returns the date-range report used for the PDF download.
 */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (admin.role !== "DEV_ADMIN") throw new HttpError(403, "Only the dev admin can see visitor analytics");
    const params = new URL(request.url).searchParams;
    if (params.has("from") || params.has("to")) {
      let range: { from: string; to: string };
      try { range = validateRange(params.get("from"), params.get("to")); } catch (e) { throw new HttpError(400, (e as Error).message); }
      return Response.json(await getReport(range.from, range.to), { headers: { "Cache-Control": "no-store" } });
    }
    return Response.json(await getAnalytics(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
