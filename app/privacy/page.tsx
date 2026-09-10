import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Dumraon Cab Service handles the information you share when booking a cab.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-14 md:px-8">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-amberdeep">Legal</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        Privacy policy
      </h1>
      <div className="mt-6 space-y-5 leading-relaxed text-khaki">
        <p>
          {site.name} keeps things simple: we collect only what we need to run your trip, and we
          never sell your information.
        </p>
        <h2 className="pt-2 font-display text-lg font-semibold text-ink">What we collect</h2>
        <p>
          When you book — by phone, WhatsApp or the forms on this site — we receive the details you
          send: your name, phone number, pickup and drop locations, travel date and any notes. The
          website itself sets no advertising or tracking cookies.
        </p>
        <h2 className="pt-2 font-display text-lg font-semibold text-ink">How we use it</h2>
        <p>
          Your details are used to confirm the booking, position the car, and contact you about your
          trip. Trip records are kept for billing and to serve you faster on repeat bookings. They
          are shared only with the driver assigned to your trip.
        </p>
        <h2 className="pt-2 font-display text-lg font-semibold text-ink">Your choices</h2>
        <p>
          To review or delete the information we hold about you, call {site.phoneDisplay} or email{" "}
          <a href={`mailto:${site.email}`} className="font-semibold text-amberdeep">{site.email}</a>{" "}
          — we will act on the request within a reasonable time.
        </p>
        <p className="text-sm">
          Questions about this policy: {site.phoneDisplay} · {site.email}.
        </p>
      </div>
    </section>
  );
}
