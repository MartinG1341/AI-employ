import { addLeadActivity, getLead, updateLead } from "@/src/lib/leads/service";
import { supabaseRequest } from "@/src/lib/supabase/server";

export type Followup = {
  id: string; lead_id: string; due_at: string; status: string;
  previous_message: string | null; completed_at: string | null;
  lead?: { id: string; business_name: string | null; instagram_username: string; status: string; last_contacted_at: string | null };
};

const scope = "app_id=eq.sales_copilot";
export function asUtc(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || !Number.isFinite(Date.parse(value))) throw new Error("A valid follow-up date and time is required.");
  return new Date(value).toISOString();
}
async function requireLead(id: string) {
  const lead = await getLead(id);
  if (!lead) throw new Error("Lead not found.");
  return lead;
}
async function syncNext(leadId: string) {
  const rows = await supabaseRequest<Followup[]>(`sales_followups?select=due_at&${scope}&lead_id=eq.${encodeURIComponent(leadId)}&status=eq.open&order=due_at.asc&limit=1`);
  await updateLead(leadId, { next_followup_at: rows[0]?.due_at ?? null });
}
export async function getFollowups() {
  const [rows, leads] = await Promise.all([
    supabaseRequest<Followup[]>(`sales_followups?select=*&${scope}&status=eq.open&order=due_at.asc`),
    supabaseRequest<NonNullable<Followup["lead"]>[]>(`sales_leads?select=id,business_name,instagram_username,status,last_contacted_at&${scope}`),
  ]);
  const byId = new Map(leads.map(lead => [lead.id, lead]));
  return rows.map(row => ({ ...row, lead: byId.get(row.lead_id) }));
}
export async function getFollowup(id: string) {
  const rows = await supabaseRequest<Followup[]>(`sales_followups?select=*&${scope}&id=eq.${encodeURIComponent(id)}`);
  return rows[0] ?? null;
}
export async function createFollowup(leadId: string, dueAt: string, previousMessage?: string) {
  await requireLead(leadId);
  const rows = await supabaseRequest<Followup[]>("sales_followups", { method: "POST", body: JSON.stringify({ app_id: "sales_copilot", lead_id: leadId, due_at: asUtc(dueAt), previous_message: previousMessage || null }) });
  const row = rows[0];
  if (!row) throw new Error("Follow-up creation returned no row.");
  await syncNext(leadId);
  await addLeadActivity(leadId, "followup_scheduled", "Follow-up scheduled", { followup_id: row.id, due_at: row.due_at });
  return row;
}
export async function updateFollowup(id: string, input: { dueAt?: string; status?: "cancelled" }) {
  const current = await getFollowup(id);
  if (!current) throw new Error("Follow-up not found.");
  if (current.status !== "open") throw new Error("Only open follow-ups can be changed.");
  const patch = input.status === "cancelled" ? { status: "cancelled" } : { due_at: asUtc(input.dueAt) };
  const rows = await supabaseRequest<Followup[]>(`sales_followups?${scope}&id=eq.${encodeURIComponent(id)}&status=eq.open`, { method: "PATCH", body: JSON.stringify(patch) });
  if (!rows[0]) throw new Error("Follow-up changed concurrently. Refresh and try again.");
  await syncNext(current.lead_id);
  await addLeadActivity(current.lead_id, input.status === "cancelled" ? "followup_cancelled" : "followup_rescheduled", input.status === "cancelled" ? "Follow-up cancelled" : "Follow-up rescheduled", { followup_id: id, ...(rows[0].due_at ? { due_at: rows[0].due_at } : {}) });
  return rows[0];
}
export async function snoozeFollowup(id: string, dueAt: string) { return updateFollowup(id, { dueAt }); }
export async function completeFollowup(id: string) {
  const current = await getFollowup(id);
  if (!current) throw new Error("Follow-up not found.");
  if (current.status !== "open") throw new Error("Follow-up is already closed.");
  const rows = await supabaseRequest<Followup[]>(`sales_followups?${scope}&id=eq.${encodeURIComponent(id)}&status=eq.open`, { method: "PATCH", body: JSON.stringify({ status: "completed", completed_at: new Date().toISOString() }) });
  if (!rows[0]) throw new Error("Follow-up changed concurrently. Refresh and try again.");
  await syncNext(current.lead_id);
  await addLeadActivity(current.lead_id, "followup_completed", "Follow-up completed", { followup_id: id });
  return rows[0];
}
export async function markLeadContacted(leadId: string, message: string, dueAt?: string) {
  await requireLead(leadId);
  const lead = await updateLead(leadId, { status: "Contacted", last_contacted_at: new Date().toISOString() });
  if (!lead) throw new Error("Lead could not be updated.");
  await addLeadActivity(leadId, "message_sent", message || "Marked as contacted");
  const followup = dueAt ? await createFollowup(leadId, dueAt, message) : null;
  return { lead: followup ? await getLead(leadId) : lead, followup };
}
