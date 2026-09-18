import { MINIMUM_SAMPLE_SIZE } from "./scoring";
import type { StrategyMetadata } from "./types";

export const EXPLOITATION_RATE = 0.8;
export const EXPLORATION_RATE = 1 - EXPLOITATION_RATE;
export const STRATEGY_DIMENSIONS = ["openerType", "ctaType", "tone", "niche", "platform"] as const;
type Performance = { sentCount: number; replyCount: number; score: number; replyRate: number | null; meaningful: boolean };
export function chooseRecommendation<T extends { strategy_metadata: StrategyMetadata }>(variants: T[], performance: Map<string, Performance>, random = Math.random) {
  if (!variants.length) return null;
  const meaningful = variants.filter(variant => performance.get(variant.strategy_metadata.openerType)?.meaningful);
  if (meaningful.length && random() >= EXPLORATION_RATE) return meaningful.sort((a, b) => (performance.get(b.strategy_metadata.openerType)?.replyRate ?? 0) - (performance.get(a.strategy_metadata.openerType)?.replyRate ?? 0))[0];
  return variants[Math.floor(random() * variants.length)];
}
