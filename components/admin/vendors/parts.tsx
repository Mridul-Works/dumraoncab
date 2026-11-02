import Icon from "@/components/admin/Icon";
import { VENDOR_KIND_LABELS, VENDOR_STATUS_LABELS, type DocBadge, type VendorKind, type VendorStatus } from "@/lib/vendorTypes";

// Small server-safe building blocks for the Vendors screens (Figma Flow 6).

const statusCls: Record<VendorStatus, string> = {
  pending: "bg-tag-amber text-tag-amber",
  approved: "bg-tag-green text-brand",
  suspended: "bg-tag-red text-error",
  rejected: "bg-tag-gray text-secondary",
};

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 type-body-sm ${statusCls[status]}`}>
      <Icon name="dot" size={6} />
      {VENDOR_STATUS_LABELS[status]}
    </span>
  );
}

export function KindTag({ kind }: { kind: VendorKind }) {
  return <span className="inline-flex whitespace-nowrap rounded-full bg-tag-gray px-2 py-px type-body-sm text-secondary">{VENDOR_KIND_LABELS[kind]}</span>;
}

const docTag: Record<DocBadge, { cls: string; icon: string; label: string }> = {
  verified: { cls: "bg-tag-green text-brand", icon: "check-circle-14", label: "Verified" },
  review: { cls: "bg-tag-amber text-tag-amber", icon: "warning-circle-14", label: "Needs review" },
  expiring: { cls: "bg-tag-amber text-tag-amber", icon: "warning-circle-14", label: "Expires soon" },
  expired: { cls: "bg-tag-red text-error", icon: "warning-circle-14", label: "Expired" },
  missing: { cls: "bg-tag-red text-error", icon: "warning-circle-14", label: "Missing" },
};

export function DocTag({ badge }: { badge: DocBadge }) {
  const t = docTag[badge];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full py-0.5 pl-2 pr-2.5 type-body-sm ${t.cls}`}>
      <Icon name={t.icon} size={14} />
      {t.label}
    </span>
  );
}

// Amber notice under a page header ("1 vendor is waiting for approval").
export function Notice({ title, children, action }: { title: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-tag-amber px-4 py-3.5 sm:flex-nowrap">
      <Icon name="warning-circle" size={20} className="text-tag-amber" />
      <div className="min-w-0 flex-1">
        <p className="type-ui text-primary">{title}</p>
        {children && <p className="type-body-sm text-secondary">{children}</p>}
      </div>
      {action}
    </div>
  );
}

// Figma "Illustration" (line art, 240×160) for empty, success and status states.
export type ArtName = "vendors" | "no-results" | "all-caught-up" | "something-went-wrong" | "vendor-paused" | "documents" | "vendor-approved";

export function Art({ name, className = "h-40 w-60" }: { name: ArtName; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- static line-art SVG
  return <img src={`/admin-art/${name}.svg`} alt="" width={240} height={160} className={`block shrink-0 ${className}`} />;
}

// Figma "Empty state": illustration, title, body and a button row.
export function EmptyBlock({ art, title, children, actions }: { art: ArtName; title: React.ReactNode; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <Art name={art} />
      <p className="mt-3 type-h3 text-primary">{title}</p>
      {children && <p className="max-w-[26rem] type-body-md text-secondary">{children}</p>}
      {actions && <div className="flex flex-wrap justify-center gap-3 pt-4">{actions}</div>}
    </div>
  );
}

// White status banner with a small illustration (Suspended 6.11, Rejected 6.16).
export function ArtBanner({ art, title, children }: { art: ArtName; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-100 bg-layer px-5 py-3">
      <Art name={art} className="hidden h-[60px] w-[90px] sm:block" />
      <div className="min-w-0 flex-1">
        <p className="type-ui text-primary">{title}</p>
        {children && <p className="type-body-sm text-secondary">{children}</p>}
      </div>
    </div>
  );
}

// Card with a 20px title — the base container on the vendor screens.
export function Card({ title, sub, action, children, className = "" }: { title?: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-3.5 rounded-lg border border-gray-100 bg-layer px-5 py-5 md:px-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            {title && <h2 className="type-h4 text-primary">{title}</h2>}
            {sub && <p className="mt-0.5 type-body-sm text-secondary">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
