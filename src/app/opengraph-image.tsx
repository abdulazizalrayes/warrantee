import { ImageResponse } from "next/og";

export const alt = "Warrantee - Trust the Terms";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1A1A2E 0%, #2d2d5e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#D4A853",
            marginBottom: 16,
            display: "flex",
          }}
        >
          Warrantee
        </div>
        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.7)",
            display: "flex",
          }}
        >
          Trust the Terms™
        </div>
        <div
          style={{
            fontSize: 20,
            color: "rgba(255,255,255,0.5)",
            marginTop: 24,
            display: "flex",
          }}
        >
          Bilingual Warranty Management for Saudi Construction
        </div>
      </div>
    ),
    { ...size }
  );
}
