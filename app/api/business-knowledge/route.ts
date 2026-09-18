import { NextRequest, NextResponse } from "next/server";
import { createKnowledge, listKnowledge } from "@/src/lib/business-knowledge/service";

export async function GET() { return NextResponse.json(await listKnowledge()); }
export async function POST(request: NextRequest) {
  try { const body = await request.json() as Record<string, unknown>; for (const field of ["category", "key", "title"]) if (typeof body[field] !== "string" || !body[field].trim()) return NextResponse.json({ error: `${field} is required` }, { status: 400 }); if (body.value === undefined) return NextResponse.json({ error: "value is required" }, { status: 400 }); return NextResponse.json(await createKnowledge({ category: body.category as string, key: body.key as string, title: body.title as string, value: body.value, status: body.status as never, confidence: typeof body.confidence === "number" ? body.confidence : undefined, source: body.source as never, notes: typeof body.notes === "string" ? body.notes : null }), { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save business knowledge." }, { status: 400 }); }
}
