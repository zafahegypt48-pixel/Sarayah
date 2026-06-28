import { addReview } from "@/lib/data";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";

// Public review submission for a listing. Rate-limited + validated; the review is
// forced to status='pending' (here AND by RLS) so it can't go live without admin
// approval. The DB trigger updates the listing's rating once approved.
export async function POST(request, { params }) {
  const rl = await checkRateLimit(request, { name: "review", limit: 5, windowSeconds: 600 });
  if (!rl.ok) return tooManyRequests();

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const authorName = String(body.authorName || "").trim();
  const rating = Number(body.rating);
  const title = body.title ? String(body.title).trim().slice(0, 120) : null;
  const reviewBody = body.body ? String(body.body).trim().slice(0, 2000) : null;

  const errors = {};
  if (authorName.length < 2) errors.authorName = "Please enter your name.";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = "Choose a rating from 1 to 5.";
  if (Object.keys(errors).length) {
    return Response.json({ error: "Please check the form.", errors }, { status: 400 });
  }

  try {
    await addReview({ listingId: id, authorName, rating, title, body: reviewBody });
    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Review submit failed:", err.message);
    return Response.json({ error: "Could not submit review." }, { status: 500 });
  }
}
