import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/admin/Icon";
import { optimisableImage } from "@/lib/catalogTypes";

// Figma "Car card" (Cab Service Admin › 6:300): photo, name + rate, meta line,
// and a footer with the shown-on-site switch and an Edit link. Used by the
// fleet grid and by the live preview on the add/edit car form.

export const carMeta = (c: { type?: string; transmission?: string; fuel?: string; seats?: string }) =>
  [c.type || "Type", c.transmission || "Transmission", c.fuel || "Fuel", c.seats || "seats"].join(" · ");

// Figma "Toggle" (36×20). The artwork is the exported on/off asset.
export function ToggleArt({ on }: { on: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static design asset, fixed 36×20
    <img src={on ? "/admin-icons/toggle-on.svg" : "/admin-icons/toggle-off.svg"} alt="" width={36} height={20} className="block h-5 w-9 shrink-0" />
  );
}

export function CarPhotoPlaceholder() {
  return (
    <>
      <Icon name="car-simple-40" size={40} className="text-[var(--icon-secondary)]" />
      <span className="type-body-sm text-secondary">Car photo</span>
    </>
  );
}

export default function FleetCard({
  name,
  rate,
  meta,
  image,
  shown,
  href,
  toggle,
  badges,
  as: Tag = "div",
}: {
  name: string;
  rate: string;
  meta: string;
  image?: string;
  shown: boolean;
  href?: string; // edit page; omitted in the preview
  toggle?: React.ReactNode; // interactive switch; defaults to static art
  badges?: React.ReactNode; // status chips over the photo
  as?: "div" | "li";
}) {
  const photo = (
    <div className="relative flex h-[170px] flex-col items-center justify-center gap-1.5 overflow-hidden bg-layer-accent">
      {image ? (
        <Image src={image} alt="" fill sizes="(max-width: 640px) 92vw, 354px" unoptimized={!optimisableImage(image)} className="object-cover" />
      ) : (
        <CarPhotoPlaceholder />
      )}
      {badges && <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">{badges}</span>}
    </div>
  );
  const body = (
    <div className="flex flex-col gap-1.5 px-[18px] py-4">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate type-h4 text-primary">{name}</h3>
        <span className="shrink-0 whitespace-nowrap type-ui text-brand">{rate}</span>
      </div>
      <p className="truncate type-body-sm text-secondary">{meta}</p>
    </div>
  );

  return (
    <Tag className={`flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-layer transition-opacity ${shown ? "" : "opacity-60"}`}>
      {href ? (
        <Link href={href} className="block" aria-label={`Edit ${name}`}>
          {photo}
          {body}
        </Link>
      ) : (
        <>
          {photo}
          {body}
        </>
      )}
      <div className="flex items-center gap-2.5 border-t border-gray-100 px-[18px] py-3">
        {toggle ?? <ToggleArt on={shown} />}
        <span className="min-w-0 flex-1 type-body-sm text-primary">{shown ? "Shown on site" : "Hidden from site"}</span>
        {href ? (
          <Link href={href} className="rounded-full px-1 py-2.5 type-ui text-link transition-colors hover:text-link-hover">
            Edit
          </Link>
        ) : (
          <span className="px-1 py-2.5 type-ui text-link">Edit</span>
        )}
      </div>
    </Tag>
  );
}
