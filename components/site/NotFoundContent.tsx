import Link from "next/link";
import { site } from "@/lib/site";

export default function NotFoundContent() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-start px-5 py-24 md:px-8">
      <span className="plate text-lg">404 · WRONG TURN</span>
      <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-primary md:text-5xl">
        This road doesn&rsquo;t exist.
      </h1>
      <p className="mt-4 max-w-xl leading-relaxed text-secondary">
        The page you were looking for has moved or was never here. The routes below will get you back
        on the highway — or just call{" "}
        <a href={`tel:${site.phone}`} className="font-mono font-semibold text-brand-strong">
          {site.phoneDisplay}
        </a>{" "}
        and book the old-fashioned way.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="rounded-full bg-brand-deep px-6 py-3 font-bold text-white hover:bg-brand-deep-hover">
          Back to home
        </Link>
        <Link href="/booking" className="rounded-full border border-subtle px-6 py-3 font-bold text-primary hover:border-brand hover:text-brand-strong">
          Book a cab
        </Link>
      </div>
    </section>
  );
}
