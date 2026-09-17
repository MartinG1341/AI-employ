import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const adminCookie = "sales_instagram_admin";
export const stateCookie = "sales_instagram_oauth_state";
function password() { const value = process.env.SALES_COPILOT_ADMIN_PASSWORD; if (!value) throw new Error("Set SALES_COPILOT_ADMIN_PASSWORD to protect Instagram controls."); return value; }
function digest() { return createHmac("sha256", password()).update("sales-copilot-instagram-admin-v1").digest("hex"); }
export function validPassword(value: string) { const a = Buffer.from(value); const b = Buffer.from(password()); return a.length === b.length && timingSafeEqual(a, b); }
export function sessionValue() { return digest(); }
export function isAdmin(request: NextRequest) { const value = request.cookies.get(adminCookie)?.value ?? ""; const expected = Buffer.from(digest()); const actual = Buffer.from(value); return actual.length === expected.length && timingSafeEqual(actual, expected); }
export function sameOrigin(request: NextRequest) { return request.headers.get("origin") === new URL(request.url).origin; }
export function safeMetaMessage(error: unknown) { const value = error instanceof Error ? error.message : "Instagram request failed."; return value.replace(/(access_token|client_secret|code)=([^&\s]+)/gi, "$1=[redacted]").slice(0, 500); }
