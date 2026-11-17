import Link from "next/link";

// Fleet page header (Figma Flow 4 "Header"): optional green "← Fleet" back
// link (add/edit pages), h2 title, one-line intro, and an optional action
// (Add car on the list) bottom-aligned with the intro, as in the design.
export default function FleetHeader({
  title,
  intro,
  back = true,
  children,
}: {
  title: string;
  intro: string;
  back?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-[min(100%,20rem)] flex-1 flex-col gap-1">
        {back && (
          <Link href="/admin/fleet" className="self-start type-ui text-brand hover:text-link-hover">
            ← Fleet
          </Link>
        )}
        <h1 className="type-h2 text-primary">{title}</h1>
        <p className="type-body-sm text-secondary">{intro}</p>
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}
