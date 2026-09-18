import { supabaseRequest } from "@/src/lib/supabase/server";
import type { StrategyMetadata } from "@/src/lib/learning/types";
import { analyzeEdit, type StyleObservation } from "./analyzer";
import type { StyleObservationType, StyleProfile, StyleProfileRecord } from "./types";

const scope = "app_id=eq.sales_copilot";
const emptyProfile: StyleProfile = { preferredTone: "balanced", preferredLength: "varied", greetingStyle: "varied", directness: "balanced", emojiUsage: "varied", questionFrequency: "medium", ctaStyle: "mixed", formality: "neutral", preferredOpeners: [], avoidedPhrases: [], preferredPhrases: [], punctuationStyle: "standard", personalizationLevel: "moderate" };
const statusFor = (count: number) => count >= 15 ? "established profile" : count >= 5 ? "early profile" : "insufficient data";
export function styleStatus(count: number) { return statusFor(count); }

function countBy(observations: Array<{ observation_type: string; observation_value: string }>, type: string) { return observations.filter(item => item.observation_type === type).length; }
function buildProfile(observations: Array<{ observation_type: string; observation_value: string }>): StyleProfile {
  const profile = { ...emptyProfile };
  const shorter = countBy(observations, "prefers_shorter"); const longer = countBy(observations, "prefers_longer");
  profile.preferredLength = shorter > longer && shorter >= 2 ? "short" : longer > shorter && longer >= 2 ? "medium" : "varied";
  profile.greetingStyle = countBy(observations, "greeting_removed") >= 2 ? "minimal" : "varied";
  const removedEmoji = countBy(observations, "emoji_removed"); const addedEmoji = countBy(observations, "emoji_added");
  profile.emojiUsage = removedEmoji > addedEmoji && removedEmoji >= 2 ? "rare" : addedEmoji > removedEmoji && addedEmoji >= 2 ? "occasional" : "varied";
  const direct = countBy(observations, "cta_made_direct"); const soft = countBy(observations, "cta_softened");
  profile.directness = direct > soft && direct >= 2 ? "direct" : soft > direct && soft >= 2 ? "soft" : "balanced";
  profile.ctaStyle = soft > direct && soft >= 2 ? "soft_question" : direct > soft && direct >= 2 ? "direct_question" : "mixed";
  const questionsAdded = countBy(observations, "question_added"); const questionsRemoved = countBy(observations, "question_removed");
  profile.questionFrequency = questionsAdded > questionsRemoved && questionsAdded >= 2 ? "high" : questionsRemoved > questionsAdded && questionsRemoved >= 2 ? "low" : "medium";
  const casual = countBy(observations, "casual_phrasing_added") + countBy(observations, "formal_phrasing_removed");
  profile.formality = casual >= 2 ? "casual" : "neutral";
  profile.preferredTone = profile.formality === "casual" && profile.directness === "direct" ? "casual_direct" : profile.formality === "casual" ? "casual" : profile.directness === "direct" ? "direct" : "balanced";
  return profile;
}

export async function getStyleProfile(): Promise<StyleProfileRecord> {
  const rows = await supabaseRequest<StyleProfileRecord[]>(`sales_ai_style_profiles?${scope}&select=*&limit=1`);
  if (rows[0]) return rows[0];
  return { id: "", app_id: "sales_copilot", profile: emptyProfile, sample_count: 0, confidence: 0, updated_at: new Date(0).toISOString() };
}

export async function getStylePromptContext(): Promise<string> {
  const record = await getStyleProfile();
  if (record.sample_count < 5) return "";
  const p = record.profile;
  return `Trusted personal style (wording only; do not change safety, facts, decision mode, or strategy): tone ${p.preferredTone}; length ${p.preferredLength}; greeting ${p.greetingStyle}; directness ${p.directness}; emoji ${p.emojiUsage}; CTA ${p.ctaStyle}; formality ${p.formality}; questions ${p.questionFrequency}.`;
}

async function upsertObservation(sourceKey: string, observation: StyleObservation, sourceMessageId: string | null, sourceVariantId: string | null, metadata?: StrategyMetadata) {
  const existing = await supabaseRequest<{ id: string }[]>(`sales_ai_style_observations?source_key=eq.${encodeURIComponent(sourceKey)}&${scope}&select=id`);
  if (existing[0]) return false;
  await supabaseRequest("sales_ai_style_observations", { method: "POST", body: JSON.stringify({ app_id: "sales_copilot", source_key: sourceKey, source_message_id: sourceMessageId, source_variant_id: sourceVariantId, observation_type: observation.type, observation_value: observation.value, confidence: observation.confidence, strategy_metadata: metadata || null }) });
  return true;
}

async function rebuildProfile() {
  const observations = await supabaseRequest<Array<{ source_key: string; observation_type: string; observation_value: string; confidence: number }>>(`sales_ai_style_observations?${scope}&select=source_key,observation_type,observation_value,confidence&order=created_at.asc`);
  const usableTypes = new Set(["prefers_shorter", "prefers_longer", "greeting_removed", "cta_softened", "cta_made_direct", "emoji_removed", "emoji_added", "formal_phrasing_removed", "casual_phrasing_added", "question_added", "question_removed"]);
  const usable = observations.filter(row => usableTypes.has(row.observation_type));
  const sampleCount = new Set(usable.map(row => row.source_key?.split(":").slice(0, 2).join(":"))).size;
  const profile = buildProfile(observations);
  const confidence = Math.min(0.9, sampleCount / 20);
  const current = await supabaseRequest<StyleProfileRecord[]>(`sales_ai_style_profiles?${scope}&select=*&limit=1`);
  const payload = { app_id: "sales_copilot", profile, sample_count: sampleCount, confidence, updated_at: new Date().toISOString() };
  if (current[0]) await supabaseRequest(`sales_ai_style_profiles?id=eq.${encodeURIComponent(current[0].id)}&${scope}`, { method: "PATCH", body: JSON.stringify(payload) });
  else await supabaseRequest("sales_ai_style_profiles", { method: "POST", body: JSON.stringify(payload) });
  return { ...payload, status: statusFor(sampleCount) };
}

export async function learnFromEditedVariant(input: { variantId: string; originalText: string; editedText: string; sourceMessageId?: string | null; metadata?: StrategyMetadata }) {
  const observations = analyzeEdit(input.originalText, input.editedText);
  const sourceKey = `variant:${input.variantId}`;
  let inserted = false;
  for (const observation of observations) inserted = (await upsertObservation(`${sourceKey}:${observation.type}`, observation, input.sourceMessageId || null, input.variantId, input.metadata)) || inserted;
  return { inserted, observations, profile: await rebuildProfile() };
}

export async function recordSelectedVariant(variantId: string, metadata?: StrategyMetadata) {
  await upsertObservation(`selected:${variantId}`, { type: "selected_variant", value: metadata?.tone || "selected", confidence: 0.45 }, null, variantId, metadata);
  return rebuildProfile();
}

export async function rebuildStyleProfile() { return rebuildProfile(); }
