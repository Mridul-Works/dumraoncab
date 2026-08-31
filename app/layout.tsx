import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StickyCallBar from "@/components/StickyCallBar";
import { site } from "@/lib/site";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
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
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  // Add Search Console verification once obtained (see README):
  // verification: { google: "PASTE-REAL-CODE-HERE" },
};

const taxiServiceJsonLd = {
  "@context": "https://schema.org",
  "@type": "TaxiService",
  name: site.name,
  url: site.url,
  telephone: site.phone,
  email: site.email,
  foundingDate: String(site.foundedYear),
  provider: {
    "@type": "LocalBusiness",
    name: site.name,
    telephone: site.phone,
    email: site.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
  },
  areaServed: site.serviceAreas.map((name) => ({ "@type": "Place", name })),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${plexMono.variable}`}>
      <body className="min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(taxiServiceJsonLd) }}
        />
        <div className="taxi-stripe" aria-hidden="true" />
        <Header />
        <main className="pb-16 md:pb-0">{children}</main>
        <Footer />
        <StickyCallBar />
      </body>
    </html>
  );
}
