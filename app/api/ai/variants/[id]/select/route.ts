import { NextResponse } from "next/server";
import { selectVariant } from "@/src/lib/learning/service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json({ variant: await selectVariant((await params).id) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to select variant." }, { status: 400 }); }
}
