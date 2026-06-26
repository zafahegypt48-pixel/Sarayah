// Optional IP-based rate limiting for public POST routes, backed by Upstash Redis
// (serverless-friendly — in-memory limiters don't work reliably on Vercel).
//
// FULLY OPTIONAL: if UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set,
// rate limiting is disabled and every request is allowed (the app still runs).
// It also FAILS OPEN on any Redis error, so a Redis hiccup never blocks real users.
//
// Configure in .env.local (and Vercel):
//   UPSTASH_REDIS_REST_URL   = https://...upstash.io
//   UPSTASH_REDIS_REST_TOKEN = ...
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const configured = Boolean(URL && TOKEN);

let redis = null;
if (configured) {
  redis = new Redis({ url: URL, token: TOKEN });
} else {
  console.info("[ratelimit] Disabled — set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable.");
}

const limiters = new Map();
function getLimiter(name, limit, windowSeconds) {
  const key = `${name}:${limit}:${windowSeconds}`;
  if (!limiters.has(key)) {
    limiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
        prefix: `zafah:rl:${name}`,
        analytics: false,
      })
    );
  }
  return limiters.get(key);
}

// Best-effort client IP from proxy headers (we only use it as a rate-limit key;
// we do not store or log it elsewhere).
function clientIp(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// Returns { ok } — true if allowed (or disabled / on error), false if over limit.
export async function checkRateLimit(request, { name, limit, windowSeconds }) {
  if (!configured) return { ok: true, disabled: true };
  try {
    const { success } = await getLimiter(name, limit, windowSeconds).limit(clientIp(request));
    return { ok: success };
  } catch (e) {
    console.error("[ratelimit] check failed, allowing request:", e.message);
    return { ok: true, error: true };
  }
}

export function tooManyRequests() {
  return Response.json(
    { error: "Too many requests. Please slow down and try again in a few minutes." },
    { status: 429 }
  );
}
