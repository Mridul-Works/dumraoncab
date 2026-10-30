import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { colors } from "@/lib/designTokens";

export const alt = "Dumraon Cab Service — cabs and car rental in Dumraon, Buxar, Bihar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: colors["background-primary"],
          color: colors["text-primary"],
          padding: "0 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: 18,
              background: colors["chinkara-green-950"],
              color: colors["text-on-color"],
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            DC
          </div>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, color: colors["text-secondary"] }}>
            SINCE {site.foundedYear} · BUXAR, BIHAR
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 82, fontWeight: 800, marginTop: 44, lineHeight: 1.05 }}>
          Dumraon Cab Service
        </div>
        <div style={{ display: "flex", fontSize: 38, marginTop: 16, color: colors["text-secondary"] }}>
          Anywhere in Bihar.
          <span style={{ color: colors["text-brand"], marginLeft: 14, fontWeight: 700 }}>Any hour.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 48 }}>
          <div
            style={{
              display: "flex",
              padding: "14px 34px",
              borderRadius: 999,
              background: colors["chinkara-green-950"],
              color: colors["text-on-color"],
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            ☎ {site.phoneDisplay}
          </div>
          <div
            style={{
              display: "flex",
              padding: "14px 34px",
              borderRadius: 999,
              border: `2px solid ${colors["border-subtle-00"]}`,
              color: colors["text-brand"],
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            Open 24/7
          </div>
        </div>
      </div>
    ),
    size,
  );
}
