"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/admin/Icon";
import { Art, btnClass, Notice } from "./ui";

// Document and receipt photos (Figma 10.7–10.10, 10.12, 10.15, and trip
// receipts / meter photos). Tapping an Upload box opens the camera with a guide
// box (getUserMedia); for documents it checks blur and glare and takes the
// photo itself (10.8). When the phone blocks the camera we show "Camera is
// off" (10.9) with a gallery fallback; browsers without camera access get the
// phone's own camera via <input type="file" accept="image/*" capture="environment">.
// A photo that didn't upload stays on the phone for Try again (10.10).
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


/* ------------------------------ blur and glare ------------------------------ */

// Figma 10.8: the camera checks each frame for blur and glare and takes the
// photo itself once the paper is clear and still. A small grey copy of the
// frame is enough: sharpness = variance of the Laplacian, glare = share of
// blown-out pixels, steadiness = change from the last frame.
type Look = "none" | "clear" | "blurry" | "glare" | "moving";

const LOOK_TEXT: Record<Exclude<Look, "none">, string> = {
  clear: "Looks clear. Hold still",
  blurry: "A bit blurry. Hold the phone steady",
  glare: "Glare on it. Tilt it away from the light",
  moving: "Hold still",
};

const SAMPLE_W = 160;
const SHARP_MIN = 60; // Laplacian variance below this reads as blurry
const GLARE_SHARE = 0.03; // more than 3% blown-out pixels reads as glare
const STEADY_MAX = 8; // mean change per pixel between two samples
const CLEAR_SAMPLES = 3; // ~1 s of clear frames before the photo is taken

function lookAt(v: HTMLVideoElement, canvas: HTMLCanvasElement, prev: { gray: Float32Array | null }): Look {
  if (!v.videoWidth) return "none";
  const w = SAMPLE_W;
  const h = Math.max(1, Math.round((v.videoHeight * w) / v.videoWidth));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "none";
  ctx.drawImage(v, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  let blown = 0;
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    gray[i] = g;
    if (g >= 250) blown++;
  }
  let sum = 0;
  let sq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i];
      sum += lap;
      sq += lap * lap;
      n++;
    }
  const sharp = n ? sq / n - (sum / n) ** 2 : 0;
  let moved = 0;
  if (prev.gray && prev.gray.length === gray.length) {
    for (let i = 0; i < gray.length; i++) moved += Math.abs(gray[i] - prev.gray[i]);
    moved /= gray.length;
  }
  const first = !prev.gray;
  prev.gray = gray;
  if (blown / gray.length > GLARE_SHARE) return "glare";
  if (sharp < SHARP_MIN) return "blurry";
  if (first || moved > STEADY_MAX) return "moving";
  return "clear";
}

/* ---------------------------------- camera ---------------------------------- */

