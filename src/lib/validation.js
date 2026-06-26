// Shared validation for booking inquiries (leads). Used on both the client
// (LeadForm) and the server (/api/leads) so the rules can't be bypassed.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Egyptian/international phone: optional +, then 7+ digits, allowing spaces/dashes.
const PHONE_RE = /^\+?[\d][\d\s-]{6,}$/;

export function validateLead(p = {}) {
  const errors = {};

  const name = String(p.name || "").trim();
  if (name.length < 2) errors.name = "Please enter your full name.";

  const phone = String(p.phone || "").trim();
  if (!PHONE_RE.test(phone)) errors.phone = "Enter a valid phone number (at least 7 digits).";

  const email = String(p.email || "").trim();
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";

  if (!p.eventType) errors.eventType = "Select an event type.";

  const eventDate = String(p.eventDate || "").trim();
  if (!eventDate) {
    errors.eventDate = "Select your event date.";
  } else if (Number.isNaN(Date.parse(eventDate))) {
    errors.eventDate = "Enter a valid date.";
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(eventDate) < today) errors.eventDate = "Event date can't be in the past.";
  }

  const guests = Number(p.guests);
  if (!Number.isFinite(guests) || guests < 1 || guests > 100000) {
    errors.guests = "Enter a guest count between 1 and 100,000.";
  }

  if (p.budget !== undefined && p.budget !== "" && p.budget !== null) {
    const budget = Number(p.budget);
    if (!Number.isFinite(budget) || budget < 0) errors.budget = "Enter a valid budget.";
  }

  if (p.notes && String(p.notes).length > 2000) errors.notes = "Notes are too long (max 2000 characters).";

  return { valid: Object.keys(errors).length === 0, errors };
}
