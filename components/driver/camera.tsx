"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { Art, btnClass } from "./ui";

// Document and receipt photos (Figma 10.6, 10.7, 10.8, 10.23, 10.30, 10.32).
// Tapping an Upload box opens the camera with a guide box (getUserMedia). When
// the phone blocks the camera we show "Camera is off" with a gallery fallback;
// browsers without camera access get the phone's own camera via
// <input type="file" accept="image/*" capture="environment">.
// Photos are shrunk on the phone (max 1600 px JPEG) so uploads stay small.

type Result = { error?: string; ok?: boolean } | undefined;

const MAX_SIDE = 1600;

async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // decode() has the pixels; the URL can go.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function canvasToFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(new File([b], name, { type: "image/jpeg" })) : reject(new Error("photo"))), "image/jpeg", 0.85),
  );
}

// One or more images (front + back) → one JPEG, stacked, max 1600 px wide.
async function combine(sources: (HTMLCanvasElement | HTMLImageElement)[], name: string): Promise<File> {
  const dims = sources.map((s) => ({ w: s instanceof HTMLImageElement ? s.naturalWidth : s.width, h: s instanceof HTMLImageElement ? s.naturalHeight : s.height }));
  const width = Math.min(MAX_SIDE, Math.max(...dims.map((d) => d.w)));
  const heights = dims.map((d) => Math.round((d.h * width) / d.w));
  const scale = Math.min(1, (MAX_SIDE * sources.length) / heights.reduce((a, b) => a + b, 0));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(heights.reduce((a, b) => a + b, 0) * scale);
  const ctx = canvas.getContext("2d")!;
  let y = 0;
  sources.forEach((s, i) => {
    const h = Math.round(heights[i] * scale);
    ctx.drawImage(s, 0, y, canvas.width, h);
    y += h;
  });
  return canvasToFile(canvas, name);
}

async function shrink(files: File[], name: string): Promise<File> {
  if (files.length === 1 && files[0].type === "application/pdf") return files[0];
  try {
    return await combine(await Promise.all(files.map(loadImage)), name);
  } catch {
    return files[0]; // unknown format: let the server check it
  }
}

/* ---------------------------------- camera ---------------------------------- */

