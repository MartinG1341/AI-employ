import { NextRequest, NextResponse } from "next/server";
import { getBusinessProfile, updateBusinessProfile } from "@/src/lib/business-knowledge/service";
export async function GET() { return NextResponse.json(await getBusinessProfile()); }
export async function PATCH(request: NextRequest) { try { return NextResponse.json(await updateBusinessProfile(await request.json())); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update business profile." }, { status: 400 }); } }
