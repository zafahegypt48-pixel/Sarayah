// Email notifications via Resend (https://resend.com) over its REST API — no SDK.
// Everything here is a GRACEFUL NO-OP when RESEND_API_KEY is missing, so leads and
// venue submissions always save regardless. Email failures never block the flow
// (callers fire-and-forget and catch). Secrets are never logged.
//
// Configure in .env.local (and Vercel):
//   RESEND_API_KEY           = re_xxxxxxxx       (resend.com -> API Keys)
//   ADMIN_NOTIFICATION_EMAIL = you@example.com   (where admin alerts go)
//   LEAD_NOTIFY_FROM         = "Sarayah <onboarding@resend.dev>" (a verified sender)

const FROM = () => process.env.LEAD_NOTIFY_FROM || "Sarayah <onboarding@resend.dev>";

// HTML-escape every user-supplied value before it goes into an email body, so a
// submitter can't inject markup (e.g. <img onerror>, fake links) that renders in
// the admin's mail client. `fmt` is the single chokepoint used by all templates.
const escHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (v) => (v === undefined || v === null || v === "" ? "—" : escHtml(v));

// Where admin alerts go. Falls back through older vars then the admin allowlist.
function adminRecipients() {
  const to =
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.LEAD_NOTIFY_TO ||
    process.env.ADMIN_EMAILS ||
    "";
  return to.split(",").map((e) => e.trim()).filter(Boolean);
}

// Core sender. Returns {skipped} if unconfigured, {sent} on success; throws on
// a real send failure (callers catch + log so the main flow is never blocked).
async function sendEmail({ to, subject, html, context }) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!apiKey) {
    console.info(`[notify] Email disabled (no RESEND_API_KEY) — skipped: ${context || subject}`);
    return { skipped: true };
  }
  if (recipients.length === 0) {
    console.info(`[notify] No recipient for: ${context || subject} — skipped`);
    return { skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: FROM(), to: recipients, subject, html }),
  });
  if (!res.ok) {
    // Do NOT include the Authorization header / key in logs.
    throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return { sent: true };
}

// --- Admin alerts ---------------------------------------------------------

export function notifyNewLead(lead) {
  const html = `
    <h2 style="font-family:sans-serif">New booking inquiry</h2>
    <p style="font-family:sans-serif">A new lead came in via Sarayah (سرايا):</p>
    <table style="font-family:sans-serif;border-collapse:collapse" cellpadding="6">
      <tr><td><b>Venue</b></td><td>${fmt(lead.venueName)}</td></tr>
      <tr><td><b>Name</b></td><td>${fmt(lead.name)}</td></tr>
      <tr><td><b>Phone</b></td><td>${fmt(lead.phone)}</td></tr>
      <tr><td><b>Email</b></td><td>${fmt(lead.email)}</td></tr>
      <tr><td><b>Event type</b></td><td>${fmt(lead.eventType)}</td></tr>
      <tr><td><b>Event date</b></td><td>${fmt(lead.eventDate)}</td></tr>
      <tr><td><b>Guests</b></td><td>${fmt(lead.guests)}</td></tr>
      <tr><td><b>Budget</b></td><td>${fmt(lead.budget)}</td></tr>
      <tr><td><b>Notes</b></td><td>${fmt(lead.notes)}</td></tr>
    </table>`;
  return sendEmail({
    to: adminRecipients(),
    subject: `New inquiry: ${lead.venueName || "a venue"} — ${lead.name || ""}`.trim(),
    html,
    context: "new lead (admin)",
  });
}

export function notifyNewVenueSubmission(venue) {
  const html = `
    <h2 style="font-family:sans-serif">New venue submitted — pending review</h2>
    <table style="font-family:sans-serif;border-collapse:collapse" cellpadding="6">
      <tr><td><b>Venue</b></td><td>${fmt(venue.name)}</td></tr>
      <tr><td><b>Type</b></td><td>${fmt(venue.type)}</td></tr>
      <tr><td><b>City</b></td><td>${fmt(venue.city)}</td></tr>
      <tr><td><b>Source</b></td><td>${fmt(venue.source)}</td></tr>
      <tr><td><b>Owner</b></td><td>${fmt(venue.owner_name)} (${fmt(venue.owner_phone)} / ${fmt(venue.owner_email)})</td></tr>
    </table>
    <p style="font-family:sans-serif">Review it in the Sarayah admin dashboard before it goes public.</p>`;
  return sendEmail({
    to: adminRecipients(),
    subject: `New venue pending review: ${venue.name || "venue"}`,
    html,
    context: "new venue (admin)",
  });
}

