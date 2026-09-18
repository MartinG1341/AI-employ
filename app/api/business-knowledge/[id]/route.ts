import { NextRequest, NextResponse } from "next/server";
import { deleteKnowledge, getKnowledge, updateKnowledge } from "@/src/lib/business-knowledge/service";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: NextRequest, { params }: Context) { const item = await getKnowledge((await params).id); return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 }); }
export async function PATCH(request: NextRequest, { params }: Context) { try { return NextResponse.json(await updateKnowledge((await params).id, await request.json())); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update business knowledge." }, { status: 400 }); } }
export async function DELETE(_: NextRequest, { params }: Context) { try { const deleted = await deleteKnowledge((await params).id); return deleted ? NextResponse.json({ ok: true, id: deleted.id }) : NextResponse.json({ error: "Not found" }, { status: 404 }); } catch { return NextResponse.json({ error: "Unable to delete business knowledge." }, { status: 500 }); } }
