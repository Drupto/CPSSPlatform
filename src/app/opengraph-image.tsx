import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/seo";

export const runtime = "edge";
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default OpenGraph image — rendered dynamically at the edge.
 * Per-page OG images can be created by adding `opengraph-image.tsx`
 * files inside specific route segments.
 */
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
          alignItems: "flex-start",
          padding: "80px",
          background:
            "linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "#22d3ee",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
              fontWeight: 800,
              color: "#020617",
            }}
          >
            K
          </div>
          <div style={{ color: "#94a3b8", fontSize: "28px", fontWeight: 600 }}>
            {siteConfig.name}
          </div>
        </div>
        <div
          style={{
            color: "#ffffff",
            fontSize: "56px",
            fontWeight: 800,
            lineHeight: 1.15,
            maxWidth: "900px",
          }}
        >
          {siteConfig.tagline}
        </div>
        <div
          style={{
            color: "#94a3b8",
            fontSize: "28px",
            marginTop: "24px",
            maxWidth: "800px",
            lineHeight: 1.4,
          }}
        >
          Evidence-based CSCS exam prep. 30+ hours of video, 150+ practice
          questions, self-paced learning.
        </div>
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "40px",
          }}
        >
          {["30+ Hours of Video", "150+ Practice Questions", "Self-Paced"].map(
            (item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#22d3ee",
                  fontSize: "22px",
                  fontWeight: 600,
                }}
              >
                ✓ {item}
              </div>
            )
          )}
        </div>
      </div>
    ),
    size
  );
}