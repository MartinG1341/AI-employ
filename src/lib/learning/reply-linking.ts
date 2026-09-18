import { getAIProvider, getAIProviderName } from "@/src/lib/ai/provider";
import { supabaseRequest } from "@/src/lib/supabase/server";
import { recordOutcome } from "./service";
import { decideReply } from "@/src/lib/reply-decision/service";
import type { OutcomeType, OutcomeSuggestion } from "./types";

type Message = { id: string; conversation_id: string; body: string; sent_at: string; direction: "inbound" | "outbound" };
type Conversation = { id: string; lead_id: string | null };
type Variant = { id: string; experiment_id: string; message: string; edited_final_text: string | null; sent: boolean; sent_at: string | null };
type Experiment = { id: string; lead_id: string };
type SuggestionInput = { outcome: Exclude<OutcomeType, "reply_received">; confidence: number; reason: string };

const semanticOutcomes: Array<Exclude<OutcomeType, "reply_received">> = ["no_reply", "reply_neutral", "reply_positive", "reply_negative", "not_interested", "asks_price", "asks_demo", "asks_more_info", "meeting_booked", "converted", "blocked"];
const suggestionSchema = { type: "object", additionalProperties: false, required: ["suggestions", "overallConfidence"], properties: { suggestions: { type: "array", maxItems: 3, items: { type: "object", additionalProperties: false, required: ["outcome", "confidence", "reason"], properties: { outcome: { type: "string", enum: semanticOutcomes }, confidence: { type: "number", minimum: 0, maximum: 1 }, reason: { type: "string", maxLength: 160 } } } }, overallConfidence: { type: "number", minimum: 0, maximum: 1 } } };