// A vendor/user filed a claim on an existing listing — pending admin review.
export function notifyNewClaim({ venueName, venueId, claimantEmail, matched }) {
  const html = `
    <h2 style="font-family:sans-serif">New venue claim — ${matched ? "auto-approved" : "pending review"}</h2>
    <table style="font-family:sans-serif;border-collapse:collapse" cellpadding="6">
      <tr><td><b>Listing</b></td><td>${fmt(venueName || venueId)}</td></tr>
      <tr><td><b>Requested by</b></td><td>${fmt(claimantEmail)}</td></tr>
      <tr><td><b>Ownership proof</b></td><td>${matched ? "Email matched (auto-claimed)" : "Not proven — needs admin approval"}</td></tr>
    </table>
    <p style="font-family:sans-serif">Open the Sarayah admin dashboard → Claims to review the full request.</p>`;
  return sendEmail({
    to: adminRecipients(),
    subject: `Venue claim: ${venueName || venueId} — ${matched ? "auto" : "pending"}`,
    html,
    context: "new claim (admin)",
  });
}

// --- Confirmations to submitters -----------------------------------------

export function notifyContactMessage(msg) {
  const html = `
    <h2 style="font-family:sans-serif">New contact message — Sarayah (سرايا)</h2>
    <table style="font-family:sans-serif;border-collapse:collapse" cellpadding="6">
      <tr><td><b>Type</b></td><td>${fmt(msg.inquiry_type)}</td></tr>
      <tr><td><b>Name</b></td><td>${fmt(msg.name)}</td></tr>
      <tr><td><b>Email</b></td><td>${fmt(msg.email)}</td></tr>
      <tr><td><b>Phone</b></td><td>${fmt(msg.phone)}</td></tr>
    </table>
    <p style="font-family:sans-serif;white-space:pre-wrap">${fmt(msg.message)}</p>`;
  return sendEmail({
    to: adminRecipients(),
    subject: `Contact: ${msg.inquiry_type || "message"} — ${msg.name || ""}`.trim(),
    html,
    context: "contact message (admin)",
  });
}

export function notifyOwnerVenueReceived(venue) {
  if (!venue?.owner_email) return Promise.resolve({ skipped: true });
  const html = `
    <h2 style="font-family:sans-serif">We received your venue — Sarayah (سرايا)</h2>
    <p style="font-family:sans-serif">Thank you for submitting <b>${fmt(venue.name)}</b>.</p>
    <p style="font-family:sans-serif">Your listing is <b>pending review</b>. Our team will check the details
    and may contact you to verify ownership before it appears publicly. Listing is free during launch.</p>
    <p style="font-family:sans-serif" dir="rtl">شكرًا لتسجيل مكانك على زفة. القائمة قيد المراجعة وسنتواصل معك قبل نشرها.</p>`;
  return sendEmail({ to: venue.owner_email, subject: "We received your venue — Sarayah", html, context: "owner confirmation" });
}

export function notifyCoupleInquiryReceived(lead) {
  if (!lead?.email) return Promise.resolve({ skipped: true });
  const html = `
    <h2 style="font-family:sans-serif">Your inquiry was sent — Sarayah (سرايا)</h2>
    <p style="font-family:sans-serif">Thanks ${fmt(lead.name)}! We've passed your inquiry${lead.venueName ? ` for <b>${fmt(lead.venueName)}</b>` : ""} to the venue.
    They'll contact you to confirm availability and pricing.</p>
    <p style="font-family:sans-serif">Please confirm availability, prices, and payment terms directly with the venue before paying anything.</p>
    <p style="font-family:sans-serif" dir="rtl">تم إرسال طلبك. سيتواصل معك المكان لتأكيد التوافر والأسعار. يُرجى تأكيد كل التفاصيل مع المكان قبل دفع أي مبالغ.</p>`;
  return sendEmail({ to: lead.email, subject: "Your inquiry was sent — Sarayah", html, context: "couple confirmation" });
}
