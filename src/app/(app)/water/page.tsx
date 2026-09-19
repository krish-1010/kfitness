"use client";

import { useEffect, useState, useCallback } from "react";
import { useDate } from "../_lib/DateContext";
import { inkDim, green, amber, line, cardStyle, inputStyle, smallInputStyle, primaryBtn, secondaryBtn, sectionLabel, ProgressBar } from "../_components/shared";

type WaterEntry = { id: number; date: string; amountMl: number; createdAt: string };

const WATER_PRESETS = [500, 650, 850] as const;

export default function WaterPage() {
  const { date } = useDate();
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [waterTotal, setWaterTotal] = useState(0);
  const [waterTarget, setWaterTarget] = useState<number | null>(null);
  const [editingWaterTarget, setEditingWaterTarget] = useState(false);
  const [waterTargetInput, setWaterTargetInput] = useState("");
  const [customWaterMl, setCustomWaterMl] = useState("");
  const [loading, setLoading] = useState(true);

  const loadWater = useCallback(async (d: string) => {
    const res = await fetch(`/api/water?date=${d}`);
    const data = await res.json();
    setWaterEntries(data.entries);
    setWaterTotal(data.total);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadWater(date).finally(() => setLoading(false));
  }, [date, loadWater]);

  // Water target is a global setting, not date-scoped, so it loads once.
  useEffect(() => {
    fetch("/api/settings?key=water_target_ml")
      .then((r) => r.json())
      .then((data) => setWaterTarget(data.value ? parseInt(data.value) : 3000));
  }, []);

  const saveWaterTarget = async () => {
    const ml = parseInt(waterTargetInput);
    if (!Number.isFinite(ml) || ml <= 0) return;
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "water_target_ml", value: String(ml) }),
    });
    setWaterTarget(ml);
    setEditingWaterTarget(false);
  };

  const logWater = async (amountMl: number) => {
    if (!amountMl || amountMl <= 0) return;
    const res = await fetch("/api/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, amountMl }),
    });
    const entry: WaterEntry = await res.json();
    setWaterEntries((prev) => [...prev, entry]);
    setWaterTotal((prev) => prev + amountMl);
    setCustomWaterMl("");
  };

  const removeWater = async (id: number) => {
    const entry = waterEntries.find((w) => w.id === id);
    setWaterEntries((prev) => prev.filter((w) => w.id !== id));
    if (entry) setWaterTotal((prev) => prev - entry.amountMl);
    await fetch(`/api/water/${id}`, { method: "DELETE" });
  };

  if (loading) {
    return (
      <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center", color: inkDim }}>
        Loading…
      </div>
    );
  }

  return (
    <div>
      <div style={{ ...sectionLabel, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          WATER · {(waterTotal / 1000).toFixed(2)}L{waterTarget ? ` / ${(waterTarget / 1000).toFixed(1)}L` : ""} today
        </span>
        {!editingWaterTarget && waterTarget !== null && (
          <button
            onClick={() => {
              setWaterTargetInput(String(waterTarget));
              setEditingWaterTarget(true);
            }}
            style={{ background: "none", border: "none", color: inkDim, fontSize: 11, textDecoration: "underline", padding: 0 }}
          >
            edit target
          </button>
        )}
      </div>
      {editingWaterTarget && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input
            type="number"
            value={waterTargetInput}
            onChange={(e) => setWaterTargetInput(e.target.value)}
            placeholder="Target ml"
            style={{ ...smallInputStyle, flex: 1 }}
          />
          <button onClick={saveWaterTarget} style={{ ...primaryBtn, padding: "6px 12px", fontSize: 12 }}>
            Save
          </button>
          <button onClick={() => setEditingWaterTarget(false)} style={{ ...secondaryBtn, padding: "6px 12px", fontSize: 12 }}>
            Cancel
          </button>
        </div>
      )}
      <div style={cardStyle}>
        {waterTarget !== null && (
          <div style={{ marginBottom: 10 }}>
            <ProgressBar value={waterTotal} goal={waterTarget} color={waterTotal >= waterTarget ? green : amber} />
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {WATER_PRESETS.map((ml) => (
            <button key={ml} onClick={() => logWater(ml)} style={{ ...secondaryBtn, flex: 1, textAlign: "center" }}>
              +{ml}ml
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="Custom ml"
            type="number"
            value={customWaterMl}
            onChange={(e) => setCustomWaterMl(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={() => logWater(parseInt(customWaterMl) || 0)} style={primaryBtn}>
            Log
          </button>
        </div>
        {waterEntries.length > 0 && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${line}`, paddingTop: 10 }}>
            {waterEntries.map((w) => (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                <span style={{ fontSize: 13, color: inkDim }}>
                  {new Date(w.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · {w.amountMl}ml
                </span>
                <button onClick={() => removeWater(w.id)} style={{ background: "none", border: "none", padding: 4, color: inkDim }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