function CameraView({
  title,
  guide,
  sides,
  onDone,
  onClose,
  allowPdf,
}: {
  title: string;
  guide: string;
  sides: number;
  onDone: (file: File) => void;
  onClose: () => void;
  allowPdf?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const native = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"starting" | "live" | "blocked" | "native">("starting");
  const [shots, setShots] = useState<HTMLCanvasElement[]>([]);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setState("native");
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play().catch(() => {});
        }
        setState("live");
      } catch (err) {
        const name = (err as DOMException)?.name;
        setState(name === "NotAllowedError" || name === "SecurityError" ? "blocked" : "native");
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [attempt]);

  // No live camera in this browser: hand over to the phone's camera app.
  useEffect(() => {
    if (state === "native") native.current?.click();
  }, [state]);

  async function finish(parts: (HTMLCanvasElement | File)[]) {
    setBusy(true);
    try {
      const files = parts.filter((p): p is File => p instanceof File);
      const file = files.length === parts.length ? await shrink(files, "photo.jpg") : await combine(parts as HTMLCanvasElement[], "photo.jpg");
      onDone(file);
    } finally {
      setBusy(false);
    }
  }

  function snap() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    const next = [...shots, c];
    if (next.length >= sides) void finish(next);
    else setShots(next);
  }

  function picked(list: FileList | null) {
    const files = Array.from(list ?? []).slice(0, sides);
    if (files.length) void finish(files);
  }

  const accept = allowPdf ? "image/*,application/pdf" : "image/*";
  const inputs = (
    <>
      <input ref={gallery} type="file" accept={accept} multiple={sides > 1} className="sr-only" onChange={(e) => picked(e.target.files)} tabIndex={-1} aria-hidden="true" />
      <input
        ref={native}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => (e.target.files?.length ? picked(e.target.files) : onClose())}
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  );

  // 10.8 Camera is off
  if (state === "blocked")
    return (
      <div role="dialog" aria-modal="true" aria-label="Camera is off" className="fixed inset-0 z-50 overflow-y-auto bg-gray-50">
        <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col gap-[20px] px-[20px] pb-[24px] pt-[16px]">
          <div className="flex items-center gap-[12px]">
            <button type="button" onClick={onClose} aria-label="Back" className="-m-[13px] grid size-[48px] place-items-center text-primary">
              <Icon name="arrow-left" size={22} />
            </button>
            <h2 className="type-h4 text-primary">{title.split(" · ")[0]}</h2>
          </div>
          <Art name="waiting-illustration" />
          <div className="flex flex-col gap-[8px]">
            <p className="type-h4 text-primary">Camera is off for this app</p>
            <p className="type-body-md text-secondary">Turn it on in phone settings to take document photos. Or pick photos you already have.</p>
          </div>
          <div className="min-h-[12px] flex-1" />
          {/* A website can't open phone settings, so we say where the switch is and offer to ask again. */}
          <p className="type-body-sm text-secondary">Phone settings → Apps → your browser → Permissions → Camera → Allow.</p>
          <button type="button" className={btnClass("primary")} onClick={() => {
              setState("starting");
              setAttempt((n) => n + 1);
            }}>
            Try the camera again
          </button>
          <button type="button" className={btnClass("secondary")} onClick={() => gallery.current?.click()} disabled={busy}>
            Pick from gallery
          </button>
          {inputs}
        </div>
      </div>
    );

  // 10.7 Photo of a document
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 bg-gray-950">
      <div className="mx-auto flex h-dvh max-w-[430px] flex-col px-[20px] pb-[24px] pt-[16px]">
        <div className="flex items-center gap-[12px]">
          <button type="button" onClick={onClose} aria-label="Close camera" className="-m-[13px] grid size-[48px] place-items-center text-on-color">
            <Icon name="x" size={22} />
          </button>
          <h2 className="type-h4 text-on-color">{sides > 1 && shots.length ? title.replace("front", "back") : title}</h2>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-[16px]">
          <div className="relative aspect-[348/240] w-full overflow-hidden">
            <video ref={video} playsInline muted className="absolute inset-0 size-full object-cover" />
            {/* Guide box corners */}
            <span className="absolute left-0 top-0 size-[28px] border-l-[3px] border-t-[3px] border-brand" />
            <span className="absolute right-0 top-0 size-[28px] border-r-[3px] border-t-[3px] border-brand" />
            <span className="absolute bottom-0 left-0 size-[28px] border-b-[3px] border-l-[3px] border-brand" />
            <span className="absolute bottom-0 right-0 size-[28px] border-b-[3px] border-r-[3px] border-brand" />
            {state === "starting" && <p className="absolute inset-0 grid place-items-center type-body-sm text-secondary-inverse">Opening the camera…</p>}
          </div>
          <p className="type-body-sm text-on-color">{guide}</p>
        </div>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => gallery.current?.click()} className="min-h-[48px] min-w-[64px] text-left type-ui text-on-color" disabled={busy}>
            Gallery
          </button>
          <button
            type="button"
            onClick={snap}
            disabled={state !== "live" || busy}
            aria-label="Take photo"
            className="grid size-[72px] place-items-center rounded-full border-4 border-white disabled:opacity-50"
          >
            <span className="size-[56px] rounded-full bg-white" />
          </button>
          <span className="min-w-[64px] text-right type-ui text-on-color">{sides > 1 ? `${Math.min(shots.length + 1, sides)} of ${sides}` : ""}</span>
        </div>
        {inputs}
      </div>
    </div>
  );
}

/* -------------------------------- upload box -------------------------------- */

export type UploadBoxProps = {
  label: string;
  hint: string; // shown while empty
  doneHint?: string; // shown once a photo is there
  done?: boolean; // already uploaded on the server
  camera?: { title: string; guide: string; sides?: number; pdf?: boolean };
  // Either upload straight away with a Server Action …
  action?: (fd: FormData) => Promise<Result>;
  fields?: Record<string, string>;
  // … or carry the photo in the surrounding form under this field name.
  name?: string;
  required?: boolean;
  onPhoto?: (taken: boolean) => void;
};

