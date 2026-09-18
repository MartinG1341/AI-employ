import { NextResponse } from "next/server";
import { listOutcomeSuggestions } from "@/src/lib/learning/reply-linking";

export async function GET(request: Request) {
  try { return NextResponse.json({ suggestions: await listOutcomeSuggestions(new URL(request.url).searchParams.get("leadId") || undefined) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to list outcome suggestions." }, { status: 400 }); }
}
