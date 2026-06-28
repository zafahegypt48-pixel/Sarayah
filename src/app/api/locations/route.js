import { getGovernorates, getCities } from "@/lib/data";

// Public locations (governorates + their cities) for filters + onboarding.
export async function GET() {
  try {
    const [governorates, cities] = await Promise.all([getGovernorates(), getCities()]);
    return Response.json({ governorates, cities });
  } catch (err) {
    console.error("Locations read failed:", err.message);
    return Response.json({ governorates: [], cities: [] }, { status: 200 });
  }
}
