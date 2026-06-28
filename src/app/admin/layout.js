import { redirect } from "next/navigation";
import { getCurrentUser, isAdminEmail } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

// Server-side guard: only logged-in admins (emails in ADMIN_EMAILS) can see
// anything under /admin. Everyone else is bounced to /login.
export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin");
  }
  if (!isAdminEmail(user.email)) {
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
