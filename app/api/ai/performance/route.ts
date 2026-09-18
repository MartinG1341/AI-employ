import { NextResponse } from "next/server";
import { getPerformance } from "@/src/lib/learning/service";

export async function GET(request: Request) {
  try { const url = new URL(request.url); return NextResponse.json({ performance: await getPerformance({ category: url.searchParams.get("category") || undefined, platform: url.searchParams.get("platform") || undefined, openerType: url.searchParams.get("openerType") || undefined }) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to calculate performance." }, { status: 400 }); }
}
