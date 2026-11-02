import type { Metadata, Viewport } from "next";

// Driver app (Figma Flow 10): a phone web app for staff and vendor drivers.
// Private — kept out of search (robots.ts disallows /driver, noindex here too).
export const metadata: Metadata = {
  title: { default: "Driver", template: "%s · Driver · Dumraon Cab" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-gray-50">{children}</div>;
}