function normalize(value: string) { return value.toLowerCase().replace(/\s+/g, " ").trim(); }
function parseSuggestions(raw: string): { suggestions: SuggestionInput[]; overallConfidence: number } {
  const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) as { suggestions?: unknown; overallConfidence?: unknown };
  const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    const outcome = typeof value.outcome === "string" && semanticOutcomes.includes(value.outcome as SuggestionInput["outcome"]) ? value.outcome as SuggestionInput["outcome"] : null;
    if (!outcome) return [];
    return [{ outcome, confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0)), reason: typeof value.reason === "string" ? value.reason.slice(0, 160) : "Observed in the reply." }];
  }) : [];
  return { suggestions, overallConfidence: Math.max(0, Math.min(1, Number(parsed.overallConfidence) || 0)) };
}
function fallbackSuggestions(body: string): { suggestions: SuggestionInput[]; overallConfidence: number } {
  const text = normalize(body);
  if (/not interested|no thanks|don't want|do not want|remove me|stop contacting/.test(text)) return { suggestions: [{ outcome: "not_interested", confidence: 0.98, reason: "The reply explicitly declines the offer." }], overallConfidence: 0.98 };
  if (/how much|price|cost|pricing|budget|quote/.test(text)) return { suggestions: [{ outcome: "asks_price", confidence: 0.96, reason: "The reply asks about price or cost." }], overallConfidence: 0.96 };
  if (/book a call|schedule|appointment|meet|demo|call\??$/.test(text)) return { suggestions: [{ outcome: /book|schedule|appointment|meet/.test(text) ? "meeting_booked" : "asks_demo", confidence: 0.9, reason: "The reply requests a call, meeting, or demonstration." }], overallConfidence: 0.9 };
  if (/more info|more information|tell me more|details/.test(text)) return { suggestions: [{ outcome: "asks_more_info", confidence: 0.9, reason: "The reply requests more information." }], overallConfidence: 0.9 };
  if (/\bok\b|thanks|thank you|got it/.test(text) && text.length < 50) return { suggestions: [{ outcome: "reply_neutral", confidence: 0.62, reason: "The reply acknowledges the message without a clear buying signal." }], overallConfidence: 0.62 };
  if (/interested|sounds good|yes[,! ]|let's do it/.test(text)) return { suggestions: [{ outcome: "reply_positive", confidence: 0.82, reason: "The reply contains an explicit positive signal." }], overallConfidence: 0.82 };
  return { suggestions: [{ outcome: "reply_neutral", confidence: 0.45, reason: "The reply is not specific enough for a stronger classification." }], overallConfidence: 0.45 };
}
async function classifyReply(body: string) {
  if (getAIProviderName() === "Mock") return fallbackSuggestions(body);
  try {
    const raw = await getAIProvider().generateText({ purpose: "classification", maxTokens: 420, temperature: 0, responseFormat: { type: "json_schema", json_schema: { name: "sales_reply_outcome_suggestions", strict: true, schema: suggestionSchema } }, prompt: `Classify this inbound Instagram reply conservatively. Suggest only outcomes directly supported by the text. Never suggest converted, meeting_booked, or reply_positive without explicit evidence. Reply text: ${JSON.stringify(body.slice(0, 1000))}` });
    const parsed = parseSuggestions(raw);
    return parsed.suggestions.length ? parsed : fallbackSuggestions(body);
  } catch { return fallbackSuggestions(body); }
}

async function findLink(message: Message) {
  const conversations = await supabaseRequest<Conversation[]>(`sales_conversations?id=eq.${encodeURIComponent(message.conversation_id)}&app_id=eq.sales_copilot&select=id,lead_id`);
  const leadId = conversations[0]?.lead_id;
  if (!leadId) return { variantId: null, confidence: "low" as const, method: "no_lead_on_conversation" };
  const experiments = await supabaseRequest<Experiment[]>(`sales_ai_experiments?lead_id=eq.${encodeURIComponent(leadId)}&app_id=eq.sales_copilot&select=id,lead_id`);
  if (!experiments.length) return { variantId: null, confidence: "low" as const, method: "no_experiment_for_lead" };
  const ids = experiments.map(e => e.id).join(",");
  const variants = await supabaseRequest<Variant[]>(`sales_ai_message_variants?experiment_id=in.(${encodeURIComponent(ids)})&app_id=eq.sales_copilot&sent=eq.true&sent_at=not.is.null&select=id,experiment_id,message,edited_final_text,sent,sent_at&order=sent_at.desc`);
  const candidates = variants.filter(v => v.sent_at && new Date(v.sent_at).getTime() <= new Date(message.sent_at).getTime());
  if (!candidates.length) return { variantId: null, confidence: "low" as const, method: "no_sent_variant_before_reply" };
  const outbound = await supabaseRequest<Message[]>(`sales_messages?conversation_id=eq.${encodeURIComponent(message.conversation_id)}&app_id=eq.sales_copilot&direction=eq.outbound&select=id,conversation_id,body,sent_at,direction`);
  const exact = candidates.find(v => outbound.some(m => [v.edited_final_text, v.message].filter((value): value is string => Boolean(value)).some(text => normalize(m.body) === normalize(text)) && new Date(m.sent_at).getTime() <= new Date(message.sent_at).getTime()));
  if (exact) return { variantId: exact.id, confidence: "high" as const, method: "exact_outbound_text" };
  return { variantId: candidates[0].id, confidence: candidates.length === 1 ? "medium" as const : "low" as const, method: candidates.length === 1 ? "single_recent_sent_variant" : "ambiguous_recent_sent_variants" };
}

export async function processInboundReply(message: Message) {
  if (message.direction !== "inbound") return { skipped: true };
  const decision = await decideReply({ message: message.body, messageId: message.id });
  const link = await findLink(message);
  await supabaseRequest(`sales_messages?id=eq.${encodeURIComponent(message.id)}&app_id=eq.sales_copilot`, { method: "PATCH", body: JSON.stringify({ linked_variant_id: link.variantId, learning_link_confidence: link.confidence, learning_link_method: link.method }) });
  if (!link.variantId) return { decision, link, suggestion: null, replyOutcome: null };
  let replyOutcome: unknown = null;
  if (link.confidence === "high" || link.confidence === "medium") replyOutcome = (await recordOutcome(link.variantId, "reply_received", "instagram_sync", { message_id: message.id, confidence: link.confidence, method: link.method }, `reply_received:${message.id}`)).outcome;
  const classified = await classifyReply(message.body);
  const existing = await supabaseRequest<OutcomeSuggestion[]>(`sales_ai_outcome_suggestions?message_id=eq.${encodeURIComponent(message.id)}&app_id=eq.sales_copilot&select=*`);
  if (existing[0]) return { decision, link, suggestion: existing[0], replyOutcome };
  const created = await supabaseRequest<OutcomeSuggestion[]>("sales_ai_outcome_suggestions", { method: "POST", body: JSON.stringify({ app_id: "sales_copilot", message_id: message.id, variant_id: link.variantId, suggested_outcomes: classified.suggestions, overall_confidence: classified.overallConfidence }) });
  return { decision, link, suggestion: created[0] || null, replyOutcome };
}

export async function listOutcomeSuggestions(leadId?: string) {
  let variantIds: string[] | undefined;
  if (leadId) {
    const experiments = await supabaseRequest<Experiment[]>(`sales_ai_experiments?lead_id=eq.${encodeURIComponent(leadId)}&app_id=eq.sales_copilot&select=id`);
    if (!experiments.length) return [];
    const variants = await supabaseRequest<{ id: string }[]>(`sales_ai_message_variants?experiment_id=in.(${encodeURIComponent(experiments.map(e => e.id).join(","))})&app_id=eq.sales_copilot&select=id`);
    variantIds = variants.map(v => v.id); if (!variantIds.length) return [];
  }
  const path = variantIds ? `sales_ai_outcome_suggestions?variant_id=in.(${encodeURIComponent(variantIds.join(","))})&app_id=eq.sales_copilot&status=eq.pending&select=*&order=created_at.desc` : `sales_ai_outcome_suggestions?app_id=eq.sales_copilot&status=eq.pending&select=*&order=created_at.desc`;
  return supabaseRequest<OutcomeSuggestion[]>(path);
}

export async function reviewOutcomeSuggestion(id: string, status: "confirmed" | "rejected" | "modified", outcomes?: SuggestionInput[]) {
  const suggestions = await supabaseRequest<OutcomeSuggestion[]>(`sales_ai_outcome_suggestions?id=eq.${encodeURIComponent(id)}&app_id=eq.sales_copilot&select=*`);
  const suggestion = suggestions[0]; if (!suggestion) throw new Error("Outcome suggestion not found.");
  if (suggestion.status !== "pending") return suggestion;
  if ((status === "confirmed" || status === "modified") && !suggestion.variant_id) throw new Error("This suggestion has no safely linked variant.");
  if (status === "confirmed" || status === "modified") {
    const selected = outcomes?.length ? outcomes : suggestion.suggested_outcomes;
    for (const item of selected) if (semanticOutcomes.includes(item.outcome)) await recordOutcome(suggestion.variant_id!, item.outcome, status === "modified" ? "manual_modified" : "ai_confirmed", { suggestion_id: id, message_id: suggestion.message_id, reason: item.reason }, `suggestion:${id}:${item.outcome}`);
  }
  const updated = await supabaseRequest<OutcomeSuggestion[]>(`sales_ai_outcome_suggestions?id=eq.${encodeURIComponent(id)}&app_id=eq.sales_copilot`, { method: "PATCH", body: JSON.stringify({ status, reviewed_at: new Date().toISOString() }) });
  return updated[0] || { ...suggestion, status };
}
