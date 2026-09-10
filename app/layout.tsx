import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StickyCallBar from "@/components/StickyCallBar";
import WhatsAppFab from "@/components/WhatsAppFab";
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
    priceRange: "₹₹",
    contactPoint: [site.phone, ...site.altPhones.map((p) => p.raw)].map((telephone) => ({
      "@type": "ContactPoint",
      telephone,
      contactType: "customer service",
      availableLanguage: ["Hindi", "English"],
    })),
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
    <html lang="en" className={`${bricolage.variable} ${instrument.variable} ${plexMono.variable}`}>
      <body className="min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(taxiServiceJsonLd) }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-night focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <div className="taxi-stripe" aria-hidden="true" />
        <Header />
        <main id="main" className="pb-16 md:pb-0">
          {children}
        </main>
        <Footer />
        <WhatsAppFab />
        <StickyCallBar />
      </body>
    </html>
  );
}
