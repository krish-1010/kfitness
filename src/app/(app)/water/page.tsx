"use client";

import { useEffect, useState, useCallback } from "react";
import { useDate } from "../_lib/DateContext";
import { CenteredLoading, ProgressBar } from "../_components/shared";

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

  if (loading) return <CenteredLoading />;

  return (
    <div>
      <div className="section-label flex justify-between items-center">
        <span>
          WATER · {(waterTotal / 1000).toFixed(2)}L{waterTarget ? ` / ${(waterTarget / 1000).toFixed(1)}L` : ""} today
        </span>
        {!editingWaterTarget && waterTarget !== null && (
          <button
            onClick={() => {
              setWaterTargetInput(String(waterTarget));
              setEditingWaterTarget(true);
            }}
            className="bg-transparent border-none text-muted-foreground text-[11px] underline p-0"
          >
            edit target
          </button>
        )}
      </div>
      {editingWaterTarget && (
        <div className="flex gap-1.5 mb-2">
          <input
            type="number"
            value={waterTargetInput}
            onChange={(e) => setWaterTargetInput(e.target.value)}
            placeholder="Target ml"
            className="input-sm flex-1"
          />
          <button onClick={saveWaterTarget} className="btn-primary py-1.5 px-3 text-xs">
            Save
          </button>
          <button onClick={() => setEditingWaterTarget(false)} className="btn-secondary py-1.5 px-3 text-xs">
            Cancel
          </button>
        </div>
      )}
      <div className="card">
        {waterTarget !== null && (
          <div className="mb-2.5">
            <ProgressBar value={waterTotal} goal={waterTarget} variant={waterTotal >= waterTarget ? "good" : "default"} />
          </div>
        )}
        <div className="flex gap-2 mb-2.5">
          {WATER_PRESETS.map((ml) => (
            <button key={ml} onClick={() => logWater(ml)} className="btn-secondary flex-1 text-center">
              +{ml}ml
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Custom ml"
            type="number"
            value={customWaterMl}
            onChange={(e) => setCustomWaterMl(e.target.value)}
            className="input flex-1"
          />
          <button onClick={() => logWater(parseInt(customWaterMl) || 0)} className="btn-primary">
            Log
          </button>
        </div>
        {waterEntries.length > 0 && (
          <div className="mt-3 border-t border-border pt-2.5">
            {waterEntries.map((w) => (
              <div key={w.id} className="flex justify-between items-center py-1">
                <span className="text-[13px] text-muted-foreground">
                  {new Date(w.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · {w.amountMl}ml
                </span>
                <button onClick={() => removeWater(w.id)} className="bg-transparent border-none p-1 text-muted-foreground">
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
