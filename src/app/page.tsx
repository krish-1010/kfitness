"use client";

import { useEffect, useState, useCallback } from "react";
import { FOOD_LIBRARY, SUPPLEMENTS, PROTEIN_GOAL, KCAL_GOAL, DAY_PLAN } from "@/lib/constants";

const TODAY = () => new Date().toISOString().slice(0, 10);
const DOW = (dateStr: string) => new Date(dateStr + "T00:00:00").getDay();

type LogItem = { id: number; name: string; protein: number; kcal: number };
type DayLog = { items: LogItem[]; supplements: Record<string, boolean> };
type WeightEntry = { date: string; weight: number };

const ink = "#EDEAE3",
  inkDim = "#9A968C",
  bg = "#15140F",
  bg2 = "#1D1B15",
  line = "#2C2A22",
  amber = "#D4922C",
  green = "#7FA66B",
  red = "#C1604B";

function ProgressBar({ value, goal, color }: { value: number; goal: number; color: string }) {
  const pct = Math.min(100, (value / goal) * 100);
  return (
    <div style={{ height: 8, background: bg, overflow: "hidden", border: `1px solid ${line}` }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s ease" }} />
    </div>
  );
}

export default function App() {
  const [date, setDate] = useState(TODAY());
  const [log, setLog] = useState<DayLog>({ items: [], supplements: {} });
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [customName, setCustomName] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customKcal, setCustomKcal] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLog = useCallback(async (d: string) => {
    const res = await fetch(`/api/log?date=${d}`);
    const data = await res.json();
    setLog(data);
  }, []);

  const loadWeights = useCallback(async () => {
    const res = await fetch("/api/weights");
    setWeights(await res.json());
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadLog(date), loadWeights()]).finally(() => setLoading(false));
  }, [date, loadLog, loadWeights]);

  const totalProtein = log.items.reduce((s, i) => s + i.protein, 0);
  const totalKcal = log.items.reduce((s, i) => s + (i.kcal || 0), 0);
  const dow = DOW(date);
  const plan = DAY_PLAN[dow];

  const addFood = async (food: { name: string; protein: number; kcal: number }) => {
    const res = await fetch("/api/log/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, ...food }),
    });
    const item = await res.json();
    setLog((prev) => ({ ...prev, items: [...prev.items, item] }));
  };

  const removeFood = async (id: number) => {
    setLog((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));
    await fetch(`/api/log/items/${id}`, { method: "DELETE" });
  };

  const toggleSupp = async (id: string) => {
    const next = !log.supplements[id];
    setLog((prev) => ({ ...prev, supplements: { ...prev.supplements, [id]: next } }));
    await fetch("/api/log/supplements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, supplementId: id, done: next }),
    });
  };

  const addCustom = () => {
    if (!customName.trim() || !customProtein) return;
    addFood({
      name: customName.trim(),
      protein: parseFloat(customProtein) || 0,
      kcal: parseFloat(customKcal) || 0,
    });
    setCustomName("");
    setCustomProtein("");
    setCustomKcal("");
    setShowCustom(false);
  };

  const shiftDate = (delta: number) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const logWeight = async () => {
    const w = parseFloat(weightInput);
    if (!w) return;
    const res = await fetch("/api/weights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, weight: w }),
    });
    setWeights(await res.json());
    setWeightInput("");
  };

  const suppDoneCount = SUPPLEMENTS.filter((s) => log.supplements[s.id]).length;
  const isToday = date === TODAY();
  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const last8Weights = weights.slice(-8);
  const minW = last8Weights.length ? Math.min(...last8Weights.map((w) => w.weight)) - 0.5 : 0;
  const maxW = last8Weights.length ? Math.max(...last8Weights.map((w) => w.weight)) + 0.5 : 1;

  const navBtn = { width: 36, height: 36, background: bg2, border: `1px solid ${line}`, display: "flex", alignItems: "center", justifyContent: "center" } as const;
  const cardStyle = { background: bg2, border: `1px solid ${line}`, padding: 14 } as const;
  const foodBtnStyle = { background: bg2, border: `1px solid ${line}`, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", color: ink } as const;
  const inputStyle = { background: bg, border: `1px solid ${line}`, color: ink, padding: "9px 10px", fontSize: 14, outline: "none", width: "100%" } as const;
  const primaryBtn = { background: amber, border: "none", color: bg, padding: "9px 16px", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" } as const;
  const secondaryBtn = { background: "none", border: `1px solid ${line}`, color: inkDim, padding: "9px 16px", fontSize: 14 } as const;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: inkDim }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "24px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 0.5, color: inkDim, marginBottom: 2 }}>CUT LOG</div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>
              {dateLabel}
              {isToday ? " · Today" : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => shiftDate(-1)} style={navBtn}>
              ‹
            </button>
            <button onClick={() => shiftDate(1)} style={navBtn} disabled={isToday}>
              ›
            </button>
          </div>
        </div>

        <div
          style={{
            background: plan === "Rest" ? bg2 : `linear-gradient(135deg, ${bg2}, ${bg})`,
            border: `1px solid ${plan === "Rest" ? line : amber + "55"}`,
            padding: "14px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 20 }}>🏋️</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{plan === "Rest" ? "Rest day" : `${plan} day`}</div>
            <div style={{ fontSize: 12, color: inkDim }}>
              {plan === "Rest" ? "No lifting · light cardio optional" : "PPL split · + cardio"}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 11, color: inkDim, marginBottom: 6 }}>PROTEIN</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
              {totalProtein.toFixed(0)}
              <span style={{ fontSize: 14, color: inkDim, fontWeight: 400 }}> / {PROTEIN_GOAL}g</span>
            </div>
            <ProgressBar value={totalProtein} goal={PROTEIN_GOAL} color={totalProtein >= PROTEIN_GOAL ? green : amber} />
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 11, color: inkDim, marginBottom: 6 }}>CALORIES (est.)</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
              {totalKcal.toFixed(0)}
              <span style={{ fontSize: 14, color: inkDim, fontWeight: 400 }}> / {KCAL_GOAL}</span>
            </div>
            <ProgressBar value={totalKcal} goal={KCAL_GOAL} color={totalKcal > KCAL_GOAL ? red : green} />
          </div>
        </div>

        <div style={{ marginBottom: 8, fontSize: 13, color: inkDim, fontWeight: 600 }}>ADD FOOD</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 10 }}>
          {FOOD_LIBRARY.map((f) => (
            <button key={f.name} className="foodbtn" onClick={() => addFood(f)} style={foodBtnStyle}>
              <span style={{ fontSize: 13 }}>{f.name}</span>
              <span style={{ fontSize: 12, color: amber, fontWeight: 600 }}>{f.protein}g</span>
            </button>
          ))}
        </div>

        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            style={{ ...foodBtnStyle, width: "100%", justifyContent: "center", gap: 6, marginBottom: 20, borderStyle: "dashed" }}
          >
            + Custom item
          </button>
        ) : (
          <div style={{ ...cardStyle, marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <input placeholder="Food name" value={customName} onChange={(e) => setCustomName(e.target.value)} style={inputStyle} />
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Protein (g)" type="number" value={customProtein} onChange={(e) => setCustomProtein(e.target.value)} style={inputStyle} />
              <input placeholder="Kcal (optional)" type="number" value={customKcal} onChange={(e) => setCustomKcal(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addCustom} style={{ ...primaryBtn, flex: 1 }}>
                Add
              </button>
              <button onClick={() => setShowCustom(false)} style={{ ...secondaryBtn, flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {log.items.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: inkDim, fontWeight: 600, marginBottom: 8 }}>LOGGED</div>
            <div style={{ border: `1px solid ${line}` }}>
              {log.items.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderBottom: idx < log.items.length - 1 ? `1px solid ${line}` : "none",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{item.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, color: amber }}>{item.protein}g</span>
                    <button onClick={() => removeFood(item.id)} style={{ background: "none", border: "none", padding: 4, color: inkDim }}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 8, fontSize: 13, color: inkDim, fontWeight: 600 }}>
          SUPPLEMENTS · {suppDoneCount}/{SUPPLEMENTS.length}
        </div>
        <div style={{ border: `1px solid ${line}`, marginBottom: 20 }}>
          {SUPPLEMENTS.map((s, idx) => {
            const done = !!log.supplements[s.id];
            return (
              <button
                key={s.id}
                onClick={() => toggleSupp(s.id)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  padding: "10px 12px",
                  background: "none",
                  border: "none",
                  borderBottom: idx < SUPPLEMENTS.length - 1 ? `1px solid ${line}` : "none",
                  textAlign: "left",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, color: done ? inkDim : ink, textDecoration: done ? "line-through" : "none" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: inkDim }}>{s.time}</div>
                </div>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    border: `1.5px solid ${done ? green : line}`,
                    background: done ? green : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: bg,
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  {done ? "✓" : ""}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ marginBottom: 8, fontSize: 13, color: inkDim, fontWeight: 600 }}>WEIGHT LOG</div>
        <div style={cardStyle}>
          <div style={{ display: "flex", gap: 8, marginBottom: last8Weights.length ? 16 : 0 }}>
            <input
              placeholder="kg, e.g. 89.4"
              type="number"
              step="0.1"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={logWeight} style={primaryBtn}>
              Log
            </button>
          </div>
          {last8Weights.length > 0 && (
            <div>
              <svg viewBox="0 0 300 80" style={{ width: "100%", height: 80, overflow: "visible" }}>
                <polyline
                  points={last8Weights
                    .map((w, i) => {
                      const x = last8Weights.length > 1 ? (i / (last8Weights.length - 1)) * 290 + 5 : 150;
                      const y = 75 - ((w.weight - minW) / (maxW - minW || 1)) * 70;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke={amber}
                  strokeWidth="2"
                />
                {last8Weights.map((w, i) => {
                  const x = last8Weights.length > 1 ? (i / (last8Weights.length - 1)) * 290 + 5 : 150;
                  const y = 75 - ((w.weight - minW) / (maxW - minW || 1)) * 70;
                  return <circle key={w.date} cx={x} cy={y} r="3" fill={amber} />;
                })}
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: inkDim, marginTop: 4 }}>
                <span>{last8Weights[0].weight}kg</span>
                <span>{last8Weights[last8Weights.length - 1].weight}kg latest</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", fontSize: 11, color: inkDim, marginTop: 24, paddingBottom: 8 }}>
          90kg → cut · 2700-2800 kcal · 120g protein · PPL ×2
        </div>
      </div>
    </div>
  );
}
