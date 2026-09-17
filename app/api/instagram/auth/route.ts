import { NextRequest, NextResponse } from "next/server";
import { adminCookie, isAdmin, sameOrigin, sessionValue, validPassword } from "@/src/lib/instagram/admin";
export async function GET(request: NextRequest) { try { return NextResponse.json({ authenticated: isAdmin(request) }); } catch { return NextResponse.json({ authenticated: false, error: "Admin password is not configured." }); } }
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = await request.json() as { password?: string };
    if (!validPassword(body.password ?? "")) return NextResponse.json({ error: "Incorrect admin password." }, { status: 401 });
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(adminCookie, sessionValue(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/instagram", maxAge: 60 * 60 * 12 });
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication failed." }, { status: 400 }); }
}
