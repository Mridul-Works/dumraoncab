import Link from "next/link";

// Header for the add/edit car pages: green "← Fleet" back link, h2 title, one-line intro.
export default function FleetHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Link href="/admin/fleet" className="self-start type-ui text-brand hover:text-link-hover">
        ← Fleet
      </Link>
      <h1 className="type-h2 text-primary">{title}</h1>
      <p className="type-body-sm text-secondary">{intro}</p>
    </div>
  );
}
