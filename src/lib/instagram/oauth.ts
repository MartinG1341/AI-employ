const productionCallback = "https://sales-copilot-one.vercel.app/api/instagram/callback";
export const instagramScopes = ["instagram_business_basic", "instagram_business_manage_messages"];

export function metaConfig() {
  const appId = process.env.META_APP_ID;
  const secret = process.env.META_APP_SECRET;
  const redirect = process.env.META_REDIRECT_URI || productionCallback;
  if (!appId || !secret) throw new Error("Missing Meta credentials. Configure META_APP_ID and META_APP_SECRET.");
  if (process.env.NODE_ENV === "production" && redirect !== productionCallback) throw new Error(`META_REDIRECT_URI must be ${productionCallback}`);
  return { appId, secret, redirect };
}

export function getInstagramOAuthUrl(state: string) {
  const { appId, redirect } = metaConfig();
  const params = new URLSearchParams({ client_id: appId, redirect_uri: redirect, response_type: "code", scope: instagramScopes.join(","), state, enable_fb_login: "0", force_authentication: "1" });
  return `https://www.instagram.com/oauth/authorize?${params}`;
}
