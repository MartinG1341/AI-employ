import type { ReplyDecision } from "./types";

export const BUSINESS_RULES = Object.freeze({
  neverPromiseTimelines: true,
  neverPromiseUnverifiedIntegrations: true,
  neverConfirmDiscounts: true,
  neverNegotiatePricing: true,
  neverConfirmMeetingsAutonomously: true,
  neverHandleComplaintsAutonomously: true,
  neverInventFacts: true,
  autoReplyEnabled: false,
});

const humanRules: Array<[RegExp, string, string]> = [
  [/\b(legal|lawyer|contract|terms and conditions|agreement)\b/i, "legal_or_contract", "Legal or contractual content requires human review."],
  [/\b(refund|chargeback|payment dispute|dispute|fraud)\b/i, "payment_or_refund_dispute", "Payment, refund, or dispute content requires human review."],
  [/\b(complaint|complain|terrible|scam|report you|sue|threat|harass)\b/i, "complaint_or_threat", "Complaints, threats, or harassment require human review."],
  [/\b(discount|cheaper|negotiate|special price|40% off)\b/i, "commercial_negotiation", "Custom pricing or discounts require approval."],
  [/\b(partnership|collab|collaboration|influencer|sponsor)\b/i, "partnership_or_collaboration", "Partnership and collaboration proposals require human review."],
  [/\b(guarantee|guaranteed|increase my revenue|promise)\b/i, "guarantee_or_capability_promise", "Guarantees and unverified capability promises require human review."],
  [/\b(talk to a person|human|real person|agent)\b/i, "explicit_human_request", "The lead explicitly requested a human."],
  [/\b(schedule|book|appointment|meeting)\b/i, "real_commitment_scheduling", "Scheduling a real commitment requires approval."],
  [/\b(stop contacting|do not message|don't message|not interested|unsubscribe|remove me)\b/i, "stop_contact", "Stop-contact intent must not receive persuasive outreach."],
];

export function deterministicDecision(message: string): ReplyDecision | null {
  const text = message.trim();
  for (const [pattern, flag, reason] of humanRules) if (pattern.test(text)) return { mode: "HUMAN_REQUIRED", intent: flag === "stop_contact" ? "not_interested" : flag, confidence: 0.99, reason, missingInformation: [], riskFlags: [flag], autoSafeEligible: false };
  if (!text || text.length < 3 || /^(maybe|idk|not sure)\.?$/i.test(text)) return { mode: "HUMAN_REQUIRED", intent: "ambiguous", confidence: 0.35, reason: "The inbound message is too ambiguous for a safe reply.", missingInformation: ["clear customer intent"], riskFlags: ["low_confidence"], autoSafeEligible: false };
  if (/support instagram/i.test(text)) return { mode: "AUTO_SAFE", intent: "capability_faq", confidence: 0.96, reason: "Instagram support is a verified product capability; automatic sending is still disabled.", missingInformation: [], riskFlags: [], autoSafeEligible: true };
  if (/how much|price|cost|pricing|quote|how does it work|more details|more information|what exactly|what do you offer|can this work|support .*platform/i.test(text)) return { mode: "SUGGEST_ONLY", intent: /how much|price|cost|pricing|quote/i.test(text) ? "asks_price" : /demo/i.test(text) ? "asks_demo" : /more details|more information|what exactly|what do you offer/i.test(text) ? "asks_more_info" : "capability_faq", confidence: 0.96, reason: "Common sales question; reply requires user approval and verified business facts.", missingInformation: ["verified answer facts"], riskFlags: [], autoSafeEligible: false };
  if (/^(ok|okay|thanks|thank you|got it)([ ,.!]+(thanks|thank you))?[.! ]*$/i.test(text)) return { mode: "AUTO_SAFE", intent: "acknowledgement", confidence: 0.98, reason: "Simple acknowledgement with no new commitment.", missingInformation: [], riskFlags: [], autoSafeEligible: true };
  return null;
}
