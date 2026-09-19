"use client";

import { useEffect, useState } from "react";
import { inkDim, red, line, cardStyle, secondaryBtn, sectionLabel } from "../_components/shared";

type Me = { email: string; displayName: string } | null;

const PLACEHOLDER_ROWS = [
  { label: "Change display name", desc: "Update the name shown across the app." },
  { label: "Appearance", desc: "Theme and accent color." },
  { label: "Export data", desc: "Download your logs as a file." },
  { label: "Import data", desc: "Restore logs from a backup file." },
  { label: "Backup & sync", desc: "Automatic backups to cloud storage." },
  { label: "Delete account", desc: "Permanently remove your account and data." },
];

export default function ProfilePage() {
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(setMe);
  }, []);

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div>
      <div style={sectionLabel}>PROFILE</div>
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{me?.displayName || "—"}</div>
        <div style={{ fontSize: 13, color: inkDim }}>{me?.email ?? "Loading…"}</div>
      </div>

      <button onClick={logout} style={{ ...secondaryBtn, width: "100%", color: red, borderColor: red + "55", marginBottom: 20 }}>
        Log out
      </button>

      <div style={sectionLabel}>MORE (COMING SOON)</div>
      <div style={{ border: `1px solid ${line}` }}>
        {PLACEHOLDER_ROWS.map((row, idx) => (
          <div
            key={row.label}
            style={{
              padding: "10px 12px",
              borderBottom: idx < PLACEHOLDER_ROWS.length - 1 ? `1px solid ${line}` : "none",
              opacity: 0.5,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14 }}>{row.label}</span>
              <span style={{ fontSize: 10, color: inkDim, border: `1px solid ${line}`, padding: "1px 6px" }}>Coming soon</span>
            </div>
            <div style={{ fontSize: 12, color: inkDim, marginTop: 2 }}>{row.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
