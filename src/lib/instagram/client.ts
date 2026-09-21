import { instagramConfig } from "./oauth";

type MetaError = { error?: { message?: string; code?: number } };
const graph = `https://graph.instagram.com/${process.env.INSTAGRAM_GRAPH_API_VERSION ?? "v26.0"}`;
const apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION ?? "v26.0";
const safeDiagnosticMessage = (message?: string) => message
  ?.replace(/(access_token|client_secret|code)=([^&\s]+)/gi, "$1=[redacted]")
  .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
  .slice(0, 500) ?? null;

async function metaFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const raw = await response.text();
  let data: T & MetaError;
  try { data = JSON.parse(raw); } catch { throw new Error(`Meta API ${response.status}: invalid response`); }
  if (!response.ok || data.error) throw new Error(`Meta API ${response.status}: ${data.error?.message || "request failed"}${data.error?.code ? ` (code ${data.error.code})` : ""}`);
  return data;
}

export async function exchangeInstagramCode(code: string) {
  const { appId, secret, redirect } = instagramConfig();
  const form = new URLSearchParams({ client_id: appId, client_secret: secret, grant_type: "authorization_code", redirect_uri: redirect, code });
  return metaFetch<{ access_token: string; user_id: number; permissions?: string[] }>("https://api.instagram.com/oauth/access_token", { method: "POST", body: form });
}
export async function extendInstagramToken(shortToken: string) {
  const { secret } = instagramConfig();
  const query = new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: secret, access_token: shortToken });
  return metaFetch<{ access_token: string; expires_in: number }>(`https://graph.instagram.com/access_token?${query}`);
}
function graphUrl(path: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams(params);
  return `${graph}/${path}?${query}`;
}
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
export async function getInstagramAccount(token: string) {
  return metaFetch<{ id: string; user_id?: string; username: string; name?: string; profile_picture_url?: string; account_type?: string }>(graphUrl("me", { fields: "user_id,id,username,name,profile_picture_url,account_type" }), { headers: auth(token) });
}
export async function getConversations(token: string, accountId: string) {
  return metaFetch<{ data: { id: string; updated_time?: string; participants?: { data?: { id: string; username?: string }[] }; messages?: { data?: { id: string; message?: string; from?: { id: string; username?: string }; to?: { data?: { id: string }[] }; created_time?: string }[] } }[]; paging?: { next?: string; cursors?: { after?: string } } }>(graphUrl(`${encodeURIComponent(accountId)}/conversations`, { platform: "instagram", limit: "50", fields: "id,updated_time,participants,messages.limit(25){id,created_time,from,to,message}" }), { headers: auth(token) });
}

type SafeMetaDiagnostic = {
  httpStatus: number;
  id?: string;
  user_id?: string;
  username?: string;
  errorCode: number | null;
  errorSubcode: number | null;
  errorMessage: string | null;
};

async function safeMetaDiagnosticRequest(path: string, token: string): Promise<SafeMetaDiagnostic> {
  const response = await fetch(graphUrl(path, { fields: "id,user_id,username" }), { headers: auth(token), cache: "no-store" });
  const raw = await response.text();
  let data: { id?: string; user_id?: string; username?: string; error?: { code?: number; error_subcode?: number; message?: string } } = {};
  try { data = JSON.parse(raw); } catch { /* Preserve the safe status even for a non-JSON response. */ }
  return {
    httpStatus: response.status,
    id: data.id,
    user_id: data.user_id,
    username: data.username,
    errorCode: data.error?.code ?? null,
    errorSubcode: data.error?.error_subcode ?? null,
    errorMessage: safeDiagnosticMessage(data.error?.message),
  };
}

export async function getRawConversationDiagnostics(token: string, storedUserId: string) {
  const path = `${encodeURIComponent(storedUserId)}/conversations`;
  const url = graphUrl(path, { platform: "instagram", limit: "50", fields: "id,updated_time,participants,messages.limit(25){id,created_time,from,to,message}" });
  const response = await fetch(url, { headers: auth(token), cache: "no-store" });
  const raw = await response.text();
  let data: {
    data?: { id?: string; updated_time?: string }[];
    paging?: { next?: string; cursors?: { before?: string; after?: string } };
    error?: { code?: number; error_subcode?: number; message?: string };
  } = {};
  try { data = JSON.parse(raw); } catch { /* Report status and shape without returning the raw body. */ }
  const parsedUrl = new URL(url);
  const me = await safeMetaDiagnosticRequest("me", token);
  const stored = await safeMetaDiagnosticRequest(encodeURIComponent(storedUserId), token);
  return {
    request: { host: parsedUrl.host, path: parsedUrl.pathname, userId: storedUserId, apiVersion, platform: "instagram" },
    httpStatus: response.status,
    metaResponse: {
      dataCount: data.data?.length ?? 0,
      hasPaging: Boolean(data.paging),
      paging: data.paging ? { hasNext: Boolean(data.paging.next), cursorKeys: Object.keys(data.paging.cursors ?? {}) } : null,
      errorCode: data.error?.code ?? null,
      errorSubcode: data.error?.error_subcode ?? null,
      errorMessage: safeDiagnosticMessage(data.error?.message),
    },
    conversations: (data.data ?? []).map((conversation) => ({ id: conversation.id ?? null, updated_time: conversation.updated_time ?? null })),
    identity: { me, stored },
  };
}
export async function getConversationMessages(token: string, conversationId: string) {
  const response = await metaFetch<{ messages?: { data?: { id: string; message?: string; from?: { id: string; username?: string }; to?: { data?: { id: string }[] }; created_time?: string }[]; paging?: { next?: string; cursors?: { after?: string } } } }>(graphUrl(encodeURIComponent(conversationId), { fields: "messages.limit(25){id,message,from,to,created_time}" }), { headers: auth(token) });
  return { data: response.messages?.data ?? [], paging: response.messages?.paging };
}
export async function sendInstagramReply(token: string, accountId: string, recipientId: string, message: string) {
  return metaFetch<{ recipient_id: string; message_id: string }>(graphUrl(`${encodeURIComponent(accountId)}/messages`), { method: "POST", headers: { ...auth(token), "Content-Type": "application/json" }, body: JSON.stringify({ recipient: { id: recipientId }, message: { text: message } }) });
}
