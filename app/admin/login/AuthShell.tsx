/* eslint-disable @next/next/no-img-element -- static line-art SVGs exported from the design */
import Link from "next/link";
import Icon from "@/components/admin/Icon";
import { site } from "@/lib/site";

// Figma "Flow 1 · Sign in" (1.1–1.3, 1.5): the route-map backdrop and the card
// frame (brand band, body, "Trouble signing in?" footer) shared by the sign-in
// and forgot-password screens. Every graphic is the SVG exported from Figma
// (public/admin-login/), placed at its frame position on the 1440×900 artboard.

const art = "/admin-login";

// One map label on the backdrop ("Dumraon · Pickup").
function Place({ title, detail, className }: { title: string; detail: string; className: string }) {
  return (
    <span
      className={`absolute flex gap-1.5 whitespace-nowrap rounded-full border border-gray-100 bg-layer px-3 py-1.5 shadow-[0_1px_0_0_var(--border-tertiary)] ${className}`}
    >
      <span className="type-ui text-primary">{title}</span>
      <span className="type-body-sm text-secondary">{detail}</span>
    </span>
  );
}

function Backdrop() {
  return (
    // Centred on the viewport like the 1440×900 frame; hidden on small screens.
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
      <div className="absolute left-1/2 top-1/2 h-[900px] w-[1440px] -translate-x-1/2 -translate-y-1/2">
        <img src={`${art}/dot-grid.svg`} alt="" width={1440} height={900} className="absolute left-0 top-0 max-w-none" />
        <img src={`${art}/ring-192.svg`} alt="" width={192} height={192} className="absolute left-[1194px] top-[104px] max-w-none" />
        <img src={`${art}/ring-112.svg`} alt="" width={112} height={112} className="absolute left-[1234px] top-[144px] max-w-none" />
        <img src={`${art}/route.svg`} alt="" width={1142} height={558} className="absolute left-[149px] top-[213px] max-w-none" />
        <img src={`${art}/driven.svg`} alt="" width={115.48} height={29.4} className="absolute left-[148.5px] top-[742.1px] max-w-none" />
        <img src={`${art}/halo.svg`} alt="" width={44} height={44} className="absolute left-[128px] top-[748px] max-w-none" />
        <img src={`${art}/start-pin.svg`} alt="" width={24} height={24} className="absolute left-[138px] top-[758px] max-w-none" />
        <img
          src={`${art}/car.svg`}
          alt=""
          width={76.043}
          height={33.759}
          className="absolute left-[220.7px] top-[751.85px] max-w-none -rotate-[28.28deg]"
        />
        <img src={`${art}/end-pin.svg`} alt="" width={34} height={44} className="absolute left-[1273px] top-[172px] max-w-none" />
        <Place title="Dumraon" detail="Pickup" className="left-[112px] top-[800px]" />
        <Place title="Patna Airport" detail="135 km" className="left-[1205px] top-[128px]" />
        <span className="absolute left-[184px] top-[659px] flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-100 bg-layer px-2.5 py-1 shadow-[0_1px_0_0_var(--border-tertiary)]">
          <img src={`${art}/ellipse.svg`} alt="" width={6} height={6} className="max-w-none" />
          <span className="type-body-sm text-secondary">On the way · DC-1083</span>
        </span>
      </div>
    </div>
  );
}

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center gap-5 overflow-hidden bg-gray-50 px-4 py-16">
      <Backdrop />
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-lg border border-gray-100 bg-layer shadow-[0_16px_48px_0_var(--shadow-md)]">
        {/* Brand band */}
        <div className="relative flex items-center gap-3 overflow-hidden border-b border-gray-100 bg-gray-50 px-5 py-5.5 sm:px-7">
          <img src={`${art}/band-dots.svg`} alt="" aria-hidden="true" width={450} height={52.92} className="pointer-events-none absolute left-0 top-0 max-w-none" />
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[460px] bg-linear-to-r from-gray-50 via-gray-50/90 via-45% to-gray-50/0" />
          <span className="relative grid size-11 shrink-0 place-items-center rounded-lg bg-brand type-h4 text-inverse">DC</span>
          <span className="relative min-w-0 flex-1">
            <span className="block type-ui text-primary">Dumraon Cab</span>
            <span className="block type-body-sm text-secondary">Admin console</span>
          </span>
          <span className="relative flex shrink-0 items-center gap-1.5 rounded-full border border-gray-100 bg-layer px-2.5 py-[5px] type-body-sm text-primary">
            <Icon name="lock-simple" size={14} className="text-[var(--icon-secondary)]" />
            Staff only
          </span>
        </div>

        <div className="flex flex-col gap-5 p-5 sm:p-7">{children}</div>

        <div className="flex items-center gap-2.5 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-7">
          <Icon name="phone" className="text-[var(--icon-secondary)]" />
          <p className="flex-1 type-body-sm text-secondary">Trouble signing in? Ask the owner to reset it.</p>
        </div>
      </div>
      <Link href="/" className="relative type-ui text-secondary hover:text-link-hover">
        ← Back to {site.name}
      </Link>
    </section>
  );
}
