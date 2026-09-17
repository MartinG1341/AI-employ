import { NextResponse } from "next/server";
import { getAIProviderDiagnostics } from "@/src/lib/ai/provider";

export async function GET() { return NextResponse.json(getAIProviderDiagnostics()); }
