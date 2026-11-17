"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/admin/Icon";
import RequestActions, { type RequestState } from "@/components/admin/RequestActions";
import { btnText, cardCls } from "@/components/admin/ui";
import { MAX_TRIES, setCallMark, useCallLog, type CallMark } from "@/components/admin/dashboard/callLog";
import { clockIST, useOutbox } from "@/components/admin/dashboard/connection";
import DashToast, { type DashToastMsg } from "@/components/admin/dashboard/DashToast";
import { REPLY_TARGET_MIN, dayLabel, duration, panelHref, route } from "@/components/admin/dashboard/format";
import { SENT_EVENT, sendChange, type PendingChange } from "@/components/admin/dashboard/outbox";
import { istDate, type Booking } from "@/lib/bookingTypes";

const statusKey = (id: string) => `status:${id}`;
const noteKey = (id: string) => `note:${id}`;

// "Needs a call back" (Figma 2.1 / 2.2 / 2.7 / 2.8 / 2.10 / 2.11).
// Call → the row asks how it went (No answer / Mark contacted). Mark contacted
// (or WhatsApp) takes the row out of the list with a 10 s Undo; offline, the
// change waits to send and the row says so. No answer counts the tries; after
// three the request leaves the list as Not reachable (noted on the booking).
export default function CallBackCard({
  rows,
  carNames,
  nowMs,
  today,
  receivedToday,
  handledToday,
}: {
  rows: Booking[]; // new requests, oldest first
  carNames: Record<string, string>; // carId → name, for the WhatsApp quote
  nowMs: number; // server time the page was built
  today: string; // IST "YYYY-MM-DD"
  receivedToday: number;
  handledToday: number;
}) {
  const router = useRouter();
  const calls = useCallLog();
  const outbox = useOutbox();
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState<DashToastMsg | null>(null);

  const hide = (id: string, on: boolean) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  // Queued changes that just went out (back online): keep those rows out of
  // the list while the page refreshes.
  useEffect(() => {
    const onSent = (e: Event) => {
      const ids = (e as CustomEvent<PendingChange[]>).detail
        .filter((c) => c.key.startsWith("status:") && c.body.status === "contacted")
        .map((c) => c.key.slice("status:".length));
      if (ids.length) setHidden((prev) => new Set([...prev, ...ids]));
    };
    window.addEventListener(SENT_EVENT, onSent);
    return () => window.removeEventListener(SENT_EVENT, onSent);
  }, []);

  const ids = rows.map((r) => r.id);
  const markOf = (id: string): CallMark => calls[id] ?? { tries: 0 };
  const sending = new Set(outbox.filter((c) => c.key.startsWith("status:") && c.body.status === "contacted").map((c) => c.key.slice("status:".length)));
  const visible = rows.filter((b) => !hidden.has(b.id) && markOf(b.id).tries < MAX_TRIES);
  const handled = handledToday + rows.filter((b) => hidden.has(b.id) && istDate(b.createdAt) === today).length;
  const say = (text: string, extra?: Partial<DashToastMsg>) => setToast((prev) => ({ id: (prev?.id ?? 0) + 1, text, ...extra }));
  const nowIso = () => new Date().toISOString();

  const stateOf = (b: Booking): RequestState => {
    if (sending.has(b.id)) return "sending";
    const m = markOf(b.id);
    if (m.calledAt) return "called";
    return m.tries > 0 ? "no-answer" : "waiting";
  };

  const call = (b: Booking) => setCallMark(b.id, { ...markOf(b.id), calledAt: nowIso() }, ids);

  const undo = (b: Booking) => {
    const name = b.name || "Customer";
    sendChange({ key: statusKey(b.id), label: `${name} back to New`, url: `/api/bookings/${b.id}`, body: { status: "new" } })
      .then(() => {
        // Back as it was right after the call (2.7).
        const m = markOf(b.id);
        setCallMark(b.id, { ...m, calledAt: m.calledAt ?? nowIso() }, ids);
        hide(b.id, false);
        router.refresh();
      })
      .catch(() => say(`Couldn’t undo for ${name}. Open the booking to change it.`, { tone: "error" }));
  };

  const markContacted = (b: Booking) => {
    const name = b.name || "Customer";
    hide(b.id, true);
    sendChange({ key: statusKey(b.id), label: `${name} marked Contacted`, url: `/api/bookings/${b.id}`, body: { status: "contacted" } })
      .then((r) => {
        if (r === "queued") {
          hide(b.id, false); // the row stays, marked "waiting to send"
          return;
        }
        router.refresh();
        say(`${name} marked Contacted`, { action: { label: "Undo", run: () => undo(b) } });
      })
      .catch(() => {
        hide(b.id, false);
        say(`Couldn’t mark ${name} as contacted. Try again.`, { tone: "error" });
      });
  };

  const noAnswer = (b: Booking) => {
    const tries = markOf(b.id).tries + 1;
    const at = nowIso();
    setCallMark(b.id, { tries, lastTry: at }, ids);
    if (tries < MAX_TRIES) return;
    // Third try: note it on the booking; it leaves the call-back list.
    const name = b.name || "Customer";
    const line = `Not reachable · ${MAX_TRIES} calls, no answer (last ${clockIST(at)}, ${dayLabel(istDate(at)).replace(/ 0/, " ")})`;
    sendChange({
      key: noteKey(b.id),
      label: `${name} marked Not reachable`,
      url: `/api/bookings/${b.id}`,
      body: { adminNote: b.adminNote ? `${b.adminNote}\n${line}` : line },
    }).catch(() => {});
    say(`${name} moved to Bookings as Not reachable`, {
      action: {
        label: "Undo",
        run: () => {
          setCallMark(b.id, { tries: tries - 1, lastTry: at }, ids);
          // Same key: replaces the note change if it is still waiting to send.
          sendChange({ key: noteKey(b.id), label: `${name} note restored`, url: `/api/bookings/${b.id}`, body: { adminNote: b.adminNote ?? "" } }).catch(() => {});
        },
      },
    });
  };

  const count = visible.length;
  return (
    <section className={cardCls}>
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 pb-4 pt-4.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="type-h4 text-primary">Needs a call back</h2>
          <span className="type-ui text-secondary">{count}</span>
          <span className="flex-1" />
          <span className="type-body-sm text-secondary">{count ? `Reply target: ${REPLY_TARGET_MIN} min` : `Target: reply within ${REPLY_TARGET_MIN} min`}</span>
        </div>
        {receivedToday > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between gap-2">
              <span className="type-body-sm text-secondary">Handled today</span>
              <span className={`type-ui ${handled >= receivedToday ? "text-brand" : "text-primary"}`}>
                {Math.min(handled, receivedToday)} of {receivedToday}
              </span>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="bg-brand transition-[width]" style={{ width: `${Math.min(1, handled / receivedToday) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static line-art SVG from the design */}
          <img src="/admin-illustrations/all-caught-up.svg" alt="" width={180} height={120} />
          <p className="type-h3 text-primary">All caught up</p>
          <p className="type-body-sm text-secondary">Every request today got a reply. New ones from the website appear here.</p>
        </div>
      ) : (
        <>
          <ul>
            {visible.slice(0, 4).map((b) => {
              const state = stateOf(b);
              const m = markOf(b.id);
              const wait = (nowMs - Date.parse(b.createdAt)) / 60000;
              const late = wait > REPLY_TARGET_MIN;
              const chip =
                state === "sending"
                  ? "Contacted · waiting to send"
                  : state === "called"
                    ? `called ${clockIST(m.calledAt)}`
                    : state === "no-answer"
                      ? `no answer · tried ${m.tries} of ${MAX_TRIES}${m.lastTry ? ` · ${clockIST(m.lastTry)}` : ""}`
                      : `waiting ${duration(wait)}`;
              const amber = state !== "waiting" || late;
              const sendingNow = state === "sending";
              // 2.7: the row that was just called stays highlighted until it is answered.
              // 2.10: a change waiting to send dims the whole row (buttons included) to 60 %.
              const rowTone = state === "called" ? "bg-hover" : sendingNow ? "opacity-60" : "hover:bg-layer-hover";
              return (
                <li key={b.id} className={`relative flex flex-wrap items-center gap-3 border-b border-gray-100 py-3 pl-5 pr-4 ${rowTone}`}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gray-100 text-[var(--icon-secondary)]">
                    <Icon name="user" size={18} />
                  </span>
                  <div className="min-w-48 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* The whole row opens the booking; the buttons sit above this link. */}
                      <Link href={panelHref(b)} className="type-ui text-primary after:absolute after:inset-0">
                        {b.name || "Unnamed"}
                      </Link>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full py-[3px] pl-2 pr-2.5 type-body-sm ${amber ? "bg-tag-amber text-tag-amber" : "bg-gray-50 text-secondary"}`}
                      >
                        <Icon name="clock" size={14} />
                        {chip}
                      </span>
                    </div>
                    <p className="mt-1 truncate type-body-sm text-secondary">
                      {route(b)}
                      {b.date ? ` · ${dayLabel(b.date).replace(/ 0/, " ")}` : ""}
                    </p>
                  </div>
                  {/* While the change waits to send the buttons look as usual (the row
                      is dimmed) but can't be used: `inert` takes them out of reach. */}
                  <div className="relative basis-full pl-12 sm:basis-auto sm:pl-0" inert={sendingNow} aria-disabled={sendingNow || undefined}>
                    <RequestActions
                      booking={b}
                      carName={b.carId ? carNames[b.carId] : undefined}
                      state={sendingNow ? "waiting" : state}
                      onCall={() => call(b)}
                      onWhatsApp={() => markContacted(b)}
                      onNoAnswer={() => noAnswer(b)}
                      onContacted={() => markContacted(b)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="px-5 pb-2.5 pt-2">
            <Link href="/admin/bookings?status=new" className={`${btnText} px-5 py-2.5`}>
              See all {count} new request{count === 1 ? "" : "s"}
            </Link>
          </div>
        </>
      )}
      {toast && <DashToast toast={toast} onClose={() => setToast(null)} />}
    </section>
  );
}
