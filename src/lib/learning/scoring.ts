import type { OutcomeType } from "./types";

export const OUTCOME_WEIGHTS: Record<OutcomeType, number> = { no_reply: 0, reply_neutral: 1, reply_positive: 2, asks_more_info: 3, asks_price: 3, asks_demo: 4, meeting_booked: 5, converted: 8, reply_negative: -1, not_interested: -2, blocked: -5 };
export const MINIMUM_SAMPLE_SIZE = 10;
export function outcomeScore(type: OutcomeType) { return OUTCOME_WEIGHTS[type]; }
export function safeRate(numerator: number, denominator: number) { return denominator ? Number((numerator / denominator).toFixed(4)) : null; }
