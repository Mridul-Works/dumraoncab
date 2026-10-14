import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-bricolage",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-plex-mono",
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
  themeColor: "#0a4f37",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${instrument.variable} ${plexMono.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
