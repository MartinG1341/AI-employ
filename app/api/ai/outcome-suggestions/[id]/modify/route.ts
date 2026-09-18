import { NextResponse } from "next/server";
import { OUTCOME_TYPES, type OutcomeType } from "@/src/lib/learning/types";
import { reviewOutcomeSuggestion } from "@/src/lib/learning/reply-linking";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json() as { outcomes?: unknown };
    const outcomes = Array.isArray(body.outcomes) ? body.outcomes.flatMap(item => {
      if (!item || typeof item !== "object") return [];
      const value = item as Record<string, unknown>;
      return typeof value.outcome === "string" && OUTCOME_TYPES.includes(value.outcome as OutcomeType) && value.outcome !== "reply_received" ? [{ outcome: value.outcome as Exclude<OutcomeType, "reply_received">, confidence: Number(value.confidence) || 1, reason: typeof value.reason === "string" ? value.reason : "Manually confirmed." }] : [];
    }) : [];
    if (!outcomes.length) return NextResponse.json({ error: "At least one valid semantic outcome is required." }, { status: 400 });
    return NextResponse.json({ suggestion: await reviewOutcomeSuggestion((await params).id, "modified", outcomes) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to modify outcome suggestion." }, { status: 400 }); }
}