function CameraView({
  title,
  guide,
  sides,
  onDone,
  onClose,
  allowPdf,
  page,
  check = false,
}: {
  title: string;
  guide: string;
  sides: number;
  onDone: (file: File) => void;
  onClose: () => void;
  allowPdf?: boolean;
  page?: string; // screen the camera opened from, for "Camera is off" (10.9)
  check?: boolean; // documents: blur/glare check and auto photo (10.8)
}) {
  const video = useRef<HTMLVideoElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const native = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"starting" | "live" | "blocked" | "native">("starting");
  const [shots, setShots] = useState<HTMLCanvasElement[]>([]);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [look, setLook] = useState<Look>("none");
  const snapRef = useRef<() => void>(() => {});

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

  // 10.8: watch the frames; after ~1 s of a clear, still paper, take the photo.
  useEffect(() => {
    if (!check || state !== "live" || busy) return;
    const canvas = document.createElement("canvas");
    const prev: { gray: Float32Array | null } = { gray: null };
    let clear = 0;
    const t = setInterval(() => {
      const v = video.current;
      if (!v) return;
      let l: Look = "none";
      try {
        l = lookAt(v, canvas, prev);
      } catch {
        return; // a frame we can't read: skip it
      }
      setLook(l);
      clear = l === "clear" ? clear + 1 : 0;
      if (clear >= CLEAR_SAMPLES) {
        clear = 0;
        prev.gray = null;
        snapRef.current();
      }
    }, 350);
    return () => clearInterval(t);
  }, [check, state, busy, shots.length]);

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
    if (!v || !v.videoWidth || busy) return;
    const c = document.createElement("canvas");
    const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    const next = [...shots, c];
    setLook("none");
    if (next.length >= sides) void finish(next);
    else setShots(next);
  }
  useEffect(() => {
    snapRef.current = snap;
  });

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

  // 10.9 Camera is off — from 10.7 or 10.12; two ways forward, nothing lost.
  if (state === "blocked")
    return (
      <div role="dialog" aria-modal="true" aria-label="Camera is off" className="fixed inset-0 z-50 overflow-y-auto bg-gray-50">
        <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col gap-[20px] px-[20px] pt-[max(env(safe-area-inset-top),6px)] pb-[24px]">
          <div className="flex min-h-[24px] items-center gap-[12px]">
            <button type="button" onClick={onClose} aria-label="Back" className="-m-[13px] grid size-[48px] shrink-0 place-items-center text-primary">
              <Icon name="arrow-left" size={22} />
            </button>
            <h2 className="min-w-0 flex-1 type-h4 text-primary">{page ?? title.split(" · ")[0]}</h2>
          </div>
          <Art name="waiting-illustration" />
          <div className="flex flex-col gap-[8px]">
            <p className="type-h4 text-primary">Camera is off for this app</p>
            <p className="type-body-sm text-secondary">Turn it on in phone settings to take document photos. Or pick photos you already have.</p>
          </div>
          <div className="min-h-[12px] flex-1" />
          {/* A website can't open the phone's settings, so we say where the switch is and ask again. */}
          <p className="type-body-sm text-secondary">Phone settings → Apps → your browser → Permissions → Camera → Allow.</p>
          <button
            type="button"
            className={btnClass("primary")}
            onClick={() => {
              setState("starting");
              setAttempt((n) => n + 1);
            }}
          >
            Try the camera again
          </button>
          <button type="button" className={btnClass("secondary")} onClick={() => gallery.current?.click()} disabled={busy}>
            Pick from gallery
          </button>
          {inputs}
        </div>
      </div>
    );

  const tip = look === "none" ? null : LOOK_TEXT[look];

  // 10.8 Photo of a document
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 overflow-y-auto bg-brand-secondary">
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col gap-[18px] px-[20px] pt-[max(env(safe-area-inset-top),6px)] pb-[24px]">
        <div className="flex min-h-[24px] items-center gap-[12px]">
          <button type="button" onClick={onClose} aria-label="Close camera" className="-m-[13px] grid size-[48px] shrink-0 place-items-center text-on-color">
            <Icon name="x" size={22} />
          </button>
          <h2 className="min-w-0 flex-1 type-h4 text-on-color">{sides > 1 && shots.length ? title.replace("front", "back") : title}</h2>
        </div>
        <div className="h-[60px] shrink-0" aria-hidden="true" />
        <div className="relative aspect-[348/240] w-full shrink-0 overflow-hidden">
          <video ref={video} playsInline muted className="absolute inset-0 size-full object-cover" />
          {/* Guide box corners */}
          <span className="absolute top-0 left-0 size-[30px] border-t-[4px] border-l-[4px] border-brand" />
          <span className="absolute top-0 right-0 size-[30px] border-t-[4px] border-r-[4px] border-brand" />
          <span className="absolute bottom-0 left-0 size-[30px] border-b-[4px] border-l-[4px] border-brand" />
          <span className="absolute right-0 bottom-0 size-[30px] border-r-[4px] border-b-[4px] border-brand" />
          {state === "starting" && <p className="absolute inset-0 grid place-items-center type-body-sm text-secondary-inverse">Opening the camera…</p>}
        </div>
        {check && tip && (
          <p
            role="status"
            className={`flex items-center gap-[6px] self-start rounded-full px-[14px] py-[6px] type-ui ${look === "clear" ? "bg-tag-green text-brand" : "bg-tag-amber text-tag-amber"}`}
          >
            <Icon name={look === "clear" ? "check-circle" : "warning-circle"} size={16} />
            {tip}
          </p>
        )}
        <p className="text-center type-body-sm text-on-color">{guide}</p>
        <div className="min-h-[12px] flex-1" />
        <div className="flex items-center justify-between px-[8px]">
          <button type="button" onClick={() => gallery.current?.click()} className="min-h-[48px] w-[70px] text-left type-ui text-on-color" disabled={busy}>
            Gallery
          </button>
          <button type="button" onClick={snap} disabled={state !== "live" || busy} aria-label="Take photo" className="grid size-[76px] place-items-center rounded-full disabled:opacity-50">
            {/* eslint-disable-next-line @next/next/no-img-element -- static shutter ring from the design */}
            <img src="/driver-art/camera-shutter.svg" alt="" width={76} height={76} className="block" />
          </button>
          <span className="w-[70px] text-right type-ui text-on-color">{sides > 1 ? `${Math.min(shots.length + 1, sides)} of ${sides}` : ""}</span>
        </div>
        {inputs}
      </div>
    </div>
  );
}

/* --------------------------------- upload box --------------------------------- */

// A group of upload boxes shares one "Photo didn't upload" notice (Figma 10.10)
// shown above the boxes; the failed box keeps the photo and sends it again
// when tapped, without opening the camera.
type Failed = { label: string } | null;
const UploadGroupCtx = createContext<{ failed: Failed; setFailed: (f: Failed) => void } | null>(null);

