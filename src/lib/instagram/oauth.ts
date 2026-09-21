const productionCallback = "https://sales-copilot-one.vercel.app/api/instagram/callback";
export const instagramScopes = ["instagram_business_basic", "instagram_business_manage_messages"];

type InstagramConfigOptions = { requireSecret?: boolean };
type InstagramConfig = { appId: string; secret: string; redirect: string };
type InstagramPublicConfig = { appId: string; secret?: string; redirect: string };

export function instagramConfig(): InstagramConfig;
export function instagramConfig(options: { requireSecret: true }): InstagramConfig;
export function instagramConfig(options: { requireSecret: false }): InstagramPublicConfig;
export function instagramConfig({ requireSecret = true }: InstagramConfigOptions = {}): InstagramConfig | InstagramPublicConfig {
  const appId = process.env.INSTAGRAM_APP_ID;
  const secret = process.env.INSTAGRAM_APP_SECRET;
  const redirect = process.env.META_REDIRECT_URI || productionCallback;
  const missing = [
    !appId ? "INSTAGRAM_APP_ID" : "",
    requireSecret && !secret ? "INSTAGRAM_APP_SECRET" : "",
  ].filter(Boolean);
  if (missing.length) throw new Error(`Missing Instagram Login credentials. Configure ${missing.join(" and ")}.`);
  if (process.env.NODE_ENV === "production" && redirect !== productionCallback) throw new Error(`META_REDIRECT_URI must be ${productionCallback}`);
  if (requireSecret) {
    if (!appId || !secret) throw new Error("Missing Instagram Login credentials.");
    return { appId, secret, redirect };
  }
  if (!appId) throw new Error("Missing Instagram Login credentials.");
  return { appId, secret, redirect };
}

export function getInstagramOAuthUrl(state: string) {
  const { appId, redirect } = instagramConfig({ requireSecret: false });
  const params = new URLSearchParams({ client_id: appId, redirect_uri: redirect, response_type: "code", scope: instagramScopes.join(","), state, enable_fb_login: "0", force_authentication: "1" });
  return `https://www.instagram.com/oauth/authorize?${params}`;
}
