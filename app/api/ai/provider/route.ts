import { NextResponse } from "next/server";
import { getAIProviderName } from "@/src/lib/ai/provider";

export async function GET() { return NextResponse.json({ provider: getAIProviderName() }); }
