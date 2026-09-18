import { NextResponse } from "next/server";
import { reviewOutcomeSuggestion } from "@/src/lib/learning/reply-linking";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json({ suggestion: await reviewOutcomeSuggestion((await params).id, "rejected") }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reject outcome suggestion." }, { status: 400 }); }
}
