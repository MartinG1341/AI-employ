import { NextResponse } from "next/server";
import { addLeadActivity, getLead, updateLead } from "@/src/lib/leads/service";
import { supabaseRequest } from "@/src/lib/supabase/server";
import { getAIProvider } from "@/src/lib/ai/provider";

type Research = { summary: string; knownFacts: string[]; inferences: string[]; potentialProblems: string[]; relevance: string; outreachAngle: string; doNotClaim: string[] };
const text = (value: unknown) => value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
function fallback(lead: Record<string, unknown>): Research {
  const facts = [lead.business_name, lead.instagram_username, lead.category, lead.description, lead.bio, lead.website, lead.products_services].filter(value => typeof value === "string" && value.trim()).map(value => String(value));
  return { summary: `${String(lead.business_name || lead.instagram_username || "This business")} appears to be a ${String(lead.category || "business")} based on the available lead information.`, knownFacts: facts, inferences: [], potentialProblems: [], relevance: "A responsive Instagram sales flow may be useful if this business handles customer questions through Instagram, but that need is not confirmed by the available data.", outreachAngle: "Ask whether making Instagram enquiries easier to handle would be useful, without assuming their current process.", doNotClaim: ["Do not claim customer volume, revenue, DM volume, or operational problems without evidence."] };
}
function parse(raw: string, lead: Record<string, unknown>): Research {
  try {
    const value = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) as Partial<Research>;
    if (!value || typeof value.summary !== "string" || !Array.isArray(value.knownFacts) || !Array.isArray(value.inferences) || !Array.isArray(value.potentialProblems) || typeof value.relevance !== "string" || typeof value.outreachAngle !== "string" || !Array.isArray(value.doNotClaim)) throw new Error("structured research fields are incomplete");
    return { summary: value.summary, knownFacts: value.knownFacts.map(String), inferences: value.inferences.map(String), potentialProblems: value.potentialProblems.map(String), relevance: value.relevance, outreachAngle: value.outreachAngle, doNotClaim: value.doNotClaim.map(String) };
  } catch (error) {
    if ((process.env.AI_PROVIDER || "mock").trim().toLowerCase() === "mock") return fallback(lead);
    throw new Error(`AI research returned incomplete or invalid structured JSON. ${error instanceof Error && error.name !== "SyntaxError" ? error.message : "Try Research Lead again."}`);
  }
}
export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.leadId !== "string") return NextResponse.json({ error: "leadId is required." }, { status: 400 });
    const lead = await getLead(body.leadId);
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    const settings = await supabaseRequest<Record<string, unknown>[]>("sales_settings?select=kind,payload&app_id=eq.sales_copilot&order=updated_at.desc&limit=1");
    const prompt = [`Analyze this Sales Copilot lead using only the supplied information. Return ONLY valid JSON with exactly these fields: summary, knownFacts, inferences, potentialProblems, relevance, outreachAngle, doNotClaim. Every list must contain strings.`, `Never invent facts, revenue, customer volume, Instagram DM volume, posts, content, or business problems. Put directly supported information only in knownFacts. Put reasonable but unconfirmed interpretations only in inferences. Treat potentialProblems as possibilities, never facts. Say when information is limited. Do not create fake personalization.`, `Lead data: business_name=${text(lead.business_name)}; instagram_username=${text(lead.instagram_username)}; instagram_url=${text(lead.instagram_url)}; website=${text(lead.website)}; category=${text(lead.category)}; description=${text(lead.description)}; bio=${text(lead.bio)}; notes=${text(lead.notes)}; products_services=${text(lead.products_services)}; customer_contact_method=${text(lead.customer_contact_method)}; relevance_summary=${text(lead.relevance_summary)}; research_summary=${text(lead.research_summary)}; known_facts=${text(lead.known_facts)}; ai_inferences=${text(lead.ai_inferences)}; Sales Copilot settings=${text(settings[0]?.payload)}`].join("\n");
    const research = parse(await getAIProvider().generateText({ prompt, tone: "direct", purpose: "research", maxTokens: 1000, responseFormat: { type: "json_schema", json_schema: { name: "sales_copilot_research", strict: true, schema: { type: "object", additionalProperties: false, required: ["summary", "knownFacts", "inferences", "potentialProblems", "relevance", "outreachAngle", "doNotClaim"], properties: { summary: { type: "string" }, knownFacts: { type: "array", items: { type: "string" } }, inferences: { type: "array", items: { type: "string" } }, potentialProblems: { type: "array", items: { type: "string" } }, relevance: { type: "string" }, outreachAngle: { type: "string" }, doNotClaim: { type: "array", items: { type: "string" } } } } } }, temperature: 0.2 }), lead);
    const updated = await updateLead(body.leadId, { research_summary: research.summary, known_facts: research.knownFacts, ai_inferences: { items: research.inferences, potentialProblems: research.potentialProblems, outreachAngle: research.outreachAngle, doNotClaim: research.doNotClaim }, relevance_summary: research.relevance });
    await addLeadActivity(body.leadId, "research_generated", research.summary, { outreach_angle: research.outreachAngle });
    return NextResponse.json({ ...research, lead: updated });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to research lead." }, { status: 400 }); }
}