export function UploadBox({ label, hint, doneHint, done, camera, action, fields, name, onPhoto }: UploadBoxProps) {
  const router = useRouter();
  const formInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [taken, setTaken] = useState<string | null>(null); // "taken 3:55 AM"
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const has = done || !!taken;

  // React resets a form after its Server Action runs; a photo carried in the
  // form is gone then, so show the box empty again.
  useEffect(() => {
    const form = name ? formInput.current?.form : null;
    if (!form) return;
    const clear = () => {
      setTaken(null);
      onPhoto?.(false);
    };
    form.addEventListener("reset", clear);
    return () => form.removeEventListener("reset", clear);
  }, [name, onPhoto]);

  function got(file: File) {
    setOpen(false);
    setError(null);
    const at = new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
    if (name && formInput.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      formInput.current.files = dt.files;
      setTaken(`Taken ${at}`);
      onPhoto?.(true);
      return;
    }
    if (!action) return;
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields ?? {})) fd.set(k, v);
    fd.set("file", file);
    start(async () => {
      const res = await action(fd);
      if (res?.error) setError(res.error);
      else {
        setTaken(`Taken ${at}`);
        onPhoto?.(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-[6px]">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className={`flex min-h-[64px] w-full items-center gap-[12px] rounded-md bg-layer py-[12px] pl-[12px] pr-[16px] text-left ${
          has ? "border border-gray-100" : "border border-dashed border-gray-200"
        } ${error ? "border-negative" : ""}`}
      >
        <span className="grid size-[40px] shrink-0 place-items-center rounded-md bg-gray-50">
          <Icon name={has ? "file-text" : "upload-simple"} size={20} className={has ? "text-helper" : "text-brand"} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate type-ui text-primary">{label}</span>
          <span className="truncate type-body-sm text-secondary">{pending ? "Uploading…" : has ? (taken && doneHint ? `${doneHint} · ${taken.toLowerCase()}` : doneHint || taken || hint) : hint}</span>
        </span>
        {has && !pending ? <Icon name="check-circle" size={20} className="text-brand" /> : <span className="type-ui text-link">{pending ? "" : "Upload"}</span>}
      </button>
      {name && <input ref={formInput} type="file" name={name} accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" />}
      {error && <p className="type-body-sm text-negative">{error}</p>}
      {open && (
        <CameraView
          title={camera?.title ?? label}
          guide={camera?.guide ?? "Fit it inside the box. Keep away from glare."}
          sides={camera?.sides ?? 1}
          allowPdf={camera?.pdf}
          onDone={got}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// Square photo tile for the 4 car photos (10.10).
export function PhotoTile({ side, done, action, fields }: { side: string; done: boolean; action: (fd: FormData) => Promise<Result>; fields: Record<string, string> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  const label = side[0].toUpperCase() + side.slice(1);

  function got(file: File) {
    setOpen(false);
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    fd.set("file", file);
    start(async () => {
      const res = await action(fd);
      setError(!!res?.error);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        aria-label={`${label} photo${done ? ", added" : ""}`}
        className={`flex h-[72px] min-w-0 flex-1 flex-col items-center justify-center gap-[6px] rounded-md ${
          done ? "bg-gray-100" : `border border-dashed bg-layer ${error ? "border-negative" : "border-gray-200"}`
        }`}
      >
        <Icon name={done ? "check-circle" : "camera"} size={22} className="text-brand" />
        <span className={`type-ui ${done ? "text-primary" : "text-brand"}`}>{pending ? "…" : label}</span>
      </button>
      {open && <CameraView title={`Car · ${side}`} guide="Fit the whole car side inside the box." sides={1} onDone={got} onClose={() => setOpen(false)} />}
    </>
  );
}

// Any button that takes one photo and sends it to a Server Action (profile photo, 10.5).
export function CameraButton({
  action,
  fields,
  title,
  guide,
  className,
  children,
}: {
  action: (fd: FormData) => Promise<Result>;
  fields: Record<string, string>;
  title: string;
  guide: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function got(file: File) {
    setOpen(false);
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    fd.set("file", file);
    start(async () => {
      const res = await action(fd);
      setError(res?.error ?? null);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={pending} className={className}>
        {pending ? "Uploading…" : children}
      </button>
      {error && <span className="type-body-sm text-negative">{error}</span>}
      {open && <CameraView title={title} guide={guide} sides={1} onDone={got} onClose={() => setOpen(false)} />}
    </>
  );
}
