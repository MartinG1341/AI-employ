export type KnowledgeStatus = "VERIFIED" | "UNVERIFIED" | "DISABLED";
export type KnowledgeSource = "manual" | "settings" | "catalog" | "website" | "imported" | "system";
export type KnowledgeItem = { id: string; app_id: string; category: string; key: string; title: string; value: unknown; status: KnowledgeStatus; confidence: number; source: KnowledgeSource; notes: string | null; created_at: string; updated_at: string };
export type BusinessProfile = { id: string; app_id: string; business_name: string | null; business_description: string | null; offer_summary: string | null; primary_cta: string | null; default_language: string; default_currency: string | null; supported_platforms: unknown; general_rules: unknown; updated_at: string };
