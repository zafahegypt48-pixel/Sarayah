import { Fraunces, Work_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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

const SITE_NAME = "Zafah — الزفة";
const SITE_DESC =
  "Zafah (الزفة) — Egypt's directory for wedding and event venues. Browse hotels, gardens, villas, and rooftops, compare capacity, pricing, and amenities, then send one inquiry.";

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    default: "Zafah — Find your wedding & event venue in Egypt",
    template: "%s · Zafah",
  },
  description: SITE_DESC,
  applicationName: "Zafah",
  keywords: [
    "Zafah", "الزفة", "wedding venues Egypt", "event venues Cairo",
    "wedding halls", "garden wedding", "engagement venue", "Egypt",
  ],
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESC,
    siteName: "Zafah",
    locale: "en_EG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESC,
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${workSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
