"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { clockIST, useOnline, useOutbox } from "@/components/admin/dashboard/connection";
import { CONNECTION_SLOT_ID, flushOutbox, type PendingChange } from "@/components/admin/dashboard/outbox";

const RETRY_MS = 30_000;
const BACK_ONLINE_MS = 10_000;

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

// App-wide connection notice (Figma 2.10 Offline / 2.12 Back online).
// Offline: shows when the page last loaded and what is waiting to send; the
// queue is retried every 30 s. Back online: lists what went out, refreshes
// the page data, and clears itself after 10 s.
//
// Mount once in the admin layout. A page can choose where the notice sits by
// rendering <div id="admin-connection-slot" /> (the Dashboard puts it under
// its header); otherwise it renders where it is mounted.
export default function ConnectionBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const online = useOnline();
  const pending = useOutbox();
  const lastLoad = useRef(0);
  const [offlineSince, setOfflineSince] = useState<number | null>(null);
  const [back, setBack] = useState<{ sent: PendingChange[]; at: number } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Each page shown while online counts as "what loaded".
  useEffect(() => {
    if (navigator.onLine) lastLoad.current = Date.now();
  }, [pathname]);

  useEffect(() => {
    const showBack = (sent: PendingChange[]) => {
      setBack({ sent, at: Date.now() });
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setBack(null), BACK_ONLINE_MS);
      router.refresh();
    };
    const goOffline = () => {
      setBack(null);
      setOfflineSince(lastLoad.current || Date.now());
    };
    const goOnline = () => {
      setOfflineSince(null);
      flushOutbox().then(showBack);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    // Left over from an earlier visit: send it now.
    if (navigator.onLine)
      flushOutbox().then((sent) => {
        if (sent.length) showBack(sent);
      });
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      clearTimeout(hideTimer.current);
    };
  }, [router]);

  // While offline, try the queue every 30 s (navigator.onLine can lag).
  useEffect(() => {
    if (online) return;
    const t = setInterval(() => {
      flushOutbox().then((sent) => {
        if (!sent.length) return;
        setOfflineSince(null);
        setBack({ sent, at: Date.now() });
        router.refresh();
      });
    }, RETRY_MS);
    return () => clearInterval(t);
  }, [online, router]);

  let notice: React.ReactNode = null;
  if (!online) {
    const loadedAt = offlineSince;
    const n = pending.length;
    notice = (
      <Notice tone="offline" title="You’re offline">
        {loadedAt ? `Showing what loaded at ${clockIST(loadedAt)}. ` : "Showing what loaded last. "}
        {n
          ? `${n} ${plural(n, "change is", "changes are")} waiting to send: ${pending.map((c) => c.label).join("; ")}. ${plural(n, "It sends by itself", "They send by themselves")} when you’re back; retrying every 30 s.`
          : "Changes you make wait here and send by themselves when you’re back."}
      </Notice>
    );
  } else if (back) {
    const n = back.sent.length;
    notice = (
      <Notice tone="online" title="Back online" onClose={() => setBack(null)}>
        {n ? `${n} ${plural(n, "change", "changes")} sent: ${back.sent.map((c) => c.label).join("; ")}. ` : ""}
        Everything is up to date as of {clockIST(back.at)}.
      </Notice>
    );
  }

  if (!notice) return null;
  // Only ever shown after an event in the browser, so the DOM is there.
  const slot = document.getElementById(CONNECTION_SLOT_ID);
  return slot ? createPortal(notice, slot) : <div className="mb-5">{notice}</div>;
}

function Notice({ tone, title, children, onClose }: { tone: "offline" | "online"; title: string; children: React.ReactNode; onClose?: () => void }) {
  const offline = tone === "offline";
  return (
    <div
      role={offline ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg px-4 py-3 [animation:pop_.15s_ease-out] ${offline ? "bg-tag-amber" : "bg-tag-green"}`}
    >
      <Icon name={offline ? "warning-circle" : "check-circle"} size={16} className={`mt-0.5 ${offline ? "text-tag-amber" : "text-brand"}`} />
      <div className="min-w-0 flex-1">
        <p className={`type-body-sm ${offline ? "text-tag-amber" : "text-brand"}`}>{title}</p>
        <p className="type-ui text-primary">{children}</p>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss" className="grid shrink-0 place-items-center rounded-full p-0.5 text-[var(--icon-secondary)] hover:text-primary">
          <Icon name="x-16" size={16} />
        </button>
      )}
    </div>
  );
}
