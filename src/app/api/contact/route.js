import { supabase } from "@/lib/supabaseClient";
import { notifyContactMessage } from "@/lib/notify";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TYPES = new Set(["User inquiry", "Venue owner", "Report issue", "Partnership", "Other"]);

export async function POST(request) {
  const rl = await checkRateLimit(request, { name: "contact", limit: 5, windowSeconds: 600 });
  if (!rl.ok) return tooManyRequests();

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const message = String(body.message || "").trim();
  const phone = body.phone ? String(body.phone).trim().slice(0, 40) : null;
  const inquiry_type = TYPES.has(body.inquiry_type) ? body.inquiry_type : "Other";

  const errors = {};
  if (name.length < 2) errors.name = "Please enter your name.";
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (message.length < 5) errors.message = "Please enter a message.";
  if (message.length > 4000) errors.message = "Message is too long.";
  if (Object.keys(errors).length) {
    return Response.json({ error: "Please check the form.", errors }, { status: 400 });
  }

  const row = { name, email, phone, inquiry_type, message: message.slice(0, 4000) };
  try {
    // No .select() — public can insert but RLS blocks reading contact messages back.
    const { error } = await supabase.from("contact_messages").insert([row]);
    if (error) throw error;
  } catch (err) {
    console.error("Contact save failed:", err.message);
    return Response.json({ error: "Could not send your message. Please try again." }, { status: 500 });
  }

  // Fire-and-forget admin email (no-op without RESEND_API_KEY; never blocks).
  notifyContactMessage(row).catch((e) => console.error("Contact notify failed:", e.message));

  return Response.json({ success: true }, { status: 201 });
}