export function UploadGroup({ children }: { children: React.ReactNode }) {
  const [failed, setFailed] = useState<Failed>(null);
  return <UploadGroupCtx.Provider value={{ failed, setFailed }}>{children}</UploadGroupCtx.Provider>;
}

export function UploadFailedNotice() {
  const group = useContext(UploadGroupCtx);
  if (!group?.failed) return null;
  return (
    <Notice title="Photo didn’t upload">{`Your ${group.failed.label.toLowerCase()} photo is kept on this phone. Check the signal and tap Try again.`}</Notice>
  );
}

export type UploadBoxProps = {
  label: string;
  hint: string; // shown while empty
  doneHint?: string; // shown once a photo is there
  done?: boolean; // already uploaded on the server
  camera?: { title: string; guide: string; sides?: number; pdf?: boolean; page?: string; check?: boolean };
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
  const group = useContext(UploadGroupCtx);
  const formInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [taken, setTaken] = useState<string | null>(null); // "taken 3:55 AM"
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState<File | null>(null); // photo that didn't upload (10.10)
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

  function send(file: File) {
    if (!action) return;
    const at = new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields ?? {})) fd.set(k, v);
    fd.set("file", file);
    start(async () => {
      let res: Result;
      try {
        res = await action(fd);
      } catch {
        // No signal or the server didn't answer: keep the photo for Try again.
        setRetry(file);
        setError(null);
        group?.setFailed({ label });
        return;
      }
      if (res?.error) {
        setError(res.error);
        return;
      }
      setRetry(null);
      if (group?.failed?.label === label) group.setFailed(null);
      setTaken(`Taken ${at}`);
      onPhoto?.(true);
      router.refresh();
    });
  }

  function got(file: File) {
    setOpen(false);
    setError(null);
    if (name && formInput.current) {
      const at = new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
      const dt = new DataTransfer();
      dt.items.add(file);
      formInput.current.files = dt.files;
      setTaken(`Taken ${at}`);
      onPhoto?.(true);
      return;
    }
    send(file);
  }

  const failed = !!retry && !pending;
  const line = pending ? "Uploading…" : failed ? "Didn’t upload" : has ? (taken && doneHint ? `${doneHint} · ${taken.toLowerCase()}` : doneHint || taken || hint) : hint;

  return (
    <div className="flex w-full flex-col gap-[6px]">
      <button
        type="button"
        onClick={() => (failed && retry ? send(retry) : setOpen(true))}
        disabled={pending}
        className={`flex min-h-[64px] w-full items-center gap-[12px] rounded-md bg-layer py-[12px] pr-[16px] pl-[12px] text-left ${
          error || failed ? "border border-negative" : has ? "border border-gray-100" : "border border-dashed border-gray-200"
        }`}
      >
        <span className="grid size-[40px] shrink-0 place-items-center rounded-md bg-gray-50">
          <Icon name={failed ? "warning-circle" : has ? "file-text" : "upload-simple"} size={20} className={failed ? "text-negative" : has ? "text-helper" : "text-brand"} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate type-ui text-primary">{label}</span>
          <span className="truncate type-body-sm text-secondary">{line}</span>
        </span>
        {pending ? null : failed ? (
          <span className="type-ui text-link">Try again</span>
        ) : has ? (
          <Icon name="check-circle" size={20} className="text-brand" />
        ) : (
          <span className="type-ui text-link">Upload</span>
        )}
      </button>
      {name && <input ref={formInput} type="file" name={name} accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" />}
      {error && <p className="type-body-sm text-negative">{error}</p>}
      {open && (
        <CameraView
          title={camera?.title ?? label}
          guide={camera?.guide ?? "Fit it inside the box. Keep away from glare."}
          sides={camera?.sides ?? 1}
          allowPdf={camera?.pdf}
          page={camera?.page}
          check={camera?.check}
          onDone={got}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// Square photo tile for the 4 car photos (10.12).
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
      const res = await action(fd).catch(() => ({ error: "Didn’t upload" }));
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
        <span className={`type-ui ${done ? "text-primary" : "text-link"}`}>{pending ? "…" : label}</span>
      </button>
      {open && <CameraView title={`Car · ${side}`} guide="Fit the whole car side inside the box." sides={1} page="Car papers" onDone={got} onClose={() => setOpen(false)} />}
    </>
  );
}

// Any button that takes one photo and sends it to a Server Action (profile photo, 10.6).
export function CameraButton({
  action,
  fields,
  title,
  guide,
  className,
  children,
  page,
  check,
}: {
  action: (fd: FormData) => Promise<Result>;
  fields: Record<string, string>;
  title: string;
  guide: string;
  className?: string;
  children: React.ReactNode;
  page?: string;
  check?: boolean;
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
      const res = await action(fd).catch(() => ({ error: "The photo didn’t upload. Check the signal and try again." }));
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
      {open && <CameraView title={title} guide={guide} sides={1} page={page} check={check} onDone={got} onClose={() => setOpen(false)} />}
    </>
  );
}
