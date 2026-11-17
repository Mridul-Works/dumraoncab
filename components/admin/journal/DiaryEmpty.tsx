import { cardCls } from "@/components/admin/ui";

// Big illustrated message card for the Daily Diary: "No entries yet" (Figma
// 4B.4), "Couldn't load the Daily Diary" (4B.8) and "No trips in this range"
// (4B.9). `bare` drops the card (4B.9 sits straight on the page, 120px above
// and below on desktop).
const ART = {
  diary: "/admin-illustrations/no-trips.svg", // open book and pencil
  cone: "/admin-illustrations/publish-failed.svg", // traffic cone
} as const;

export default function DiaryEmpty({
  art,
  title,
  children,
  actions,
  bare,
  role,
  className = "",
}: {
  art: keyof typeof ART;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  bare?: boolean;
  role?: "alert";
  className?: string;
}) {
  return (
    <section role={role} className={`flex flex-col items-center ${bare ? "py-10 md:py-30" : `py-[72px] ${cardCls}`} ${className}`}>
      <div className="flex w-full max-w-[520px] flex-col items-center gap-2 px-6 py-10 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static line-art SVG from the design */}
        <img src={ART[art]} alt="" width={240} height={160} className="h-40 w-60" />
        <span aria-hidden="true" className="h-3" />
        <h2 className="type-h3 text-primary">{title}</h2>
        <p className="type-body-md text-secondary">{children}</p>
        {actions && <div className="flex flex-wrap justify-center gap-3 pt-4">{actions}</div>}
      </div>
    </section>
  );
}
