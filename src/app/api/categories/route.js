import { getCategories } from "@/lib/data";

// Public category list (bilingual). Used by the home grid + onboarding form.
export async function GET() {
  try {
    return Response.json(await getCategories());
  } catch (err) {
    console.error("Categories read failed:", err.message);
    return Response.json([], { status: 200 });
  }
}
