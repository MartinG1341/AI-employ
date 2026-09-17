import { NextResponse } from "next/server";
import { getLead } from "@/src/lib/leads/service";
import { supabaseRequest } from "@/src/lib/supabase/server";
import { getAIProvider } from "@/src/lib/ai/provider";

const allowedTones = new Set(["casual", "direct", "softer"]);
function contextValue(value: unknown) { return value == null ? "" : typeof value === "string" ? value : JSON.stringify(value); }
export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = body.action === "regenerate" ? "regenerate" : body.action === "first_message" ? "first_message" : ["shorter", "more_casual", "more_direct", "softer"].includes(String(body.action)) ? String(body.action) : "";
    if (!action || typeof body.leadId !== "string") return NextResponse.json({ error: "action and leadId are required." }, { status: 400 });
    const tone = typeof body.tone === "string" && allowedTones.has(body.tone) ? body.tone : "casual";
    const lead = await getLead(body.leadId);
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    const settings = await supabaseRequest<Record<string, unknown>[]>("sales_settings?select=kind,payload&app_id=eq.sales_copilot&order=updated_at.desc&limit=1");
    const rewrite = ["shorter", "more_casual", "more_direct", "softer"].includes(action);
    if (rewrite && typeof body.currentMessage !== "string") return NextResponse.json({ error: "currentMessage is required for rewrite actions." }, { status: 400 });
    const prompt = [`${rewrite ? `Rewrite the current editable Instagram DM using the ${action.replace("_", " ")} style.` : "Create a concise first Instagram DM for this lead."} Return only the message, with no analysis or quotation marks.`, `Business name: ${contextValue(lead.business_name)}`, `Instagram username: ${contextValue(lead.instagram_username)}`, `Category: ${contextValue(lead.category)}`, `Description: ${contextValue(lead.description)}`, `Bio: ${contextValue(lead.bio)}`, `Website: ${contextValue(lead.website)}`, `Notes: ${contextValue(lead.notes)}`, `Products/services: ${contextValue(lead.products_services)}`, `Customer contact method: ${contextValue(lead.customer_contact_method)}`, `Relevance summary: ${contextValue(lead.relevance_summary)}`, `Research summary: ${contextValue(lead.research_summary)}`, `Known facts: ${contextValue(lead.known_facts)}`, `AI inferences and outreach angle: ${contextValue(lead.ai_inferences)}`, `Sales Copilot writing settings: ${contextValue(settings[0]?.payload)}`, `Only mention business-specific details from Known facts. Never present inferences as facts or claim unsupported problems. Preserve the sales goal of starting a conversation and creating interest in a demo.`, action === "regenerate" ? "Create a meaningfully different version while preserving the same goal." : rewrite ? `Current editable message:\n${body.currentMessage}` : "Start a natural conversation. Never invent facts or claim pain points as facts.", `Tone: ${tone}`].join("\n");
    return NextResponse.json({ text: await getAIProvider().generateText({ prompt, tone }) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to generate message." }, { status: 400 }); }
}
