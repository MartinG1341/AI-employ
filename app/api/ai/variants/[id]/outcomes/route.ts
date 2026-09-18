import { NextResponse } from "next/server";
import { OUTCOME_TYPES, type OutcomeType } from "@/src/lib/learning/types";
import { recordOutcome, removeOutcome } from "@/src/lib/learning/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json() as { outcomeType?: unknown; source?: unknown; metadata?: unknown; idempotencyKey?: unknown };
    if (typeof body.outcomeType !== "string" || !OUTCOME_TYPES.includes(body.outcomeType as OutcomeType)) return NextResponse.json({ error: "A valid outcomeType is required." }, { status: 400 });
    const result = await recordOutcome((await params).id, body.outcomeType as OutcomeType, typeof body.source === "string" ? body.source : "manual", body.metadata && typeof body.metadata === "object" ? body.metadata as Record<string, unknown> : {}, typeof body.idempotencyKey === "string" && body.idempotencyKey ? body.idempotencyKey : undefined);
    return NextResponse.json(result);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to record outcome." }, { status: 400 }); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => ({})) as { outcomeId?: unknown };
    if (typeof body.outcomeId !== "string") return NextResponse.json({ error: "outcomeId is required." }, { status: 400 });
    return NextResponse.json({ outcome: await removeOutcome((await params).id, body.outcomeId) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to remove outcome." }, { status: 400 }); }
}
