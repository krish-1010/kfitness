"use client";

import { useEffect, useState, useCallback } from "react";
import { PROTEIN_GOAL, KCAL_GOAL } from "@/lib/constants";
import { useDate } from "../_lib/DateContext";
import { CenteredLoading, ProgressBar } from "../_components/shared";

type LogItem = { id: number; name: string; protein: number; kcal: number };
type Food = { id: number; name: string; protein: number; kcal: number; archived: boolean };

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

  if (loading) return <CenteredLoading />;

  const filteredFoods = foodQuery.trim() ? foods.filter((f) => f.name.toLowerCase().includes(foodQuery.trim().toLowerCase())) : foods;
  const foodPageCount = Math.max(1, Math.ceil(filteredFoods.length / FOOD_PAGE_SIZE));
  const clampedFoodPage = Math.min(foodPage, foodPageCount - 1);
  const pagedFoods = filteredFoods.slice(clampedFoodPage * FOOD_PAGE_SIZE, (clampedFoodPage + 1) * FOOD_PAGE_SIZE);

  return (
    <div>
      {/* ---- Macros ---- */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card">
          <div className="text-[11px] text-muted-foreground mb-1.5">PROTEIN</div>
          <div className="text-2xl font-bold mb-2">
            {totalProtein.toFixed(0)}
            <span className="text-sm text-muted-foreground font-normal"> / {PROTEIN_GOAL}g</span>
          </div>
          <ProgressBar value={totalProtein} goal={PROTEIN_GOAL} variant={totalProtein >= PROTEIN_GOAL ? "good" : "default"} />
        </div>
        <div className="card">
          <div className="text-[11px] text-muted-foreground mb-1.5">CALORIES (est.)</div>
          <div className="text-2xl font-bold mb-2">
            {totalKcal.toFixed(0)}
            <span className="text-sm text-muted-foreground font-normal"> / {KCAL_GOAL}</span>
          </div>
          <ProgressBar value={totalKcal} goal={KCAL_GOAL} variant={totalKcal > KCAL_GOAL ? "over" : "good"} />
        </div>
      </div>

      {/* ---- Add food ---- */}
      <div className="section-label">ADD FOOD</div>
      <input
        value={foodQuery}
        onChange={(e) => {
          setFoodQuery(e.target.value);
          setFoodPage(0);
        }}
        placeholder="Search foods…"
        className="input mb-2"
      />
      <div className="grid grid-cols-2 gap-2 mb-2">
        {pagedFoods.map((f) => (
          <button
            key={f.id}
            onClick={() => addFood(f)}
            className="foodbtn bg-card border border-border py-2.5 px-3 flex justify-between items-center text-foreground"
          >
            <span className="text-[13px]">{f.name}</span>
            <span className="text-xs text-primary font-semibold">{f.protein}g</span>
          </button>
        ))}
        {filteredFoods.length === 0 && (
          <div className="text-xs text-muted-foreground col-span-full">No foods match &quot;{foodQuery}&quot;</div>
        )}
      </div>
      {foodPageCount > 1 && (
        <div className="flex items-center justify-between mb-2.5">
          <button onClick={() => setFoodPage((p) => Math.max(0, p - 1))} disabled={clampedFoodPage === 0} className="nav-btn">
            ‹
          </button>
          <div className="text-[11px] text-muted-foreground">
            Page {clampedFoodPage + 1} / {foodPageCount}
          </div>
          <button onClick={() => setFoodPage((p) => Math.min(foodPageCount - 1, p + 1))} disabled={clampedFoodPage === foodPageCount - 1} className="nav-btn">
            ›
          </button>
        </div>
      )}

      {!showCustomFood ? (
        <button
          onClick={() => setShowCustomFood(true)}
          className="foodbtn w-full bg-card border border-dashed border-border py-2.5 px-3 flex justify-center items-center gap-1.5 mb-2.5 text-foreground"
        >
          + Custom item
        </button>
      ) : (
        <div className="card mb-2.5 flex flex-col gap-2">
          <input placeholder="Food name" value={customName} onChange={(e) => setCustomName(e.target.value)} className="input" />
          <div className="flex gap-2">
            <input placeholder="Protein (g)" type="number" value={customProtein} onChange={(e) => setCustomProtein(e.target.value)} className="input" />
            <input placeholder="Kcal (optional)" type="number" value={customKcal} onChange={(e) => setCustomKcal(e.target.value)} className="input" />
          </div>
          <div className="flex gap-2">
            <button onClick={addCustomFood} className="btn-primary flex-1">
              Log once
            </button>
            <button onClick={addFoodToLibrary} className="btn-secondary flex-1">
              Save to list
            </button>
            <button onClick={() => setShowCustomFood(false)} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      <button onClick={() => setShowManageFoods((v) => !v)} className="btn-tiny w-full mb-5">
        {showManageFoods ? "Hide" : "Manage"} food list
      </button>
      {showManageFoods && (
        <div className="border border-border mb-2">
          {pagedFoods.map((f) => (
            <div key={f.id} className="list-row">
              {editingFoodId === f.id ? (
                <div className="flex flex-col gap-1.5">
                  <input value={foodEdit.name} onChange={(e) => setFoodEdit({ ...foodEdit, name: e.target.value })} className="input-sm" />
                  <div className="flex gap-1.5">
                    <input
                      value={foodEdit.protein}
                      onChange={(e) => setFoodEdit({ ...foodEdit, protein: e.target.value })}
                      className="input-sm w-[70px]"
                      placeholder="protein"
                    />
                    <input
                      value={foodEdit.kcal}
                      onChange={(e) => setFoodEdit({ ...foodEdit, kcal: e.target.value })}
                      className="input-sm w-[70px]"
                      placeholder="kcal"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => saveEditFood(f.id)} className="btn-primary flex-1 py-1.5 text-xs">
                      Save
                    </button>
                    <button onClick={() => setEditingFoodId(null)} className="btn-secondary flex-1 py-1.5 text-xs">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-[13px]">
                    {f.name} <span className="text-muted-foreground">· {f.protein}g · {f.kcal}kcal</span>
                  </span>
                  <div className="flex gap-1.5">
                    <button onClick={() => startEditFood(f)} className="btn-tiny">
                      Edit
                    </button>
                    <button onClick={() => deleteFood(f.id)} className="btn-tiny">
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
        <div className="mb-5">
          <div className="section-label">LOGGED</div>
          <div className="border border-border">
            {items.map((item) => (
              <div key={item.id} className="list-row flex justify-between items-center">
                <span className="text-sm">{item.name}</span>
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] text-primary">{item.protein}g</span>
                  <button onClick={() => removeFood(item.id)} className="bg-transparent border-none p-1 text-muted-foreground">
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
