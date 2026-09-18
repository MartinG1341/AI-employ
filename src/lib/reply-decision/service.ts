import { getAIProvider, getAIProviderName } from "@/src/lib/ai/provider";
import { supabaseRequest } from "@/src/lib/supabase/server";
import { deterministicDecision } from "./rules";
import type { ReplyDecision, ReplyDecisionInput } from "./types";

const schema = { type: "object", additionalProperties: false, required: ["mode", "intent", "confidence", "reason", "missingInformation", "riskFlags"], properties: { mode: { type: "string", enum: ["AUTO_SAFE", "SUGGEST_ONLY", "HUMAN_REQUIRED"] }, intent: { type: "string" }, confidence: { type: "number", minimum: 0, maximum: 1 }, reason: { type: "string", maxLength: 180 }, missingInformation: { type: "array", items: { type: "string" }, maxItems: 5 }, riskFlags: { type: "array", items: { type: "string" }, maxItems: 8 } } };
function parse(raw: string): ReplyDecision { const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) as Partial<ReplyDecision>; const mode = parsed.mode === "AUTO_SAFE" || parsed.mode === "SUGGEST_ONLY" || parsed.mode === "HUMAN_REQUIRED" ? parsed.mode : "HUMAN_REQUIRED"; const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0)); return { mode: confidence < 0.55 ? "HUMAN_REQUIRED" : mode, intent: typeof parsed.intent === "string" ? parsed.intent.slice(0, 80) : "unknown", confidence, reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 180) : "Human review is safest.", missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation.filter((x): x is string => typeof x === "string").slice(0, 5) : [], riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags.filter((x): x is string => typeof x === "string").slice(0, 8) : [], autoSafeEligible: mode === "AUTO_SAFE" && confidence >= 0.9 }; }
export async function decideReply(input: ReplyDecisionInput): Promise<ReplyDecision> {
  const deterministic = deterministicDecision(input.message); if (deterministic) return persistDecision(input, deterministic);
  let decision: ReplyDecision;
  if (getAIProviderName() === "Mock") decision = { mode: "SUGGEST_ONLY", intent: "general_question", confidence: 0.6, reason: "No high-risk rule matched; user approval is still required.", missingInformation: ["verified response facts"], riskFlags: [] , autoSafeEligible: false };
  else {
    try {
      const raw = await getAIProvider().generateText({ purpose: "reply_decision", maxTokens: 320, temperature: 0, responseFormat: { type: "json_schema", json_schema: { name: "sales_reply_decision", strict: true, schema } }, prompt: `Classify this inbound sales message conservatively. Apply HUMAN_REQUIRED for legal, payment, complaints, negotiation, promises, scheduling commitments, stop-contact, explicit human requests, missing facts, or low confidence. AUTO_SAFE is only for a simple acknowledgement or clearly verified low-risk fact. Message: ${JSON.stringify(input.message.slice(0, 1200))}\nLead category: ${JSON.stringify(input.leadCategory || null)}\nContext: ${JSON.stringify((input.conversationContext || []).slice(-4))}` });
      decision = parse(raw);
    } catch { decision = { mode: "HUMAN_REQUIRED", intent: "classification_failed", confidence: 0, reason: "The reply could not be classified safely.", missingInformation: ["reliable classification"], riskFlags: ["classification_failed"], autoSafeEligible: false }; }
  }
  if (decision.mode === "AUTO_SAFE") decision.autoSafeEligible = decision.confidence >= 0.9;
  return persistDecision(input, decision);
}
async function persistDecision(input: ReplyDecisionInput, decision: ReplyDecision) {
  if (input.messageId) await supabaseRequest(`sales_messages?id=eq.${encodeURIComponent(input.messageId)}&app_id=eq.sales_copilot`, { method: "PATCH", body: JSON.stringify({ reply_decision_mode: decision.mode, reply_decision_intent: decision.intent, reply_decision_confidence: decision.confidence, reply_decision_reason: decision.reason, reply_decision_missing_information: decision.missingInformation, reply_decision_risk_flags: decision.riskFlags }) });
  return decision;
}
