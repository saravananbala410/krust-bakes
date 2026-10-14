import { currentAdmin, errorResponse, getAdminData, getConfig, requireAdmin, runAction, toPublicAdmin } from "@/lib/server/store";
import type { AdminAction } from "@/lib/store-core";

export const dynamic = "force-dynamic";

/** Public catalogue/content; adds orders, history and admins when signed in. */
export async function GET(request: Request) {
  try {
    const [config, admin] = await Promise.all([getConfig(), currentAdmin(request)]);
    return Response.json({ config, me: admin ? toPublicAdmin(admin) : null, admin: admin ? await getAdminData() : null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Apply one admin action and return the fresh state. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const action = (await request.json()) as AdminAction;
    await runAction(admin, action);
    const fresh = await currentAdmin(request);
    return Response.json({ config: await getConfig(), me: fresh ? toPublicAdmin(fresh) : null, admin: fresh ? await getAdminData() : null });
  } catch (error) {
    return errorResponse(error);
  }
}
