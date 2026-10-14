import { errorResponse, requireAdmin, saveAsset } from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const { mime, data } = (await request.json()) as { mime?: string; data?: string };
    return Response.json({ url: await saveAsset(admin, String(mime ?? ""), String(data ?? "")) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
