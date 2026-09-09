import Link from "next/link";
import { site } from "@/lib/site";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-start px-5 py-24 md:px-8">
      <span className="plate text-lg">404 · WRONG TURN</span>
      <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-ink md:text-5xl">
        This road doesn&rsquo;t exist.
      </h1>
      <p className="mt-4 max-w-xl leading-relaxed text-khaki">
        The page you were looking for has moved or was never here. The routes below will get you back
        on the highway — or just call{" "}
        <a href={`tel:${site.phone}`} className="font-mono font-semibold text-amberdeep">
          {site.phoneDisplay}
        </a>{" "}
        and book the old-fashioned way.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="rounded-full bg-night px-6 py-3 font-bold text-white hover:bg-coal">
          Back to home
        </Link>
        <Link href="/booking" className="rounded-full border border-line px-6 py-3 font-bold text-ink hover:border-amber hover:text-amberdeep">
          Book a cab
        </Link>
      </div>
    </section>
  );
}
