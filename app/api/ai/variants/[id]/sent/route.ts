import { NextResponse } from "next/server";
import { markVariantSent } from "@/src/lib/learning/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => ({})) as { selected?: unknown };
    const variant = await markVariantSent((await params).id, body.selected !== false);
    return NextResponse.json({ variant });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to mark variant as sent." }, { status: 400 }); }
}
