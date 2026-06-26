import { getAdminContext } from "@/lib/auth";

// Admin-only: list venue reports (newest first).
export async function GET() {
  const ctx = await getAdminContext();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { data, error } = await ctx.supabase
      .from("venue_reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    console.error("Reports read failed:", err.message);
    return Response.json({ error: "Could not load reports." }, { status: 500 });
  }
}
