import type { StyleObservationType } from "./types";

export type StyleObservation = { type: StyleObservationType; value: string; confidence: number };

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();
const hasGreeting = (value: string) => /^(hi|hello|hey|dear|здравей|здрасти)\b/i.test(value.trim());
const hasQuestion = (value: string) => /\?/.test(value);
const emojiCount = (value: string) => (value.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;

export function analyzeEdit(original: string, edited: string): StyleObservation[] {
  const source = normalize(original);
  const final = normalize(edited);
  const observations: StyleObservation[] = [];
  if (!source || !final || source === final) return observations;
  const lengthRatio = final.length / Math.max(source.length, 1);
  if (lengthRatio <= 0.8) observations.push({ type: "prefers_shorter", value: "shorter", confidence: 0.9 });
  if (lengthRatio >= 1.2) observations.push({ type: "prefers_longer", value: "expanded", confidence: 0.82 });
  if (hasGreeting(source) && !hasGreeting(final)) observations.push({ type: "greeting_removed", value: "minimal", confidence: 0.9 });
  if (emojiCount(source) > emojiCount(final)) observations.push({ type: "emoji_removed", value: "rare", confidence: 0.88 });
  if (emojiCount(final) > emojiCount(source)) observations.push({ type: "emoji_added", value: "occasional", confidence: 0.8 });
  if (!hasQuestion(source) && hasQuestion(final)) observations.push({ type: "question_added", value: "high", confidence: 0.78 });
  if (hasQuestion(source) && !hasQuestion(final)) observations.push({ type: "question_removed", value: "low", confidence: 0.78 });
  if (/would you be interested|i wanted to reach out|please let me know|dear /i.test(source) && !/would you be interested|i wanted to reach out|please let me know|dear /i.test(final)) observations.push({ type: "formal_phrasing_removed", value: "casual", confidence: 0.82 });
  if (/quick|на|ако ти е интересно|мога да ти покажа|искам да попитам/i.test(final) && !/quick|на|ако ти е интересно|мога да ти покажа|искам да попитам/i.test(source)) observations.push({ type: "casual_phrasing_added", value: "casual", confidence: 0.78 });
  if (/would you be interested|schedule a demo|book a demo/i.test(source) && /if you're interested|would it be useful|ако ти е интересно|мога да ти покажа/i.test(final)) observations.push({ type: "cta_softened", value: "soft_question", confidence: 0.84 });
  if (/може ли|можеш ли|can you|could you|what type|какво/i.test(final) && !/може ли|можеш ли|can you|could you|what type|какво/i.test(source)) observations.push({ type: "cta_made_direct", value: "direct_question", confidence: 0.76 });
  return observations;
}
