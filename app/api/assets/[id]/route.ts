import { errorResponse, readAsset } from "@/lib/server/store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const asset = await readAsset((await params).id);
    if (!asset) return new Response("Not found", { status: 404 });
    const bytes = Uint8Array.from(atob(asset.data), (c) => c.charCodeAt(0));
    return new Response(bytes, { headers: { "Content-Type": asset.mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } });
  } catch (error) {
    return errorResponse(error);
  }
}
