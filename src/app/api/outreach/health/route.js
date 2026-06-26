import { n8nSecretOk, outreachConfig } from "@/lib/outreach";

// GET /api/outreach/health — verify the integration is configured (booleans only,
// never secrets). Requires the N8N_WEBHOOK_SECRET.
export async function GET(request) {
  if (!n8nSecretOk(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ ok: true, config: outreachConfig() });
}
