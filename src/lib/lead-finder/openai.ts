import type { Candidate } from "@/src/lib/lead-finder/service";

type RawCandidate = { businessName?: string; platform?: string; username?: string; profileUrl?: string; website?: string; location?: string; category?: string; shortDescription?: string; whyRelevant?: string; publicContactMethod?: string; sourceUrls?: unknown; confidence?: unknown };
type FinderResult = { assistantMessage: string; candidates: RawCandidate[] };
type ResponsesBody = { output_text?: string; output?: unknown[]; status?: string; incomplete_details?: { reason?: string }; error?: { message?: string } | string };
type InputTextMessage = { role: "system" | "user"; content: [{ type: "input_text"; text: string }] };
type AssistantTextMessage = { role: "assistant"; content: [{ type: "output_text"; text: string }] };
type ResponsesInputMessage = InputTextMessage | AssistantTextMessage;
type SearchOptions = { existingCandidates?: Candidate[] };
const schema = { type: "object", additionalProperties: false, required: ["assistantMessage", "candidates"], properties: { assistantMessage: { type: "string" }, candidates: { type: "array", items: { type: "object", additionalProperties: false, required: ["businessName", "platform", "username", "profileUrl", "website", "location", "category", "shortDescription", "whyRelevant", "publicContactMethod", "sourceUrls", "confidence"], properties: { businessName: { type: "string" }, platform: { type: "string" }, username: { type: "string" }, profileUrl: { type: "string" }, website: { type: "string" }, location: { type: "string" }, category: { type: "string" }, shortDescription: { type: "string" }, whyRelevant: { type: "string" }, publicContactMethod: { type: "string" }, sourceUrls: { type: "array", items: { type: "string" } }, confidence: { type: "number" } } } } } };
function extractFinalText(body: ResponsesBody): string {
  if (typeof body.output_text === "string" && body.output_text.trim()) return body.output_text.trim();
  const messages: string[][] = [];
  const visit = (value: unknown, messageParts?: string[]) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(item => visit(item, messageParts));
    const item = value as Record<string, unknown>;
    const type = typeof item.type === "string" ? item.type : "";
    if (type === "reasoning" || type.includes("tool") || type.includes("call")) return;
    if (type === "message") {
      const parts: string[] = [];
      visit(item.content, parts);
      if (parts.length) messages.push(parts);
      return;
    }
    if (type === "output_text" || type === "text") {
      if (typeof item.text === "string" && messageParts) messageParts.push(item.text);
      return;
    }
    if (Array.isArray(item.content)) visit(item.content, messageParts);
  };
  visit(body.output);
  return messages.length ? messages[messages.length - 1].join("\n").trim() : "";
}
function validUrl(value: unknown): value is string { return typeof value === "string" && /^https?:\/\/[^\s]+$/i.test(value); }
function normalized(value: string | null | undefined): string { return (value || "").trim().toLowerCase().replace(/^@/, ""); }
function normalizedUrl(value: string | null | undefined): string {
  const raw = (value || "").trim().toLowerCase(); if (!raw) return "";
  try { const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`; } catch { return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, ""); }
}
function candidateKeys(candidate: Pick<Candidate, "business_name" | "location" | "username" | "profile_url" | "website">): string[] {
  const keys: string[] = []; const profile = normalizedUrl(candidate.profile_url); const website = normalizedUrl(candidate.website); const username = normalized(candidate.username); const nameLocation = `${normalized(candidate.business_name)}|${normalized(candidate.location)}`;
  if (profile) keys.push(`profile:${profile}`); if (website) keys.push(`website:${website}`); if (username) keys.push(`username:${username}`); if (normalized(candidate.business_name) && normalized(candidate.location)) keys.push(`name:${nameLocation}`); return keys;
}
function isContinuation(query: string): boolean { return /\b(?:give|find|show)\s+(?:me\s+)?(?:\d+\s+)?more\b|\bmore\s+like\s+(?:these|those)\b|\banother\s+\d+\b|\bcontinue\b|\bdon['’]?t\s+repeat\b|\bwithout\s+repeating\b/i.test(query); }
function requestedCount(query: string): number { const match = query.match(/\b(?:give|find|show)\s+(?:me\s+)?(\d+)\s+more\b|\banother\s+(\d+)\b/i); return Number(match?.[1] || match?.[2] || 5); }
function exclusionText(candidates: Candidate[]): string {
  const seen = new Set<string>(); const lines: string[] = [];
  for (const candidate of candidates) { const keys = candidateKeys(candidate); const identity = keys[0]; if (!identity || seen.has(identity)) continue; seen.add(identity); const reference = normalizedUrl(candidate.profile_url) || normalizedUrl(candidate.website) || (candidate.username ? `@${candidate.username.replace(/^@/, "")}` : `${candidate.business_name} | ${candidate.location || ""}`); lines.push(`- ${candidate.business_name}${candidate.location ? ` | ${candidate.location}` : ""} | ${reference}`); if (lines.length >= 40) break; }
  return lines.join("\n");
}
function deduplicate(candidates: Array<Omit<Candidate, "id">>, existing: Candidate[]): Array<Omit<Candidate, "id">> {
  const seen = new Set(existing.flatMap(candidateKeys)); const fresh: Array<Omit<Candidate, "id">> = [];
  for (const candidate of candidates) { const keys = candidateKeys(candidate); if (!keys.length || keys.some(key => seen.has(key))) continue; keys.forEach(key => seen.add(key)); fresh.push(candidate); }
  return fresh;
}
function validCandidates(value: unknown): Array<Omit<Candidate, "id">> {
  const list = value && typeof value === "object" && Array.isArray((value as FinderResult).candidates) ? (value as FinderResult).candidates : [];
  return list.filter(candidate => candidate && typeof candidate.businessName === "string").map(candidate => ({ business_name: (candidate.businessName || "").trim(), platform: candidate.platform || null, username: candidate.username || null, profile_url: candidate.profileUrl || null, website: candidate.website || null, location: candidate.location || null, category: candidate.category || null, short_description: candidate.shortDescription || null, why_relevant: candidate.whyRelevant || null, public_contact_method: candidate.publicContactMethod || null, source_urls: Array.isArray(candidate.sourceUrls) ? candidate.sourceUrls.filter(validUrl) : [], confidence: typeof candidate.confidence === "number" && Number.isFinite(candidate.confidence) ? Math.max(0, Math.min(1, candidate.confidence)) : 0 })).filter(candidate => candidate.business_name && candidate.source_urls.length > 0);
}
export async function searchWeb(query: string, history: Array<{ role: "user" | "assistant"; content: string }>, options: SearchOptions = {}): Promise<{ answer: string; candidates: Array<Omit<Candidate, "id">> }> {
  const key = process.env.OPENAI_API_KEY?.trim(); if (!key) throw new Error("Lead Finder requires OPENAI_API_KEY.");
  const existing = options.existingCandidates || []; const continuation = isContinuation(query); const exclusions = continuation ? exclusionText(existing) : "";
  const systemText = "You are Sales Copilot Lead Finder. Use public web search only. Return exactly the requested JSON schema. Every candidate must have at least one real public source URL. Never invent usernames, profiles, facts, counts, revenue, or contact volume. Use empty strings for unverified fields. Keep assistantMessage concise and every candidate text field to one short sentence (12 words maximum). Return only the requested candidates, with no extra detail.";
  const continuationText = continuation ? `This is a continuation search. Preserve the niche, location, platform, and filters from the conversation. Find NEW businesses only. Vary discovery paths using different search phrases, local directories, business websites, and public social-profile pages. Do not pad results or invent candidates. Previously found businesses to exclude:\n${exclusions || "(none)"}` : "";
  const historyInput: ResponsesInputMessage[] = history.slice(-10).map(message => message.role === "assistant" ? { role: "assistant", content: [{ type: "output_text", text: message.content }] } : { role: "user", content: [{ type: "input_text", text: message.content }] });
  const baseInput: ResponsesInputMessage[] = [{ role: "system", content: [{ type: "input_text", text: systemText }] }, ...historyInput, ...(continuationText ? [{ role: "user", content: [{ type: "input_text", text: continuationText }] } as InputTextMessage] : []), { role: "user", content: [{ type: "input_text", text: query }] }];
  const request = async (retry: boolean) => {
    const retryText = retry ? (continuation ? "Broaden the discovery paths while preserving all original criteria and exclusions. Return only additional grounded businesses now." : "The public web search is complete. Return the final structured JSON object now. Do not return tool calls, reasoning, or prose outside the JSON object.") : "";
    const input: ResponsesInputMessage[] = retry ? [...baseInput, { role: "user", content: [{ type: "input_text", text: retryText }] }] : baseInput;
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: process.env.OPENAI_LEAD_FINDER_MODEL?.trim() || "gpt-5-mini", tools: [{ type: "web_search" }], input, reasoning: { effort: "low" }, max_output_tokens: 3000, text: { format: { type: "json_schema", name: "lead_finder_results", strict: true, schema } } }), cache: "no-store" });
    const body = await response.json().catch(() => null) as ResponsesBody | null;
    if (!response.ok) { const error = body?.error; throw new Error(`Lead Finder provider request failed (${response.status}): ${typeof error === "string" ? error : error?.message || "request failed"}`); }
    return body || {};
  };
  let body = await request(false);
  let raw = extractFinalText(body); let retried = false;
  if (!raw) { body = await request(true); raw = extractFinalText(body); retried = true; }
  if (!raw) {
    if (body.status === "incomplete") throw new Error(`Lead Finder response incomplete: ${body.incomplete_details?.reason || "the provider did not finish the response"}.`);
    throw new Error("Lead Finder web search completed but returned no final structured text. Try a narrower search.");
  }
  let parsed: Partial<FinderResult>; try { parsed = JSON.parse(raw) as Partial<FinderResult>; } catch { throw new Error("Lead Finder returned malformed structured JSON. Try a narrower search."); }
  if (typeof parsed.assistantMessage !== "string" || !Array.isArray(parsed.candidates)) throw new Error("Lead Finder returned an incomplete structured response. Try again.");
  let candidates = deduplicate(validCandidates(parsed), existing);
  if (continuation && !candidates.length && !retried) { body = await request(true); raw = extractFinalText(body); retried = true; if (raw) { try { parsed = JSON.parse(raw) as Partial<FinderResult>; } catch { parsed = {}; } candidates = deduplicate(validCandidates(parsed), existing); } }
  if (!candidates.length) throw new Error("Lead Finder found no new grounded candidates with valid public source URLs. Try a broader continuation search.");
  const requested = requestedCount(query); const answer = continuation && candidates.length < requested ? `Found ${candidates.length} additional verified businesses; I couldn't verify ${requested - candidates.length} more without repeating earlier results.` : (parsed.assistantMessage || `Found ${candidates.length} grounded businesses.`);
  return { answer, candidates };
}
