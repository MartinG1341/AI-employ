export type StyleObservationType =
  | "prefers_shorter"
  | "prefers_longer"
  | "greeting_removed"
  | "cta_softened"
  | "cta_made_direct"
  | "emoji_removed"
  | "emoji_added"
  | "formal_phrasing_removed"
  | "casual_phrasing_added"
  | "question_added"
  | "question_removed"
  | "selected_variant";

export type StyleProfile = {
  preferredTone: "casual_direct" | "casual" | "direct" | "balanced";
  preferredLength: "short" | "medium" | "varied";
  greetingStyle: "minimal" | "friendly" | "none" | "varied";
  directness: "soft" | "direct" | "balanced";
  emojiUsage: "rare" | "occasional" | "none" | "varied";
  questionFrequency: "low" | "medium" | "high";
  ctaStyle: "soft_question" | "direct_question" | "mixed";
  formality: "casual" | "neutral" | "formal";
  preferredOpeners: string[];
  avoidedPhrases: string[];
  preferredPhrases: string[];
  punctuationStyle: "minimal" | "standard" | "expressive";
  personalizationLevel: "light" | "moderate" | "high";
};

export type StyleProfileRecord = {
  id: string;
  app_id: string;
  profile: StyleProfile;
  sample_count: number;
  confidence: number;
  updated_at: string;
};
