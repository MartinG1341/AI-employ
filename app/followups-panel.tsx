"use client";
import { useEffect, useState } from "react";

type Followup = { id: string; lead_id: string; due_at: string; previous_message: string | null; lead?: { business_name: string | null; instagram_username: string; status: string; last_contacted_at: string | null } };
const date = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : "—";
async function json(response: Response): Promise<unknown> { const data = await response.json() as Record<string, unknown>; if (!response.ok) throw new Error(String(data.error || "Request failed.")); return data; }
function localDay(value: string) { const day = new Date(value); return new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime(); }

export default function FollowupsPanel({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const [rows, setRows] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [dates, setDates] = useState<Record<string, string>>({});
  async function load() { setLoading(true); setError(""); try { setRows(await json(await fetch("/api/followups", { cache: "no-store" })) as Followup[]); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load follow-ups."); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function action(id: string, kind: string, dueAt?: string) {
    setBusy(id); setError("");
    try { await json(await fetch(`/api/followups/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: kind, dueAt }) })); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to update follow-up."); }
    finally { setBusy(""); }
  }
  function snooze(row: Followup, days: number) { const next = new Date(Math.max(Date.now(), new Date(row.due_at).getTime())); next.setDate(next.getDate() + days); void action(row.id, "snooze", next.toISOString()); }
  async function copyOpen(row: Followup) {
    const tab = window.open("about:blank", "_blank"); if (tab) tab.opener = null;
    try { if (row.previous_message) await navigator.clipboard.writeText(row.previous_message); tab?.location.replace(`https://instagram.com/${encodeURIComponent(row.lead?.instagram_username || "")}`); }
    catch { tab?.close(); setError("Could not copy the previous message. Check clipboard permissions."); }
  }
  const today = localDay(new Date().toISOString());
  const groups = [
    { title: "OVERDUE", items: rows.filter(row => localDay(row.due_at) < today) },
    { title: "TODAY", items: rows.filter(row => localDay(row.due_at) === today) },
    { title: "UPCOMING", items: rows.filter(row => localDay(row.due_at) > today) },
  ];
  return <div className="content followups-page">
    <div className="section-heading"><div><h2>Follow-ups</h2><p>Your scheduled next steps, saved in Supabase.</p></div><button className="secondary" onClick={() => void load()} disabled={loading || !!busy}>Refresh</button></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {loading ? <p>Loading follow-ups…</p> : rows.length === 0 ? <div className="empty-page"><h2>No open follow-ups</h2><p>Schedule one from a lead detail panel.</p></div> : groups.map(group => <section className="followup-section" key={group.title}><h3>{group.title} <span>{group.items.length}</span></h3>{group.items.length === 0 ? <p className="muted">None</p> : group.items.map(row => <article className="followup-card" key={row.id}>
      <div><h4>{row.lead?.business_name || row.lead?.instagram_username || "Lead"}</h4><p>@{row.lead?.instagram_username || "unknown"} · {row.lead?.status || "—"}</p><p>Last contacted: {date(row.lead?.last_contacted_at)} · Due: {date(row.due_at)}</p>{row.previous_message && <p className="followup-message">Previous message: {row.previous_message}</p>}</div>
      <div className="followup-actions"><button className="secondary" disabled={!!busy} onClick={() => onOpenLead(row.lead_id)}>Open Lead</button><button className="secondary" disabled={!!busy || !row.lead?.instagram_username} onClick={() => void copyOpen(row)}>Copy & Open Instagram</button><button className="primary" disabled={!!busy} onClick={() => void action(row.id, "complete")}>{busy === row.id ? "Saving…" : "Mark Complete"}</button><button className="secondary" disabled={!!busy} onClick={() => snooze(row, 1)}>Snooze 1 day</button><button className="secondary" disabled={!!busy} onClick={() => snooze(row, 3)}>Snooze 3 days</button><label>Pick another date<input type="datetime-local" value={dates[row.id] || ""} onChange={e => setDates({ ...dates, [row.id]: e.target.value })}/></label><button className="secondary" disabled={!!busy || !dates[row.id]} onClick={() => void action(row.id, "snooze", new Date(dates[row.id]).toISOString())}>Save date</button></div>
    </article>)}</section>)}
  </div>;
}
