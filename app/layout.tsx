import type { Metadata, Viewport } from "next";
import { Google_Sans_Flex, Google_Sans_Code } from "next/font/google";
import { site } from "@/lib/site";
import { colors } from "@/lib/designTokens";
import "./globals.css";

// Chinkara type families (Primitive: Type › Family). Both are variable fonts.
const sans = Google_Sans_Flex({
  subsets: ["latin"],
  variable: "--font-google-sans-flex",
  adjustFontFallback: false, // no metric overrides published for this family yet
  display: "swap",
});

const mono = Google_Sans_Code({
  subsets: ["latin"],
  variable: "--font-google-sans-code",
  adjustFontFallback: false,
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Dumraon Cab Service | Cabs & Car Rental in Dumraon, Buxar, Bihar",
    template: "%s | Dumraon Cab Service",
  },
  description: site.description,
  keywords: [
    "cab service in Dumraon",
    "taxi in Buxar",
    "car rental Bihar",
    "Dumraon to Patna airport cab",
    "outstation taxi Bihar",
    "wedding car rental Dumraon",
    "hourly car rental Buxar",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: site.url,
    siteName: site.name,
    title: "Dumraon Cab Service | Cabs & Car Rental in Dumraon, Buxar, Bihar",
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Dumraon Cab Service | Cabs & Car Rental in Dumraon, Buxar, Bihar",
    description: site.description,
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  // Add Search Console verification once obtained (see README):
  // verification: { google: "PASTE-REAL-CODE-HERE" },
};

export const viewport: Viewport = {
  themeColor: colors["chinkara-green-950"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
