import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/admin/Icon";
import { btnGhost, btnPrimary } from "@/components/admin/ui";
import { getCompany } from "@/lib/company";
import AuthShell from "../AuthShell";

export const metadata: Metadata = { title: "Reset your password" };

// "+919525802341" → "+91 95258 02341"
const intl = (raw: string, display: string) => (raw.startsWith("+91") ? `+91 ${display}` : display);

// Figma 1.5 Forgot password. There is no email service: staff passwords are set
// by the owner (ADMIN_PASSWORD on the server), so this screen puts staff in
// touch with the owner instead of pretending to send a reset link.
export default async function ForgotPasswordPage() {
  const company = await getCompany();
  const hours = company.hours?.trim();

  return (
    <AuthShell>
      <div className="flex flex-col gap-1.5">
        <h1 className="type-h2 text-primary">Reset your password</h1>
        <p className="type-body-md text-secondary">
          Only the owner can reset staff passwords. Call or WhatsApp and they will send you a new one in a few minutes.
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-md bg-gray-50 px-4 py-3.5">
        <Icon name="user" size={20} className="text-[var(--icon-secondary)]" />
        <div className="min-w-0 flex-1">
          <p className="type-ui text-primary">Owner · {company.name}</p>
          <p className="type-body-sm text-secondary">
            {intl(company.phone, company.phoneDisplay)}
            {hours ? ` · ${hours}` : ""}
          </p>
        </div>
      </div>
      <a href={`tel:${company.phone}`} className={`${btnPrimary} w-full`}>
        <Icon name="phone" />
        Call the owner
      </a>
      <a
        href={`https://wa.me/${company.whatsapp}?text=${encodeURIComponent("Hello, I can’t sign in to the Dumraon Cab admin. Please reset my password.")}`}
        target="_blank"
        rel="noreferrer"
        className={`${btnGhost} w-full`}
      >
        <Icon name="whatsapp-logo" />
        WhatsApp the owner
      </a>
      <Link href="/admin/login" className="flex items-center justify-center gap-1.5 type-ui text-link hover:text-link-hover">
        <Icon name="arrow-left" />
        Back to sign in
      </Link>
    </AuthShell>
  );
}
