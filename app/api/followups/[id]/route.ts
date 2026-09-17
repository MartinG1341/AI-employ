import { NextResponse } from "next/server";
import { completeFollowup, getFollowup, snoozeFollowup, updateFollowup } from "@/src/lib/followups/service";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  try { const row = await getFollowup((await params).id); return row ? NextResponse.json(row) : NextResponse.json({ error: "Follow-up not found." }, { status: 404 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load follow-up." }, { status: 500 }); }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    if (body.action === "complete") return NextResponse.json(await completeFollowup(id));
    if (body.action === "snooze") return NextResponse.json(await snoozeFollowup(id, body.dueAt as string));
    if (body.action === "reschedule") return NextResponse.json(await updateFollowup(id, { dueAt: body.dueAt as string }));
    if (body.action === "cancel") return NextResponse.json(await updateFollowup(id, { status: "cancelled" }));
    return NextResponse.json({ error: "Invalid follow-up action." }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update follow-up." }, { status: 400 }); }
}
