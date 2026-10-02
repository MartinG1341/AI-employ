import { NextRequest, NextResponse } from "next/server";
import { isAdmin, sameOrigin } from "@/src/lib/instagram/admin";

const publicApi = new Set(["/api/instagram/auth", "/api/instagram/callback", "/api/instagram/webhook"]);

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/") || publicApi.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  try {
    if (!isAdmin(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !sameOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
    return NextResponse.next();
  } catch {
    return NextResponse.json({ error: "Application authentication is not configured." }, { status: 503 });
  }
}

export const config = { matcher: "/api/:path*" };
