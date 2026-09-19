"use client";

import { useEffect, useState, useCallback } from "react";
import { PROTEIN_GOAL, KCAL_GOAL } from "@/lib/constants";
import { useDate } from "../_lib/DateContext";
import {
  ink,
  inkDim,
  bg2,
  line,
  amber,
  green,
  red,
  cardStyle,
  inputStyle,
  smallInputStyle,
  primaryBtn,
  secondaryBtn,
  tinyBtn,
  sectionLabel,
  navBtn,
  ProgressBar,
} from "../_components/shared";

type LogItem = { id: number; name: string; protein: number; kcal: number };
type Food = { id: number; name: string; protein: number; kcal: number; archived: boolean };

const foodBtnStyle = {
  background: bg2,
  border: `1px solid ${line}`,
  padding: "10px 12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  color: ink,
} as const;

const FOOD_PAGE_SIZE = 10;

export default function FoodPage() {
  const { date } = useDate();
  const [items, setItems] = useState<LogItem[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);

  const [customName, setCustomName] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customKcal, setCustomKcal] = useState("");
  const [showCustomFood, setShowCustomFood] = useState(false);
  const [showManageFoods, setShowManageFoods] = useState(false);
  const [foodQuery, setFoodQuery] = useState("");
  const [foodPage, setFoodPage] = useState(0);
  const [editingFoodId, setEditingFoodId] = useState<number | null>(null);
  const [foodEdit, setFoodEdit] = useState({ name: "", protein: "", kcal: "" });

  // Reads the same combined GET /api/log?date= endpoint the Supplements
  // page also reads independently — each page uses only its half of the
  // response ({items} here, {supplements} there). No backend split needed
  // for this app's single-user scale.
  const loadItems = useCallback(async (d: string) => {
    const res = await fetch(`/api/log?date=${d}`);
    const data: { items: LogItem[] } = await res.json();
    setItems(data.items);
  }, []);

  const loadFoods = useCallback(async () => {
    const res = await fetch("/api/foods");
    setFoods(await res.json());
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadItems(date), loadFoods()]).finally(() => setLoading(false));
  }, [date, loadItems, loadFoods]);

  const totalProtein = items.reduce((s, i) => s + i.protein, 0);
  const totalKcal = items.reduce((s, i) => s + (i.kcal || 0), 0);

  const addFood = async (food: { name: string; protein: number; kcal: number }) => {
    const res = await fetch("/api/log/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, ...food }),
    });
    const item = await res.json();
    setItems((prev) => [...prev, item]);
  };

  const removeFood = async (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/log/items/${id}`, { method: "DELETE" });
  };

  const addCustomFood = () => {
    if (!customName.trim() || !customProtein) return;
    addFood({ name: customName.trim(), protein: parseFloat(customProtein) || 0, kcal: parseFloat(customKcal) || 0 });
    setCustomName("");
    setCustomProtein("");
    setCustomKcal("");
    setShowCustomFood(false);
  };

  const addFoodToLibrary = async () => {
    if (!customName.trim() || !customProtein) return;
    const res = await fetch("/api/foods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: customName.trim(),
        protein: parseFloat(customProtein) || 0,
        kcal: parseFloat(customKcal) || 0,
      }),
    });
    const created = await res.json();
    setFoods((prev) => [...prev, created]);
    setCustomName("");
    setCustomProtein("");
    setCustomKcal("");
  };

  const startEditFood = (f: Food) => {
    setEditingFoodId(f.id);
    setFoodEdit({ name: f.name, protein: String(f.protein), kcal: String(f.kcal) });
  };

  const saveEditFood = async (id: number) => {
    const res = await fetch(`/api/foods/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: foodEdit.name,
        protein: parseFloat(foodEdit.protein) || 0,
        kcal: parseFloat(foodEdit.kcal) || 0,
      }),
    });
    const updated = await res.json();
    setFoods((prev) => prev.map((f) => (f.id === id ? updated : f)));
    setEditingFoodId(null);
  };

  const deleteFood = async (id: number) => {
    setFoods((prev) => prev.filter((f) => f.id !== id));
    await fetch(`/api/foods/${id}`, { method: "DELETE" });
  };

  if (loading) {
    return (
      <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center", color: inkDim }}>
        Loading…
      </div>
    );
  }

  const filteredFoods = foodQuery.trim() ? foods.filter((f) => f.name.toLowerCase().includes(foodQuery.trim().toLowerCase())) : foods;
  const foodPageCount = Math.max(1, Math.ceil(filteredFoods.length / FOOD_PAGE_SIZE));
  const clampedFoodPage = Math.min(foodPage, foodPageCount - 1);
  const pagedFoods = filteredFoods.slice(clampedFoodPage * FOOD_PAGE_SIZE, (clampedFoodPage + 1) * FOOD_PAGE_SIZE);

  return (
    <div>
      {/* ---- Macros ---- */}
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

      {/* ---- Add food ---- */}
      <div style={sectionLabel}>ADD FOOD</div>
      <input
        value={foodQuery}
        onChange={(e) => {
          setFoodQuery(e.target.value);
          setFoodPage(0);
        }}
        placeholder="Search foods…"
        style={{ ...inputStyle, width: "100%", marginBottom: 8, boxSizing: "border-box" }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 8 }}>
        {pagedFoods.map((f) => (
          <button key={f.id} className="foodbtn" onClick={() => addFood(f)} style={foodBtnStyle}>
            <span style={{ fontSize: 13 }}>{f.name}</span>
            <span style={{ fontSize: 12, color: amber, fontWeight: 600 }}>{f.protein}g</span>
          </button>
        ))}
        {filteredFoods.length === 0 && (
          <div style={{ fontSize: 12, color: inkDim, gridColumn: "1 / -1" }}>No foods match &quot;{foodQuery}&quot;</div>
        )}
      </div>
      {foodPageCount > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button onClick={() => setFoodPage((p) => Math.max(0, p - 1))} disabled={clampedFoodPage === 0} style={navBtn}>
            ‹
          </button>
          <div style={{ fontSize: 11, color: inkDim }}>
            Page {clampedFoodPage + 1} / {foodPageCount}
          </div>
          <button onClick={() => setFoodPage((p) => Math.min(foodPageCount - 1, p + 1))} disabled={clampedFoodPage === foodPageCount - 1} style={navBtn}>
            ›
          </button>
        </div>
      )}

      {!showCustomFood ? (
        <button
          onClick={() => setShowCustomFood(true)}
          style={{ ...foodBtnStyle, width: "100%", justifyContent: "center", gap: 6, marginBottom: 10, borderStyle: "dashed" }}
        >
          + Custom item
        </button>
      ) : (
        <div style={{ ...cardStyle, marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <input placeholder="Food name" value={customName} onChange={(e) => setCustomName(e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="Protein (g)" type="number" value={customProtein} onChange={(e) => setCustomProtein(e.target.value)} style={inputStyle} />
            <input placeholder="Kcal (optional)" type="number" value={customKcal} onChange={(e) => setCustomKcal(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addCustomFood} style={{ ...primaryBtn, flex: 1 }}>
              Log once
            </button>
            <button onClick={addFoodToLibrary} style={{ ...secondaryBtn, flex: 1 }}>
              Save to list
            </button>
            <button onClick={() => setShowCustomFood(false)} style={{ ...secondaryBtn, flex: 1 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <button onClick={() => setShowManageFoods((v) => !v)} style={{ ...tinyBtn, width: "100%", marginBottom: 20 }}>
        {showManageFoods ? "Hide" : "Manage"} food list
      </button>
      {showManageFoods && (
        <div style={{ border: `1px solid ${line}`, marginBottom: 8 }}>
          {pagedFoods.map((f, idx) => (
            <div key={f.id} style={{ padding: "8px 10px", borderBottom: idx < pagedFoods.length - 1 ? `1px solid ${line}` : "none" }}>
              {editingFoodId === f.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input value={foodEdit.name} onChange={(e) => setFoodEdit({ ...foodEdit, name: e.target.value })} style={smallInputStyle} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={foodEdit.protein}
                      onChange={(e) => setFoodEdit({ ...foodEdit, protein: e.target.value })}
                      style={{ ...smallInputStyle, width: 70 }}
                      placeholder="protein"
                    />
                    <input
                      value={foodEdit.kcal}
                      onChange={(e) => setFoodEdit({ ...foodEdit, kcal: e.target.value })}
                      style={{ ...smallInputStyle, width: 70 }}
                      placeholder="kcal"
                    />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => saveEditFood(f.id)} style={{ ...primaryBtn, flex: 1, padding: "6px 10px", fontSize: 12 }}>
                      Save
                    </button>
                    <button onClick={() => setEditingFoodId(null)} style={{ ...secondaryBtn, flex: 1, padding: "6px 10px", fontSize: 12 }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13 }}>
                    {f.name} <span style={{ color: inkDim }}>· {f.protein}g · {f.kcal}kcal</span>
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => startEditFood(f)} style={tinyBtn}>
                      Edit
                    </button>
                    <button onClick={() => deleteFood(f.id)} style={tinyBtn}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>LOGGED</div>
          <div style={{ border: `1px solid ${line}` }}>
            {items.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderBottom: idx < items.length - 1 ? `1px solid ${line}` : "none",
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
    </div>
  );
}
