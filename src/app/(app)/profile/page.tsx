"use client";

import { useEffect, useState } from "react";
import { useTheme, ACCENT_PRESETS } from "../_lib/ThemeContext";
import { useGoals } from "../_lib/GoalsContext";

type Me = { email: string; displayName: string } | null;

const PLACEHOLDER_ROWS = [
  { label: "Change display name", desc: "Update the name shown across the app." },
  { label: "Export data", desc: "Download your logs as a file." },
  { label: "Import data", desc: "Restore logs from a backup file." },
  { label: "Backup & sync", desc: "Automatic backups to cloud storage." },
  { label: "Delete account", desc: "Permanently remove your account and data." },
];

export default function ProfilePage() {
  const [me, setMe] = useState<Me>(null);
  const { theme, accent, setTheme, setAccent } = useTheme();
  const { proteinGoal, kcalGoal, setProteinGoal, setKcalGoal } = useGoals();
  const [proteinInput, setProteinInput] = useState(String(proteinGoal));
  const [kcalInput, setKcalInput] = useState(String(kcalGoal));

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(setMe);
  }, []);

  // Keep the free-typed inputs in sync when the loaded/saved goal changes
  // (e.g. the initial async settings fetch resolving after mount).
  useEffect(() => setProteinInput(String(proteinGoal)), [proteinGoal]);
  useEffect(() => setKcalInput(String(kcalGoal)), [kcalGoal]);

  const commitProteinGoal = () => {
    const n = parseInt(proteinInput);
    if (Number.isFinite(n) && n > 0) setProteinGoal(n);
    else setProteinInput(String(proteinGoal));
  };

  const commitKcalGoal = () => {
    const n = parseInt(kcalInput);
    if (Number.isFinite(n) && n > 0) setKcalGoal(n);
    else setKcalInput(String(kcalGoal));
  };

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div>
      <div className="section-label">PROFILE</div>
      <div className="card mb-4">
        <div className="text-base font-semibold mb-0.5">{me?.displayName || "—"}</div>
        <div className="text-[13px] text-muted-foreground">{me?.email ?? "Loading…"}</div>
      </div>

      <button onClick={logout} className="btn-secondary w-full text-destructive border-destructive/40 mb-5">
        Log out
      </button>

      <div className="section-label">APPEARANCE</div>
      <div className="card mb-5">
        <div className="text-[13px] text-muted-foreground mb-2">Theme</div>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTheme("dark")}
            className={`btn-secondary flex-1 ${theme === "dark" ? "border-primary text-primary" : ""}`}
          >
            Dark
          </button>
          <button
            onClick={() => setTheme("light")}
            className={`btn-secondary flex-1 ${theme === "light" ? "border-primary text-primary" : ""}`}
          >
            Light
          </button>
        </div>
        <div className="text-[13px] text-muted-foreground mb-2">Accent color</div>
        <div className="flex gap-2">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setAccent(preset.id)}
              title={preset.label}
              aria-label={preset.label}
              aria-pressed={accent === preset.id}
              className={`w-9 h-9 border-2 ${accent === preset.id ? "border-foreground" : "border-transparent"}`}
              style={{ background: preset.swatch }}
            />
          ))}
        </div>
      </div>

      <div className="section-label">GOALS</div>
      <div className="card mb-5">
        <div className="text-[13px] text-muted-foreground mb-2">Protein target (g)</div>
        <input
          type="number"
          value={proteinInput}
          onChange={(e) => setProteinInput(e.target.value)}
          onBlur={commitProteinGoal}
          className="input mb-4"
        />
        <div className="text-[13px] text-muted-foreground mb-2">Daily calories</div>
        <input
          type="number"
          value={kcalInput}
          onChange={(e) => setKcalInput(e.target.value)}
          onBlur={commitKcalGoal}
          className="input"
        />
      </div>

      <div className="section-label">MORE (COMING SOON)</div>
      <div className="border border-border">
        {PLACEHOLDER_ROWS.map((row) => (
          <div key={row.label} className="list-row opacity-50">
            <div className="flex justify-between items-center">
              <span className="text-sm">{row.label}</span>
              <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5">Coming soon</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{row.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
