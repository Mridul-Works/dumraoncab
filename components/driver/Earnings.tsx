import { Tag, type TagTone } from "./ui";

// Pieces of the Earnings screen (Figma 10.48–10.50). Server-safe, no hooks.

// White card (or the amber "cash to hand over" card) with a label, one line
// of value and a tag on the right: Cash with you, Last payout.
export function InfoCard({
  label,
  value,
  tag,
  tagTone = "green",
  tone = "white",
}: {
  label: string;
  value: React.ReactNode;
  tag?: string;
  tagTone?: TagTone;
  tone?: "white" | "amber";
}) {
  return (
    <div className={`flex w-full items-center gap-[12px] rounded-lg p-[18px] ${tone === "amber" ? "bg-tag-amber" : "border border-gray-100 bg-layer"}`}>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="type-body-sm text-secondary">{label}</span>
        <span className="type-ui text-primary">{value}</span>
      </div>
      {tag && <Tag tone={tagTone}>{tag}</Tag>}
    </div>
  );
}

// One trip in the week list: route + day on the left, the share (or a status
// tag while the office checks it) on the right.
export type EarningRow = { id: string; title: string; day: string; amount?: string; status?: string };

export function TripList({ rows }: { rows: EarningRow[] }) {
  return (
    <div className="flex w-full flex-col rounded-lg border border-gray-100 bg-layer p-[18px]">
      {rows.map((r, i) => (
        <div key={r.id} className={`flex items-center gap-[12px] py-[12px] ${i ? "border-t border-gray-100" : ""}`}>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="type-ui text-primary">{r.title}</span>
            <span className="type-body-sm text-secondary">{r.day}</span>
          </div>
          {r.amount ? <span className="type-ui text-primary">{r.amount}</span> : <Tag tone="amber">{r.status}</Tag>}
        </div>
      ))}
    </div>
  );
}
