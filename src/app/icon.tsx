import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Generated at build/request time via next/og — no binary asset to manage.
// Simple monogram, not commissioned art: matches the app's dark/amber theme.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#15140F",
        }}
      >
        <div
          style={{
            fontSize: 220,
            fontWeight: 700,
            color: "#D4922C",
            fontFamily: "sans-serif",
          }}
        >
          CT
        </div>
      </div>
    ),
    { ...size }
  );
}
