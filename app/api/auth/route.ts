import { errorResponse, login, logout } from "@/lib/server/store";

export async function POST(request: Request) {
  try {
    const { username, password } = (await request.json()) as { username?: string; password?: string };
    const { user, cookie } = await login(request, String(username ?? ""), String(password ?? ""));
    return Response.json({ user }, { headers: { "Set-Cookie": cookie } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    return Response.json({ ok: true }, { headers: { "Set-Cookie": await logout(request) } });
  } catch (error) {
    return errorResponse(error);
  }
}
