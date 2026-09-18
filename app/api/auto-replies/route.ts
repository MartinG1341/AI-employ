import { NextResponse } from "next/server";
import { listAutoReplies } from "@/src/lib/auto-reply/service";
export async function GET() { try { return NextResponse.json(await listAutoReplies()); } catch { return NextResponse.json({ error: "Unable to load auto-reply log." }, { status: 500 }); } }
