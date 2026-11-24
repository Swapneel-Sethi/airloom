import { ImageResponse } from "next/og";
import { SITE } from "@/lib/constants";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Airloom, urban air quality intelligence";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#070707",
          color: "#f4f3f0",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
            <path
              d="M4 26c5.5 0 6.8-11 12.3-11s6.9 11 12.4 11c2.6 0 4.6-2.2 5.3-4.4"
              stroke="#f4f3f0"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="20" cy="15" r="2.6" fill="#00d084" />
          </svg>
          <span style={{ fontSize: 30, letterSpacing: "-0.01em" }}>Airloom</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              fontSize: 76,
              lineHeight: 1.02,
              letterSpacing: "-0.045em",
              maxWidth: 880,
            }}
          >
            Breathe smarter through polluted days.
          </div>
          <div style={{ fontSize: 26, color: "#8f8f8b", maxWidth: 780, lineHeight: 1.4 }}>
            A personalized daily plan from the hourly air quality forecast. Exposure, indoor air,
            commute comparison, and a grounded assistant.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid #262626",
            paddingTop: 22,
            fontSize: 20,
            color: "#8f8f8b",
          }}
        >
          <span>Open-Meteo model data</span>
          <span>{new URL(SITE.url).host}</span>
        </div>
      </div>
    ),
    size,
  );
}
