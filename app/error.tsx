"use client";

import { site } from "@/lib/site";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-start px-5 py-24 md:px-8">
      <span className="plate text-lg">ENGINE TROUBLE</span>
      <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-ink md:text-5xl">
        Something went wrong on this page.
      </h1>
      <p className="mt-4 max-w-xl leading-relaxed text-khaki">
        Try again below. If it keeps happening, the booking line always works — call{" "}
        <a href={`tel:${site.phone}`} className="font-mono font-semibold text-amberdeep">
          {site.phoneDisplay}
        </a>{" "}
        and we&rsquo;ll sort your trip out directly.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-night px-6 py-3 font-bold text-white hover:bg-coal"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-full border border-line px-6 py-3 font-bold text-ink hover:border-amber hover:text-amberdeep"
        >
          Back to home
        </a>
      </div>
    </section>
  );
}
