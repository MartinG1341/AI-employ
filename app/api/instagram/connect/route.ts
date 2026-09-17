import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin, safeMetaMessage, stateCookie } from "@/src/lib/instagram/admin";
import { getInstagramOAuthUrl } from "@/src/lib/instagram/oauth";
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unlock Instagram settings first." }, { status: 401 });
  try {
    const state = randomBytes(32).toString("hex");
    const response = NextResponse.redirect(getInstagramOAuthUrl(state));
    response.cookies.set(stateCookie, state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/instagram/callback", maxAge: 600 });
    return response;
  } catch (error) { return NextResponse.json({ error: safeMetaMessage(error) }, { status: 500 }); }
}
