"use client";

// Figma "Share menu" (3B.6): popover from a Share button on a booking row, the
// booking drawer or the "Booking saved" page. Sends the trip on WhatsApp to the
// customer or the driver, or opens the A4 PDF slip. "Show fare" adds the ₹ total
// to the customer message and picks the PDF copy (customer copy with the fare,
// driver copy without). Messages are built on the server from lib/site.ts and
// passed in, so this stays presentational.

import { useState } from "react";
import Icon from "@/components/admin/Icon";
import { Toggle } from "@/components/admin/NewBookingParts";
import { menuCls, usePopover } from "./Pickers";
import { phoneShow } from "./format";

export type ShareData = {
  id: string;
  refLabel: string; // "DC-1083"
  name: string;
  phone: string; // customer's 10 digits, "" if none
  customerText: { withFare: string; withoutFare: string };
  driverText: string; // pickup, route and note — never the fare
  driverPhone?: string; // 10 digits when a driver is assigned
};

const wa = (digits: string, text: string) => `https://wa.me/${digits ? `91${digits}` : ""}?text=${encodeURIComponent(text)}`;
const optionCls = "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-layer-hover focus-visible:bg-layer-selected focus-visible:outline-none";

export function ShareMenuPanel({ data, onDone, className = "" }: { data: ShareData; onDone?: () => void; className?: string }) {
  const [showFare, setShowFare] = useState(true);
  const option = (icon: string, title: string, sub: string) => (
    <>
      <Icon name={icon} size={20} className="text-[var(--icon-primary)]" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate type-ui text-primary">{title}</span>
        <span className="truncate type-body-sm text-secondary">{sub}</span>
      </span>
    </>
  );
  return (
    <div role="menu" aria-label="Share booking" className={`${menuCls} w-[340px] max-w-[calc(100vw-2rem)] ${className}`}>
      <div className="flex flex-col gap-0.5 px-4 pb-2.5 pt-2">
        <p className="type-h4 text-primary">Share booking</p>
        <p className="truncate type-body-sm text-secondary">
          {data.refLabel}
          {data.name ? ` · ${data.name}` : ""}
        </p>
      </div>
      {data.phone ? (
        <a role="menuitem" href={wa(data.phone, showFare ? data.customerText.withFare : data.customerText.withoutFare)} target="_blank" rel="noreferrer" onClick={onDone} className={optionCls}>
          {option("whatsapp-logo", "Send to customer on WhatsApp", `+91 ${phoneShow(data.phone)}`)}
        </a>
      ) : (
        <span role="menuitem" aria-disabled="true" className={`${optionCls} cursor-not-allowed opacity-40 hover:bg-transparent`}>
          {option("whatsapp-logo", "Send to customer on WhatsApp", "No mobile number")}
        </span>
      )}
      <a role="menuitem" href={wa(data.driverPhone ?? "", data.driverText)} target="_blank" rel="noreferrer" onClick={onDone} className={optionCls}>
        {option("car-simple", "Send to driver on WhatsApp", "Pickup, route and note. No fare.")}
      </a>
      <a
        role="menuitem"
        href={`/admin/bookings/${data.id}/pdf?copy=${showFare ? "customer" : "driver"}`}
        target="_blank"
        rel="noreferrer"
        onClick={onDone}
        className={optionCls}
      >
        {option("download-simple", "Download PDF", "A4 booking slip")}
      </a>
      <div className="py-1.5">
        <div className="h-px bg-gray-100" />
      </div>
      <div className="flex items-center gap-3 px-4 py-2">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="type-ui text-primary">Show fare</span>
          <span className="type-body-sm text-secondary">Adds ₹ total to the message and PDF</span>
        </span>
        <Toggle on={showFare} onChange={setShowFare} label="Show fare" />
      </div>
    </div>
  );
}

// "Share on WhatsApp" text button with the menu above it (Booking saved page).
export function ShareButton({ data, className = "" }: { data: ShareData; className?: string }) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 type-ui text-link transition-colors hover:text-link-hover ${className}`}
      >
        <Icon name="whatsapp-logo" size={16} />
        Share on WhatsApp
      </button>
      {open && <ShareMenuPanel data={data} onDone={() => setOpen(false)} className="bottom-full right-0 mb-2" />}
    </div>
  );
}
