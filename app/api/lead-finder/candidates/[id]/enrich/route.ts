import { NextResponse } from "next/server";
import { enrichCandidate } from "@/src/lib/lead-finder/enrichment";
import { getCandidate, updateCandidateEnrichment } from "@/src/lib/lead-finder/service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const candidate = await getCandidate((await params).id); const enrichment = await enrichCandidate(candidate); const saved = await updateCandidateEnrichment(candidate.id, enrichment); return NextResponse.json({ candidate: saved, enrichment }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to enrich candidate." }, { status: 400 }); }
}
