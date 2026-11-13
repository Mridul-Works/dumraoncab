import Icon from "@/components/admin/Icon";
import { btnGhost } from "@/components/admin/ui";
import type { Range } from "@/lib/analytics";
import RangeSwitch from "./RangeSwitch";

// Analytics page header (Figma 7.1): title, range line, range switch and the
// Export slot. Shown straight away, also while the numbers load (7.8) or when
// they couldn't load (7.6).

export default function AnalyticsHeader({ range, today, children }: { range: Range; today: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="min-w-[min(100%,16rem)] flex-1">
        <h1 className="type-h1 text-primary">Analytics</h1>
        <p className="mt-1 type-body-md text-secondary">
          {range.label}
          {range.compare && ` · compared with ${range.prevLabel}`}
        </p>
      </div>
      <RangeSwitch key={`${range.key}-${range.from}-${range.to}-${range.compare}`} current={range.key} from={range.from} to={range.to} compare={range.compare} today={today} />
      {children ?? <ExportPlaceholder />}
    </div>
  );
}

// Export button with nothing behind it yet (numbers still loading or failed).
export function ExportPlaceholder() {
  return (
    <span aria-disabled="true" className={`${btnGhost} cursor-default`}>
      <Icon name="download-simple" size={16} />
      Export
    </span>
  );
}
