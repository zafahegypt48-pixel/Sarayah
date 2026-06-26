// Helpers for the n8n + WhatsApp outreach integration.
// The Google Sheet remains the source of truth; `outreach_prospects` in Supabase
// is only a lightweight mirror so the app can correlate clicks/registrations.

// Fail-closed secret check for n8n-facing routes. n8n must send the secret in the
// `x-n8n-secret` header (or `Authorization: Bearer <secret>`). Never log the secret.
export function n8nSecretOk(request) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) return false; // not configured → reject everything
  const header = request.headers.get("x-n8n-secret") || "";
  const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const provided = header || bearer;
  return provided.length > 0 && provided === secret;
}

// Booleans only — never returns actual secret values.
export function outreachConfig() {
  return {
    whatsappConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    webhookSecretConfigured: Boolean(process.env.N8N_WEBHOOK_SECRET),
    verifyTokenConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
    businessAccountConfigured: Boolean(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID),
    siteUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  };
}
