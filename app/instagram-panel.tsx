"use client";
import { useEffect, useState } from "react";

type Connection = { connected: boolean; instagram_user_id?: string; username?: string; profile?: Record<string, unknown>; scopes?: string[]; token_expires_at?: string | null; last_error?: string | null };
type Conversation = { id: string; participants?: { data?: { id: string; username?: string }[] } };

export default function InstagramPanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [connection, setConnection] = useState<Connection | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [diagnostic, setDiagnostic] = useState<unknown>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const [callbackError, setCallbackError] = useState("");

  async function load() {
    const auth = await fetch("/api/instagram/auth").then(r => r.json()) as { authenticated?: boolean; error?: string };
    setAuthenticated(Boolean(auth.authenticated));
    if (!auth.authenticated) { setError(auth.error || ""); return; }
    const response = await fetch("/api/instagram/connection");
    const data = await response.json() as Connection & { error?: string };
    if (!response.ok) throw new Error(data.error || "Unable to load Instagram connection.");
    setConnection(data);
  }
  useEffect(() => { setCallbackError(new URLSearchParams(window.location.search).get("instagram_error") || ""); load().catch(e => setError(e.message)); }, []);

  async function unlock() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/instagram/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to unlock Instagram settings.");
      setPassword(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to unlock settings."); } finally { setBusy(false); }
  }
  async function run(action: string, payload?: Record<string, string>) {
    setBusy(true); setError(""); setDiagnostic(null);
    try {
      const query = new URLSearchParams({ action, ...(action === "messages" ? { conversation_id: selectedId } : {}) });
      const response = await fetch(`/api/instagram/diagnostics?${query}`, payload ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : undefined);
      const data = await response.json() as { error?: string; conversations?: Conversation[] };
      if (!response.ok) throw new Error(data.error || "Instagram test failed.");
      setDiagnostic(data);
      if (action === "conversations") setConversations(data.conversations || []);
      if (action === "reply") setReply("");
    } catch (e) { setError(e instanceof Error ? e.message : "Instagram test failed."); } finally { setBusy(false); }
  }
  async function disconnect() {
    if (!confirm("Disconnect this Instagram account from Sales Copilot?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/instagram/connection", { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to disconnect.");
      setConnection({ connected: false }); setConversations([]); setDiagnostic(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to disconnect."); } finally { setBusy(false); }
  }

  return <div className="content" style={{ maxWidth: 920 }}>
    <div className="section-heading"><div><h2>Instagram connection</h2><p>Connect your Professional account for supported conversation access.</p></div></div>
    {(callbackError || error) && <div className="form-error" role="alert">{callbackError || error}</div>}
    {!authenticated ? <div className="focus-card"><h3>Unlock Instagram settings</h3><p>Enter the private Sales Copilot admin password to manage this connection.</p><input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && unlock()} placeholder="Admin password" aria-label="Admin password" className="ig-input"/><button className="primary" onClick={unlock} disabled={busy}>Unlock</button></div> :
      <><div className="focus-card"><div className="focus-top"><span className="label-chip">ACCOUNT</span><span className="muted">{connection?.connected ? "Connected" : "Disconnected"}</span></div>
        {connection?.connected ? <><h3>@{connection.username}</h3><p>Instagram ID: {connection.instagram_user_id}</p><p>Account type: {String(connection.profile?.account_type || "Not returned")}</p><p>Granted scopes: {connection.scopes?.join(", ") || "Not returned; test permissions below"}</p><p>Token expires: {connection.token_expires_at ? new Date(connection.token_expires_at).toLocaleString() : "Not available"}</p>{connection.last_error && <div className="form-error">Last Meta error: {connection.last_error}</div>}<div className="ig-actions"><a className="primary" href="/api/instagram/connect">Reconnect</a><button className="secondary" onClick={disconnect} disabled={busy}>Disconnect</button></div></> : <div className="ig-actions"><a className="primary" href="/api/instagram/connect">Connect Instagram</a></div>}
      </div>
      {connection?.connected && <div className="focus-card" style={{ marginTop: 16 }}><div className="focus-top"><span className="label-chip">DIAGNOSTICS</span></div><h3>Test Meta access</h3><div className="ig-actions"><button className="secondary" onClick={() => run("account")} disabled={busy}>Test account</button><button className="secondary" onClick={() => run("permissions")} disabled={busy}>Test permissions</button><button className="secondary" onClick={() => run("conversations")} disabled={busy}>Test conversations</button><button className="secondary" onClick={() => run("sync", {})} disabled={busy}>Sync conversations</button></div>
        {conversations.length > 0 && <><select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="ig-input" aria-label="Conversation"><option value="">Select a conversation</option>{conversations.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}</select><button className="secondary" onClick={() => run("messages")} disabled={!selectedId || busy}>Test latest messages</button><textarea className="ig-input" value={reply} onChange={e => setReply(e.target.value)} placeholder="Manual reply for this existing conversation" aria-label="Manual reply"/><button className="primary" onClick={() => run("reply", { conversation_id: selectedId, message: reply })} disabled={!selectedId || !reply.trim() || busy}>Send approved reply</button></>}
        {diagnostic !== null && <pre className="ig-result">{JSON.stringify(diagnostic, null, 2)}</pre>}
      </div>}</>}
  </div>;
}
