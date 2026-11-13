"use client";

import { useState, useTransition } from "react";
import { saveServiceItems } from "@/app/admin/journal-actions";
import Icon from "@/components/admin/Icon";
import { SERVICE_ITEMS } from "@/lib/journalTypes";

// "Due at this service" on the one-car view (Figma 4B.3): chips with a tick for
// each job due. "Edit" lists every job to switch on or off; each tap saves.
export default function ServiceChecklist({ carId, items }: { carId: string; items: string[] }) {
  const [picked, setPicked] = useState(items);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [saving, startSave] = useTransition();

  const toggle = (item: string) => {
    const next = picked.includes(item) ? picked.filter((x) => x !== item) : SERVICE_ITEMS.filter((x) => x === item || picked.includes(x));
    setPicked(next);
    setError("");
    startSave(async () => {
      const res = await saveServiceItems(carId, next);
      if (res?.error) {
        setError(res.error);
        setPicked(picked);
      }
    });
  };

  const chip = "flex items-center gap-1.5 rounded-full border px-3 py-1.5 type-body-sm";
  const shown = editing ? [...SERVICE_ITEMS] : picked;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <p className="flex-1 type-ui text-primary">Due at this service</p>
        <button type="button" onClick={() => setEditing((e) => !e)} className="type-body-sm text-link hover:text-link-hover">
          {editing ? (saving ? "Saving…" : "Done") : picked.length ? "Edit" : "Add"}
        </button>
      </div>
      {shown.length === 0 ? (
        <p className="type-body-sm text-secondary">Nothing listed yet. Add the jobs due, like engine oil or brakes.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {shown.map((item) => {
            const on = picked.includes(item);
            return (
              <li key={item}>
                {editing ? (
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(item)}
                    className={`${chip} ${on ? "border-brand bg-hover text-primary" : "border-gray-200 bg-layer text-secondary hover:bg-layer-hover"}`}
                  >
                    <Icon name={on ? "check" : "plus"} size={14} className={on ? "text-brand" : "text-[var(--icon-secondary)]"} />
                    {item}
                  </button>
                ) : (
                  <span className={`${chip} border-gray-200 bg-layer text-primary`}>
                    <Icon name="check" size={14} className="text-brand" />
                    {item}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="type-body-sm text-error">{error}</p>}
    </div>
  );
}
