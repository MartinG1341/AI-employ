"use client";
import { useEffect, useState } from "react";

type Connection = { connected: boolean; instagram_user_id?: string; username?: string; profile?: Record<string, unknown>; scopes?: string[]; token_expires_at?: string | null; last_error?: string | null };
type Conversation = { id: string; participants?: { data?: { id: string; username?: string }[] } };
type Message = { id: string; message?: string; from?: { id: string; username?: string }; created_time?: string };

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
  const [messages, setMessages] = useState<Message[]>([]);

  async function load() {
    const auth = await fetch("/api/instagram/auth").then(r => r.json()) as { authenticated?: boolean; error?: string };
    setAuthenticated(Boolean(auth.authenticated));
    if (!auth.authenticated) { setError(auth.error || ""); return; }
    const response = await fetch("/api/instagram/connection");
    const data = await response.json() as Connection & { error?: string };
    if (!response.ok) throw new Error(data.error || "Unable to load Instagram connection.");
    setConnection(data);
    if (data.connected) await loadInbox();
  }
  async function loadInbox(conversationId?: string) {
    const url = conversationId ? `/api/instagram/inbox?conversation_id=${encodeURIComponent(conversationId)}` : "/api/instagram/inbox";
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json() as { error?: string; conversations?: Conversation[]; messages?: Message[] };
    if (!response.ok) throw new Error(data.error || "Unable to load Instagram inbox.");
    if (data.conversations) setConversations(data.conversations);
    if (data.messages) setMessages(data.messages);
  }
  async function sendReply() {
    if (!confirm("Send this reply through Instagram? This action cannot be undone.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/instagram/inbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversation_id: selectedId, message: reply, approved: true }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Instagram could not send the reply.");
      setReply(""); await loadInbox(selectedId);
    } catch (e) { setError(e instanceof Error ? e.message : "Instagram could not send the reply."); } finally { setBusy(false); }
  }
  useEffect(() => { void Promise.resolve().then(() => { setCallbackError(new URLSearchParams(window.location.search).get("instagram_error") || ""); return load(); }).catch(e => setError(e.message)); }, []); // Initial browser-only session check.

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
      {connection?.connected && <div className="focus-card" style={{ marginTop: 16 }}><div className="focus-top"><span className="label-chip">INBOX</span><button className="secondary" onClick={() => run("sync", {}).then(() => loadInbox(selectedId || undefined))} disabled={busy}>Sync now</button></div><h3>Instagram conversations</h3><p>Only reply to people who have contacted this account. Replies require confirmation and must be inside Meta’s messaging window.</p>
        <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setMessages([]); if (e.target.value) void loadInbox(e.target.value).catch(error => setError(error.message)); }} className="ig-input" aria-label="Conversation"><option value="">Select a conversation</option>{conversations.map(c => { const other = c.participants?.data?.find(p => p.id !== connection.instagram_user_id); return <option key={c.id} value={c.id}>{other?.username ? `@${other.username}` : c.id}</option>; })}</select>
        {selectedId && <><div className="ig-result" aria-live="polite">{messages.length ? [...messages].reverse().map(message => <div key={message.id} style={{ marginBottom: 12 }}><b>{message.from?.username ? `@${message.from.username}` : "Instagram"}</b><div>{message.message || "[Non-text message]"}</div><small>{message.created_time ? new Date(message.created_time).toLocaleString() : ""}</small></div>) : "No messages returned."}</div><textarea className="ig-input" value={reply} onChange={e => setReply(e.target.value)} maxLength={1000} placeholder="Write a manual reply" aria-label="Manual Instagram reply"/><button className="primary" onClick={sendReply} disabled={!reply.trim() || busy}>{busy ? "Working…" : "Review & send reply"}</button></>}
      </div>}
      {connection?.connected && <div className="focus-card" style={{ marginTop: 16 }}><div className="focus-top"><span className="label-chip">DIAGNOSTICS</span></div><h3>Test Meta access</h3><div className="ig-actions"><button className="secondary" onClick={() => run("account")} disabled={busy}>Test account</button><button className="secondary" onClick={() => run("permissions")} disabled={busy}>Test permissions</button><button className="secondary" onClick={() => run("conversations")} disabled={busy}>Test conversations</button><button className="secondary" onClick={() => run("sync", {})} disabled={busy}>Sync conversations</button></div>
        {diagnostic !== null && <pre className="ig-result">{JSON.stringify(diagnostic, null, 2)}</pre>}
      </div>}</>}
  </div>;
}
