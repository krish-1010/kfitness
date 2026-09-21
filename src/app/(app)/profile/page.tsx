"use client";

import { useEffect, useState } from "react";
import { useTheme, ACCENT_PRESETS } from "../_lib/ThemeContext";
import { useGoals } from "../_lib/GoalsContext";
import { TODAY } from "@/lib/date";

type Me = { email: string; displayName: string } | null;

export default function ProfilePage() {
  const [me, setMe] = useState<Me>(null);
  const { theme, accent, setTheme, setAccent } = useTheme();
  const { proteinGoal, kcalGoal, setProteinGoal, setKcalGoal } = useGoals();
  const [proteinInput, setProteinInput] = useState(String(proteinGoal));
  const [kcalInput, setKcalInput] = useState(String(kcalGoal));
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data: Me) => {
        setMe(data);
        setDisplayNameInput(data?.displayName ?? "");
      });
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

  const commitDisplayName = async () => {
    if (displayNameInput === me?.displayName) return;
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: displayNameInput }),
    });
    setMe((prev) => (prev ? { ...prev, displayName: displayNameInput } : prev));
  };

  const handleExport = async () => {
    const res = await fetch("/api/export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitr-export-${TODAY()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    await fetch("/api/me", { method: "DELETE" });
    window.location.href = "/login";
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

      <div className="section-label">ACCOUNT</div>
      <div className="card mb-3">
        <div className="text-[13px] text-muted-foreground mb-2">Display name</div>
        <input value={displayNameInput} onChange={(e) => setDisplayNameInput(e.target.value)} onBlur={commitDisplayName} className="input" />
      </div>

      <div className="border border-border mb-5">
        <button onClick={handleExport} className="list-row flex justify-between items-center w-full bg-transparent text-left">
          <div>
            <div className="text-sm">Export data</div>
            <div className="text-xs text-muted-foreground mt-0.5">Download a full JSON backup of everything in your account.</div>
          </div>
        </button>
        <button onClick={() => setShowDeleteConfirm(true)} className="list-row flex justify-between items-center w-full bg-transparent text-left">
          <div>
            <div className="text-sm text-destructive">Delete account</div>
            <div className="text-xs text-muted-foreground mt-0.5">Permanently remove your account and all logged data.</div>
          </div>
        </button>
      </div>

      {showDeleteConfirm && (
        <div onClick={() => setShowDeleteConfirm(false)} className="modal-overlay z-30">
          <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border max-w-[380px] w-full p-4">
            <div className="text-base font-semibold mb-2 text-destructive">Delete account</div>
            <div className="text-[13px] text-muted-foreground mb-3">
              This permanently deletes your account and every log — food, workouts, weights, supplements, all of it. This cannot be undone. Type your
              email (<span className="text-foreground">{me?.email}</span>) to confirm.
            </div>
            <input
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder="Type your email"
              className="input mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={!me || deleteConfirmInput !== me.email || deleting}
                className="flex-1 bg-destructive text-white border-none px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
