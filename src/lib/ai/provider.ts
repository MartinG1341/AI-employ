export type AIProvider = { generateText(input: { prompt: string; tone?: string }): Promise<string> };
export const mockProvider: AIProvider = { async generateText({ prompt }) { return `Mock suggestion based on the available facts: ${prompt.slice(0, 180)}…`; } };

type ChatResponse = { choices?: Array<{ message?: { content?: string } }> };
function compatibleConfig() {
  const baseUrl = process.env.AI_BASE_URL?.trim();
  const model = process.env.AI_MODEL?.trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!baseUrl || !model || !apiKey) throw new Error("AI_PROVIDER=openai-compatible requires AI_BASE_URL, AI_MODEL, and AI_API_KEY.");
  return { baseUrl: baseUrl.replace(/\/$/, "").endsWith("/chat/completions") ? baseUrl.replace(/\/$/, "") : `${baseUrl.replace(/\/$/, "")}/chat/completions`, model, apiKey };
}
export const openAICompatibleProvider: AIProvider = { async generateText({ prompt, tone }) {
  const { baseUrl, model, apiKey } = compatibleConfig();
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
  if (process.env.AI_SITE_URL) headers["HTTP-Referer"] = process.env.AI_SITE_URL;
  if (process.env.AI_APP_NAME) headers["X-Title"] = process.env.AI_APP_NAME;
  const response = await fetch(baseUrl, { method: "POST", headers, body: JSON.stringify({ model, temperature: 0.7, max_tokens: 220, messages: [{ role: "system", content: "You write concise Instagram outreach messages. Return only the final message." }, { role: "user", content: `${prompt}\nTone: ${tone || "casual"}` }] }), cache: "no-store" });
  const body = await response.json().catch(() => null) as ChatResponse | { error?: { message?: string } } | null;
  if (!response.ok) throw new Error(`AI provider ${response.status}: ${body && "error" in body ? body.error?.message || "request failed" : "request failed"}`);
  const text = body && "choices" in body ? body.choices?.[0]?.message?.content?.trim() : "";
  if (!text) throw new Error("AI provider returned no generated text.");
  return text.replace(/^['"]|['"]$/g, "").trim();
} };
export function getAIProvider(): AIProvider { return (process.env.AI_PROVIDER || "mock").trim().toLowerCase() === "openai-compatible" ? openAICompatibleProvider : mockProvider; }
