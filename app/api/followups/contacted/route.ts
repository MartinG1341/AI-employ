import { NextResponse } from "next/server";
import { markLeadContacted } from "@/src/lib/followups/service";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.leadId !== "string") return NextResponse.json({ error: "leadId is required." }, { status: 400 });
    return NextResponse.json(await markLeadContacted(body.leadId, typeof body.message === "string" ? body.message : "", typeof body.dueAt === "string" ? body.dueAt : undefined));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to mark lead contacted." }, { status: 400 }); }
}
