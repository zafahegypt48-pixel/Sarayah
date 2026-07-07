import { redirect } from "next/navigation";
import { getCurrentUser, getAdminContext } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

// Server-side guard: only logged-in users whose email is in the public.admins
// table (verified in the DB via is_admin()) can see anything under /admin.
// Everyone else is bounced to /login. This does NOT trust the ADMIN_EMAILS env.
export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/admin");
  }

  // Authoritative admin check against public.admins (null unless in the table).
  const admin = await getAdminContext();
  if (!admin) {
    redirect("/login?error=not-admin");
  }

  return (
    <div>
      <div className="bg-night text-onnight/70 text-xs">
        <div className="max-w-6xl mx-auto px-5 py-2 flex items-center justify-between">
          <span>Signed in as {user.email}</span>
          <LogoutButton />
        </div>
      </div>
      {children}
    </div>
  );
}
