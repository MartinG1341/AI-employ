import { createLead, getLeads } from "@/src/lib/leads/service";
import { supabaseRequest } from "@/src/lib/supabase/server";

export type Candidate = { id: string; business_name: string; platform: string | null; username: string | null; profile_url: string | null; website: string | null; location: string | null; category: string | null; short_description: string | null; why_relevant: string | null; public_contact_method: string | null; source_urls: string[]; confidence: number | null };
export type SearchMessage = { role: "user" | "assistant"; content: string };
const scope = "app_id=eq.sales_copilot";
export async function createSession(query: string) { const rows = await supabaseRequest<{ id: string }[]>("sales_lead_search_sessions", { method: "POST", body: JSON.stringify({ app_id: "sales_copilot", query }) }); if (!rows[0]) throw new Error("Search session could not be created."); return rows[0].id; }
export async function getMessages(sessionId: string) { return supabaseRequest<SearchMessage[]>(`sales_lead_search_messages?select=role,content&${scope}&session_id=eq.${encodeURIComponent(sessionId)}&order=created_at.asc`); }
export async function saveMessage(sessionId: string, role: SearchMessage["role"], content: string) { await supabaseRequest("sales_lead_search_messages", { method: "POST", body: JSON.stringify({ app_id: "sales_copilot", session_id: sessionId, role, content }) }); }
export async function saveCandidates(sessionId: string, candidates: Omit<Candidate, "id">[]) { if (!candidates.length) return []; const rows = await supabaseRequest<Candidate[]>("sales_lead_candidates", { method: "POST", body: JSON.stringify(candidates.map(candidate => ({ ...candidate, app_id: "sales_copilot", session_id: sessionId }))) }); return rows; }
export async function getCandidates(sessionId: string) { return supabaseRequest<Candidate[]>(`sales_lead_candidates?select=*&${scope}&session_id=eq.${encodeURIComponent(sessionId)}&order=created_at.asc`); }
const normalize = (value: string | null | undefined) => (value || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").replace(/^@/, "").trim();
export async function addCandidate(candidateId: string) {
  const rows = await supabaseRequest<Candidate[]>(`sales_lead_candidates?select=*&${scope}&id=eq.${encodeURIComponent(candidateId)}`);
  const candidate = rows[0]; if (!candidate) throw new Error("Candidate not found.");
  if (!candidate.username) throw new Error("This candidate has no verified Instagram username and cannot be added to the current leads table.");
  const leads = await getLeads(); const username = normalize(candidate.username); const profile = normalize(candidate.profile_url); const website = normalize(candidate.website); const name = normalize(candidate.business_name); const location = normalize(candidate.location);
  const duplicate = leads.find(lead => username && normalize(String(lead.instagram_username)) === username || profile && normalize(String(lead.instagram_url)) === profile || website && normalize(String(lead.website)) === website || name && normalize(String(lead.business_name)) === name && location && normalize(String(lead.notes)).includes(location));
  if (duplicate) return { duplicate: true, lead: duplicate };
  const lead = await createLead({ business_name: candidate.business_name, instagram_username: candidate.username, instagram_url: candidate.profile_url || undefined, website: candidate.website || undefined, category: candidate.category || undefined, description: candidate.short_description || undefined, notes: [candidate.why_relevant, candidate.source_urls.length ? `Sources: ${candidate.source_urls.join(", ")}` : ""].filter(Boolean).join("\n") });
  return { duplicate: false, lead };
}
