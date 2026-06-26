import Link from "next/link";
import { getCurrentUser, isAdminEmail } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import MobileMenu from "@/components/MobileMenu";

export default async function Navbar() {
  const user = await getCurrentUser();
  const admin = user && isAdminEmail(user.email);

  return (
    <header className="sticky top-0 z-40 bg-ivory/95 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl tracking-tight text-ink" aria-label="Zafah home">
          Zafah<span className="text-brass">.</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink/70">
          <Link href="/venues" className="hover:text-ink transition">Venues</Link>
          <Link href="/search" className="hover:text-ink transition">AI Search</Link>
          <Link href="/how-it-works" className="hover:text-ink transition">How it works</Link>
          <Link href="/add-venue" className="hover:text-ink transition">List your venue</Link>
          {admin && <Link href="/admin" className="hover:text-ink transition">Admin</Link>}
        </nav>
        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-ink/50">{user.email}</span>
              <span className="font-medium text-ink/70">
                <LogoutButton />
              </span>
            </>
          ) : (
            <>
              <Link href="/login" className="font-medium text-ink/70 hover:text-ink transition">Log in</Link>
              <Link
                href="/signup"
                className="font-semibold bg-emerald text-ivory px-4 py-2 rounded-full hover:bg-ink transition"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu */}
        <MobileMenu userEmail={user?.email || ""} isAdmin={!!admin} />
      </div>
    </header>
  );
}
