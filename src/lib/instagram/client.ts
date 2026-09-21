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

type InstagramConversation = {
  id: string;
  updated_time?: string;
  participants?: { data?: { id: string; username?: string }[] };
  messages?: { data?: { id: string; message?: string; from?: { id: string; username?: string }; to?: { data?: { id: string }[] }; created_time?: string }[] };
};
type ConversationPaging = { next?: string; cursors?: { before?: string; after?: string } };
type ConversationPage = { data?: InstagramConversation[]; paging?: ConversationPaging; error?: { code?: number; error_subcode?: number; message?: string } };
type ConversationPageResult = { page: number; dataCount: number; hasNext: boolean };
const maxConversationPages = 10;

function conversationUrl(accountId: string) {
  return graphUrl(`${encodeURIComponent(accountId)}/conversations`, { platform: "instagram", limit: "50", fields: "id,updated_time,participants,messages.limit(25){id,created_time,from,to,message}" });
}

function nextConversationUrl(baseUrl: string, paging?: ConversationPaging) {
  if (paging?.next) {
    const next = new URL(paging.next);
    next.searchParams.delete("access_token");
    return next.toString();
  }
  if (paging?.cursors?.after) {
    const next = new URL(baseUrl);
    next.searchParams.set("after", paging.cursors.after);
    return next.toString();
  }
  return null;
}

async function fetchConversationPages(token: string, accountId: string) {
  const baseUrl = conversationUrl(accountId);
  const seenUrls = new Set<string>();
  const seenCursors = new Set<string>();
  const conversations = new Map<string, InstagramConversation>();
  const pageResults: ConversationPageResult[] = [];
  let nextUrl: string | null = baseUrl;
  let lastPaging: ConversationPaging | undefined;

  for (let page = 1; page <= maxConversationPages && nextUrl; page += 1) {
    if (seenUrls.has(nextUrl)) break;
    seenUrls.add(nextUrl);
    const response = await metaFetch<ConversationPage>(nextUrl, { headers: auth(token) });
    for (const conversation of response.data ?? []) conversations.set(conversation.id, conversation);
    lastPaging = response.paging;
    const followingUrl = nextConversationUrl(baseUrl, response.paging);
    const cursor = response.paging?.cursors?.after;
    pageResults.push({ page, dataCount: response.data?.length ?? 0, hasNext: Boolean(followingUrl) });
    if (cursor) {
      if (seenCursors.has(cursor)) break;
      seenCursors.add(cursor);
    }
    nextUrl = followingUrl;
  }

  return { data: [...conversations.values()], paging: lastPaging, pagesFetched: pageResults.length, pageResults };
}

export async function getConversations(token: string, accountId: string) {
  return fetchConversationPages(token, accountId);
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
  const url = conversationUrl(storedUserId);
  const seenUrls = new Set<string>();
  const seenCursors = new Set<string>();
  const conversations = new Map<string, { id: string | null; updated_time: string | null }>();
  const pageResults: ConversationPageResult[] = [];
  let nextUrl: string | null = url;
  let firstStatus = 0;
  let firstData: ConversationPage = {};
  let diagnosticError: ConversationPage["error"];
  let pagesFetched = 0;

  for (let page = 1; page <= maxConversationPages && nextUrl; page += 1) {
    if (seenUrls.has(nextUrl)) break;
    seenUrls.add(nextUrl);
    const response = await fetch(nextUrl, { headers: auth(token), cache: "no-store" });
    const raw = await response.text();
    let data: ConversationPage = {};
    try { data = JSON.parse(raw); } catch { /* Report status and shape without returning the raw body. */ }
    if (page === 1) {
      firstStatus = response.status;
      firstData = data;
    }
    pagesFetched = page;
    diagnosticError = data.error;
    for (const conversation of data.data ?? []) {
      conversations.set(conversation.id, { id: conversation.id, updated_time: conversation.updated_time ?? null });
    }
    const followingUrl = nextConversationUrl(url, data.paging);
    const cursor = data.paging?.cursors?.after;
    pageResults.push({ page, dataCount: data.data?.length ?? 0, hasNext: Boolean(followingUrl) });
    if (!response.ok || data.error) break;
    if (cursor) {
      if (seenCursors.has(cursor)) break;
      seenCursors.add(cursor);
    }
    nextUrl = followingUrl;
  }

  const parsedUrl = new URL(url);
  const me = await safeMetaDiagnosticRequest("me", token);
  const stored = await safeMetaDiagnosticRequest(encodeURIComponent(storedUserId), token);
  return {
    request: { host: parsedUrl.host, path: parsedUrl.pathname, userId: storedUserId, apiVersion, platform: "instagram" },
    httpStatus: firstStatus,
    metaResponse: {
      dataCount: firstData.data?.length ?? 0,
      hasPaging: Boolean(firstData.paging),
      paging: firstData.paging ? { hasNext: Boolean(nextConversationUrl(url, firstData.paging)), cursorKeys: Object.keys(firstData.paging.cursors ?? {}) } : null,
      errorCode: diagnosticError?.code ?? null,
      errorSubcode: diagnosticError?.error_subcode ?? null,
      errorMessage: safeDiagnosticMessage(diagnosticError?.message),
    },
    pagesFetched,
    pageResults,
    totalConversationsFound: conversations.size,
    conversations: [...conversations.values()],
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
