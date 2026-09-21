import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin, safeMetaMessage, stateCookie } from "@/src/lib/instagram/admin";
import { exchangeInstagramCode, extendInstagramToken, getInstagramAccount } from "@/src/lib/instagram/client";
import { saveConnection } from "@/src/lib/instagram/repository";
function back(request: NextRequest, error?: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("section", "instagram");
  url.searchParams.set(error ? "instagram_error" : "instagram_connected", error || "1");
  const response = NextResponse.redirect(url);
  response.cookies.set(stateCookie, "", { path: "/api/instagram/callback", maxAge: 0 });
  return response;
}
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return back(request, "Unlock Instagram settings and reconnect.");
  const expected = request.cookies.get(stateCookie)?.value ?? "";
  const actual = request.nextUrl.searchParams.get("state") ?? "";
  if (!expected || expected.length !== actual.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) return back(request, "Invalid OAuth state. Please reconnect.");
  const error = request.nextUrl.searchParams.get("error");
  if (error) return back(request, "Instagram authorization was cancelled or denied.");
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return back(request, "Instagram did not return an authorization code.");
  try {
    const short = await exchangeInstagramCode(code);
    if (!short.access_token) throw new Error("Token exchange failed.");
    const long = await extendInstagramToken(short.access_token);
    const account = await getInstagramAccount(long.access_token);
    if (!account.id || !account.username) throw new Error("Instagram Professional account not found.");
    const scopes = short.permissions ?? [];
    await saveConnection({ instagram_user_id: account.user_id ?? account.id, username: account.username, profile: account, access_token: long.access_token, token_expires_at: long.expires_in ? new Date(Date.now() + long.expires_in * 1000).toISOString() : null, scopes });
    return back(request);
  } catch (caught) { return back(request, safeMetaMessage(caught)); }
}
