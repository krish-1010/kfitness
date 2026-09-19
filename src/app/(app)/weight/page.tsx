"use client";

import { useEffect, useState, useCallback } from "react";
import { useDate } from "../_lib/DateContext";
import { inkDim, amber, cardStyle, inputStyle, primaryBtn, sectionLabel } from "../_components/shared";

type WeightEntry = { date: string; weight: number };

export default function WeightPage() {
  const { date } = useDate();
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [weightInput, setWeightInput] = useState("");
  const [loading, setLoading] = useState(true);

  const loadWeights = useCallback(async () => {
    const res = await fetch("/api/weights");
    setWeights(await res.json());
  }, []);

  useEffect(() => {
    setLoading(true);
    loadWeights().finally(() => setLoading(false));
  }, [loadWeights]);

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

  if (loading) {
    return (
      <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center", color: inkDim }}>
        Loading…
      </div>
    );
  }

  const last8Weights = weights.slice(-8);
  const minW = last8Weights.length ? Math.min(...last8Weights.map((w) => w.weight)) - 0.5 : 0;
  const maxW = last8Weights.length ? Math.max(...last8Weights.map((w) => w.weight)) + 0.5 : 1;

  return (
    <div>
      <div style={sectionLabel}>WEIGHT LOG</div>
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
              <span>{last8Weights[0]!.weight}kg</span>
              <span>{last8Weights[last8Weights.length - 1]!.weight}kg latest</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
