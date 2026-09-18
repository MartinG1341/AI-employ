import { NextRequest, NextResponse } from "next/server";
import { deleteKnowledge, getKnowledge, updateKnowledge } from "@/src/lib/business-knowledge/service";
export async function GET(_: NextRequest, { params }: { params: { id: string } }) { const item = await getKnowledge(params.id); return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 }); }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) { try { return NextResponse.json(await updateKnowledge(params.id, await request.json())); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update business knowledge." }, { status: 400 }); } }
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) { await deleteKnowledge(params.id); return NextResponse.json({ ok: true }); }
