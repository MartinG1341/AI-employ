import { NextResponse } from "next/server";
import { getStyleProfile, rebuildStyleProfile } from "@/src/lib/personal-style/service";

export async function GET() {
  try {
    const profile = await getStyleProfile();
    const status = profile.sample_count >= 15 ? "established profile" : profile.sample_count >= 5 ? "early profile" : "insufficient data";
    return NextResponse.json({ ...profile, status });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load style profile." }, { status: 400 }); }
}

export async function POST() {
  try { return NextResponse.json(await rebuildStyleProfile()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to rebuild style profile." }, { status: 400 }); }
}
