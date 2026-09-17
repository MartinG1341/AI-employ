import type { Candidate } from "@/src/lib/lead-finder/service";

type RawCandidate = { businessName?: string; platform?: string; username?: string; profileUrl?: string; website?: string; location?: string; category?: string; shortDescription?: string; whyRelevant?: string; publicContactMethod?: string; sourceUrls?: unknown; confidence?: unknown };
type FinderResult = { assistantMessage: string; candidates: RawCandidate[] };
type ResponsesBody = { output_text?: string; output?: unknown[]; error?: { message?: string } | string };
const schema = { type: "object", additionalProperties: false, required: ["assistantMessage", "candidates"], properties: { assistantMessage: { type: "string" }, candidates: { type: "array", items: { type: "object", additionalProperties: false, required: ["businessName", "platform", "username", "profileUrl", "website", "location", "category", "shortDescription", "whyRelevant", "publicContactMethod", "sourceUrls", "confidence"], properties: { businessName: { type: "string" }, platform: { type: "string" }, username: { type: "string" }, profileUrl: { type: "string" }, website: { type: "string" }, location: { type: "string" }, category: { type: "string" }, shortDescription: { type: "string" }, whyRelevant: { type: "string" }, publicContactMethod: { type: "string" }, sourceUrls: { type: "array", items: { type: "string" } }, confidence: { type: "number" } } } } } };
function extractFinalText(body: ResponsesBody): string {
  if (typeof body.output_text === "string" && body.output_text.trim()) return body.output_text.trim();
  const parts: string[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(visit);
    const item = value as Record<string, unknown>;
    if (item.type === "message") visit(item.content);
    else if (item.type === "output_text" || item.type === "text") { if (typeof item.text === "string") parts.push(item.text); }
    else if (Array.isArray(item.content)) visit(item.content);
  };
  visit(body.output); return parts.join("\n").trim();
}
function validUrl(value: unknown): value is string { return typeof value === "string" && /^https?:\/\/[^\s]+$/i.test(value); }
function validCandidates(value: unknown): Array<Omit<Candidate, "id">> {
  const list = value && typeof value === "object" && Array.isArray((value as FinderResult).candidates) ? (value as FinderResult).candidates : [];
  return list.filter(candidate => candidate && typeof candidate.businessName === "string").map(candidate => ({ business_name: (candidate.businessName || "").trim(), platform: candidate.platform || null, username: candidate.username || null, profile_url: candidate.profileUrl || null, website: candidate.website || null, location: candidate.location || null, category: candidate.category || null, short_description: candidate.shortDescription || null, why_relevant: candidate.whyRelevant || null, public_contact_method: candidate.publicContactMethod || null, source_urls: Array.isArray(candidate.sourceUrls) ? candidate.sourceUrls.filter(validUrl) : [], confidence: typeof candidate.confidence === "number" && Number.isFinite(candidate.confidence) ? Math.max(0, Math.min(1, candidate.confidence)) : 0 })).filter(candidate => candidate.business_name && candidate.source_urls.length > 0);
}
export async function searchWeb(query: string, history: Array<{ role: "user" | "assistant"; content: string }>): Promise<{ answer: string; candidates: Array<Omit<Candidate, "id">> }> {
  const key = process.env.OPENAI_API_KEY?.trim(); if (!key) throw new Error("Lead Finder requires OPENAI_API_KEY.");
  const input = [{ role: "system", content: [{ type: "input_text", text: "You are Sales Copilot Lead Finder. Use public web search only. Return exactly the requested JSON schema. Every candidate must have at least one real public source URL. Never invent usernames, profiles, facts, counts, revenue, or contact volume. Use empty strings for unverified fields. Keep the assistantMessage concise." }] }, ...history.slice(-10).map(message => ({ role: message.role, content: [{ type: "input_text", text: message.content }] })), { role: "user", content: [{ type: "input_text", text: query }] }];
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: process.env.OPENAI_LEAD_FINDER_MODEL?.trim() || "gpt-5-mini", tools: [{ type: "web_search" }], input, max_output_tokens: 3000, text: { format: { type: "json_schema", name: "lead_finder_results", strict: true, schema } } }), cache: "no-store" });
  const body = await response.json().catch(() => null) as ResponsesBody | null; if (!response.ok) { const error = body?.error; throw new Error(`Lead Finder provider ${response.status}: ${typeof error === "string" ? error : error?.message || "request failed"}`); }
  const raw = extractFinalText(body || {}); if (!raw) throw new Error("Lead Finder returned no final structured text. Try a narrower search.");
  let parsed: Partial<FinderResult>; try { parsed = JSON.parse(raw) as Partial<FinderResult>; } catch { throw new Error("Lead Finder returned malformed structured JSON. Try a narrower search."); }
  if (typeof parsed.assistantMessage !== "string" || !Array.isArray(parsed.candidates)) throw new Error("Lead Finder returned an incomplete structured response. Try again.");
  const candidates = validCandidates(parsed); if (!candidates.length) throw new Error("Lead Finder found no grounded candidates with valid public source URLs. Try a narrower search.");
  return { answer: parsed.assistantMessage, candidates };
}
