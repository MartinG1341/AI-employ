import { NextRequest, NextResponse } from "next/server";
import { getAutoReplySettings, updateAutoReplySettings } from "@/src/lib/auto-reply/service";
export async function GET() { return NextResponse.json(await getAutoReplySettings()); }
export async function PATCH(request: NextRequest) { try { return NextResponse.json(await updateAutoReplySettings(await request.json())); } catch { return NextResponse.json({ error: "Unable to update auto-reply settings." }, { status: 400 }); } }
