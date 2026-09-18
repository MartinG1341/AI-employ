import { NextResponse } from "next/server";
import { createSession, getCandidates, getMessages, saveCandidates, saveMessage } from "@/src/lib/lead-finder/service";
import { searchWeb } from "@/src/lib/lead-finder/openai";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>; const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query || query.length > 2000) return NextResponse.json({ error: "Enter a search request up to 2,000 characters." }, { status: 400 });
    const sessionId = typeof body.sessionId === "string" && body.sessionId ? body.sessionId : await createSession(query); const history = await getMessages(sessionId); const existingCandidates = await getCandidates(sessionId); await saveMessage(sessionId, "user", query);
    const result = await searchWeb(query, history, { existingCandidates }); await saveMessage(sessionId, "assistant", result.answer); const candidates = await saveCandidates(sessionId, result.candidates);
    return NextResponse.json({ sessionId, answer: result.answer, candidates });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to search for leads." }, { status: 400 }); }
}
export async function GET(request: Request) { try { const sessionId = new URL(request.url).searchParams.get("sessionId"); if (!sessionId) return NextResponse.json({ error: "sessionId is required." }, { status: 400 }); return NextResponse.json({ sessionId, candidates: await getCandidates(sessionId), messages: await getMessages(sessionId) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load search session." }, { status: 400 }); } }
