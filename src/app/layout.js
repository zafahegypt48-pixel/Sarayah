import { Fraunces, Work_Sans, Cairo, Poppins } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import { LanguageProvider } from "@/lib/i18n/client";
import { getLocale, getTheme } from "@/lib/i18n/server";
import { dirFor, getDictionary } from "@/lib/i18n/dictionaries";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const workSans = Work_Sans({
  variable: "--font-worksans",
  subsets: ["latin"],
});

// Arabic-capable font, used for body + headings when the document is RTL.
const cairo = Cairo({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

// Geometric sans used only for the "Sarayah." wordmark (matches the brand logo).
const poppins = Poppins({
  variable: "--font-wordmark",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const SITE_NAME = "Sarayah — سرايا";
const SITE_DESC =
  "Sarayah — Egypt's directory for wedding and event venues. Browse hotels, gardens, villas, and rooftops, compare capacity, pricing, and amenities, then send one inquiry.";

// Build a valid metadataBase even if NEXT_PUBLIC_SITE_URL is missing or malformed
// (e.g. entered without "https://" on the host) — otherwise `new URL()` throws at
// module load and 500s every page.
function resolveSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  const candidate = raw ? (raw.startsWith("http") ? raw : `https://${raw}`) : "http://localhost:3000";
  try {
    return new URL(candidate);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata = {
  metadataBase: resolveSiteUrl(),
  title: {
    default: "Sarayah — Find your wedding & event venue in Egypt",
    template: "%s · Sarayah",
  },
  description: SITE_DESC,
  applicationName: "Sarayah",
  keywords: [
    "Sarayah", "سرايا", "wedding venues Egypt", "event venues Cairo",
    "wedding halls", "garden wedding", "engagement venue", "Egypt",
  ],
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESC,
    siteName: "Sarayah",
    locale: "en_EG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESC,
  },
};

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const theme = await getTheme();
  const dir = dirFor(locale);
  const dict = getDictionary(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      data-theme={theme}
      className={`${fraunces.variable} ${workSans.variable} ${cairo.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider locale={locale} dict={dict}>
          <Navbar />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <Footer />
          <BottomNav />
        </LanguageProvider>
      </body>
    </html>
  );
}
