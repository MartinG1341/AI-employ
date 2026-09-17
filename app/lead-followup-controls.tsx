"use client";
import { useEffect, useState } from "react";

type Followup = { id: string; lead_id: string; due_at: string };
async function json(response: Response): Promise<unknown> { const data = await response.json() as Record<string, unknown>; if (!response.ok) throw new Error(String(data.error || "Request failed.")); return data; }
function inputValue(iso: string) { const d = new Date(iso); const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); }

export default function LeadFollowupControls({ leadId, message, onContacted, onChanged }: { leadId: string; message: string; onContacted: (dueAt?: string) => Promise<void>; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState<Followup | null>(null);
  const [when, setWhen] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() { setLoading(true); try { const rows = await json(await fetch("/api/followups", { cache: "no-store" })) as Followup[]; const row = rows.find(item => item.lead_id === leadId) || null; setOpen(row); setWhen(row ? inputValue(row.due_at) : ""); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load follow-up."); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [leadId]);
  async function run(work: () => Promise<void>) { setBusy(true); setError(""); try { await work(); await load(); await onChanged(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to update follow-up."); } finally { setBusy(false); } }
  const dueAt = when ? new Date(when).toISOString() : undefined;
  return <div className="lead-followup-controls"><button className="primary" disabled={busy || loading} onClick={() => void run(() => onContacted(open ? undefined : dueAt))}>{busy ? "Saving…" : "Mark as contacted"}</button><label>Next follow-up (optional when contacting)<input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} disabled={busy || loading}/></label><div className="followup-actions"><button className="secondary" disabled={busy || loading || !dueAt} onClick={() => void run(async () => { await json(await fetch(open ? `/api/followups/${open.id}` : "/api/followups", { method: open ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(open ? { action: "reschedule", dueAt } : { leadId, dueAt, previousMessage: message }) })); })}>{open ? "Change follow-up" : "Schedule follow-up"}</button>{open && <button className="secondary" disabled={busy || loading} onClick={() => void run(async () => { await json(await fetch(`/api/followups/${open.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) })); })}>Cancel follow-up</button>}</div>{open && <p>Scheduled: {new Date(open.due_at).toLocaleString()}</p>}{loading && <p>Loading follow-up…</p>}{error && <p className="form-error" role="alert">{error}</p>}</div>;
}
