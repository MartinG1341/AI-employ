import { NextResponse } from "next/server";
import { createFollowup, getFollowups } from "@/src/lib/followups/service";

export async function GET() {
  try { return NextResponse.json(await getFollowups()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load follow-ups." }, { status: 500 }); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.leadId !== "string") return NextResponse.json({ error: "leadId is required." }, { status: 400 });
    return NextResponse.json(await createFollowup(body.leadId, body.dueAt as string, typeof body.previousMessage === "string" ? body.previousMessage : undefined), { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create follow-up." }, { status: 400 }); }
}
