import { NextResponse } from "next/server";
import { addCandidate } from "@/src/lib/lead-finder/service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) { try { return NextResponse.json(await addCandidate((await params).id)); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add candidate." }, { status: 400 }); } }
