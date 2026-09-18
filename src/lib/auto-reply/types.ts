export type AutoReplySettings = { auto_reply_enabled: boolean; auto_reply_dry_run: boolean; auto_reply_min_confidence: number; allowed_auto_safe_intents: string[] };
export type AutoReplyResult = { eligible: boolean; reason: string; failedGates: string[]; decision?: { mode: string; intent: string; confidence: number; riskFlags: string[] }; generatedText?: string; logId?: string };
