import { NextResponse } from "next/server";
import { generateExperiment } from "@/src/lib/learning/service";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { leadId?: unknown };
    if (typeof body.leadId !== "string") return NextResponse.json({ error: "leadId is required." }, { status: 400 });
    return NextResponse.json(await generateExperiment(body.leadId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to generate experiment." }, { status: 400 });
  }
}
