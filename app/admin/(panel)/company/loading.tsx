import { btnPrimary, cardCls } from "@/components/admin/ui";

// Figma 8.7 · Company profile loading. The real header (Save greyed out) over
// the same two-column layout, with grey bars where the cards' text and fields go.

const bar = "rounded-full bg-gray-100";
const field = "h-[68px] rounded-[10px] bg-gray-100";

function Card({ title, rows, toggles = [] }: { title: string; rows: (1 | 2)[]; toggles?: boolean[] }) {
  return (
    <div className={`${cardCls} flex flex-col gap-4 p-6`}>
      <div className="flex flex-col gap-3.5 py-2">
        <div className={`h-3 ${title} ${bar}`} />
        <div className={`h-3 w-[220px] max-w-full ${bar}`} />
      </div>
      {rows.map((cols, i) =>
        cols === 2 ? (
          <div key={i} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className={field} />
            <div className={field} />
          </div>
        ) : (
          <div key={i} className={field} />
        ),
      )}
      {toggles.map((hint, i) => (
        <Toggle key={i} hint={hint} />
      ))}
    </div>
  );
}

export default function Loading() {
  return (
    <div role="status" aria-label="Loading company profile" className="flex flex-col gap-6 pb-24">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <h1 className="type-h1 text-primary">Company profile</h1>
          <p className="mt-1 type-body-md text-secondary">Shown on booking PDFs, WhatsApp messages and the website footer.</p>
        </div>
        <p className="type-body-sm text-secondary">Loading…</p>
        <button type="button" disabled className={`${btnPrimary} opacity-50`}>
          Save changes
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          {/* Brand: logo box, name + short name, tagline */}
          <Card title="w-[62px]" rows={[1, 2, 1]} />
          {/* Contact */}
          <div className={`${cardCls} flex flex-col gap-4 p-6`}>
            <div className="flex flex-col gap-3.5 py-2">
              <div className={`h-3 w-[85px] ${bar}`} />
              <div className={`h-3 w-[220px] max-w-full ${bar}`} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className={field} />
              <div className={field} />
            </div>
            <div className="h-5 w-[238px] max-w-full rounded-full bg-gray-100" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className={field} />
              <div className={field} />
            </div>
          </div>
          {/* Office */}
          <div className={`${cardCls} flex flex-col gap-4 p-6`}>
            <div className="flex flex-col gap-3.5 py-2">
              <div className={`h-3 w-[67px] ${bar}`} />
              <div className={`h-3 w-[220px] max-w-full ${bar}`} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div className={field} />
              <div className={field} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className={field} />
              <div className={field} />
              <div className={field} />
            </div>
            <Toggle hint />
          </div>
          <Card title="w-[200px]" rows={[2]} toggles={[false]} />
          <Card title="w-[103px]" rows={[2]} toggles={[true]} />
          {/* PDFs and messages: terms box, sign-off */}
          <div className={`${cardCls} flex flex-col gap-4 p-6`}>
            <div className="flex flex-col gap-3.5 py-2">
              <div className={`h-3 w-[170px] ${bar}`} />
              <div className={`h-3 w-[220px] max-w-full ${bar}`} />
            </div>
            {/* Terms: label, then the outlined text box with one line in it */}
            <div className="flex flex-col gap-2">
              <div className={`h-3 w-[150px] ${bar}`} />
              <div className="h-24 rounded-[10px] border border-gray-100 p-3.5">
                <div className={`h-3 w-[220px] max-w-full ${bar}`} />
              </div>
            </div>
            <div className={field} />
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:sticky lg:top-8">
          <div className={`${cardCls} flex flex-col gap-3 p-6`}>
            <div className="flex items-center gap-2 py-1.5">
              <div className={`h-3 w-[140px] ${bar}`} />
              <span className="flex-1" />
              <div className={`h-3 w-10 ${bar}`} />
            </div>
            <div className="h-1.5 rounded-full bg-gray-100" />
            {[70, 80, 64, 150, 90, 130].map((w) => (
              <div key={w} className="flex items-center gap-2.5 py-0.5">
                <div className="size-4 shrink-0 rounded-full bg-gray-100" />
                <div className={`h-3 ${bar}`} style={{ width: w }} />
              </div>
            ))}
          </div>
          <div className={`${cardCls} flex flex-col gap-3.5 p-6`}>
            <div className={`my-1.5 h-3 w-[150px] ${bar}`} />
            <div className={`h-3 w-[90px] ${bar}`} />
            <div className="flex flex-col gap-2.5 rounded-md border border-gray-100 p-4">
              <div className="flex items-center gap-2.5">
                <div className="size-9 shrink-0 rounded-md bg-gray-100" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className={`h-3 w-[140px] ${bar}`} />
                  <div className={`h-3 w-[200px] max-w-full ${bar}`} />
                </div>
              </div>
              <div className={`h-3 w-[240px] max-w-full ${bar}`} />
            </div>
            <div className={`h-3 w-[120px] ${bar}`} />
            <div className="flex flex-col gap-2 rounded-md bg-gray-50 p-3.5">
              <div className={`h-3 w-[220px] max-w-full ${bar}`} />
              <div className={`h-3 w-[220px] max-w-full ${bar}`} />
            </div>
            <div className={`h-3 w-[100px] ${bar}`} />
            <div className={`h-3 w-[220px] max-w-full ${bar}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ hint = false }: { hint?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-gray-50 p-3.5">
      <div className="flex flex-1 flex-col gap-2 py-1">
        <div className={`h-3 w-[173px] max-w-full ${bar}`} />
        {hint && <div className={`h-3 w-[220px] max-w-full ${bar}`} />}
      </div>
      <div className="h-5 w-9 shrink-0 rounded-full bg-gray-100" />
    </div>
  );
}
