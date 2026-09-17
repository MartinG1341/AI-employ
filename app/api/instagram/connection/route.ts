import { NextRequest, NextResponse } from "next/server";
import { isAdmin, safeMetaMessage, sameOrigin } from "@/src/lib/instagram/admin";
import { clearConnection, getConnection, publicConnection } from "@/src/lib/instagram/repository";
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unlock Instagram settings first." }, { status: 401 });
  try { return NextResponse.json(publicConnection(await getConnection())); } catch (error) { return NextResponse.json({ error: safeMetaMessage(error) }, { status: 500 }); }
}
export async function DELETE(request: NextRequest) {
  if (!isAdmin(request) || !sameOrigin(request)) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  try { await clearConnection(); return NextResponse.json({ connected: false }); } catch (error) { return NextResponse.json({ error: safeMetaMessage(error) }, { status: 500 }); }
}
