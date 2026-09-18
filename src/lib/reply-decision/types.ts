export const REPLY_DECISION_MODES = ["AUTO_SAFE", "SUGGEST_ONLY", "HUMAN_REQUIRED"] as const;
export type ReplyDecisionMode = (typeof REPLY_DECISION_MODES)[number];
export type ReplyDecision = { mode: ReplyDecisionMode; intent: string; confidence: number; reason: string; missingInformation: string[]; riskFlags: string[]; autoSafeEligible: boolean };
export type ReplyDecisionInput = { message: string; leadCategory?: string | null; conversationContext?: string[]; confirmedOutcomes?: string[]; salesStage?: string | null; messageId?: string; leadId?: string };
