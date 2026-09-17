"use client";

import { useEffect, useState, useCallback } from "react";
import { PROTEIN_GOAL, KCAL_GOAL } from "@/lib/constants";

// Formats a Date using its LOCAL calendar fields, never toISOString() (which
// converts to UTC first). In any positive-UTC-offset timezone like IST,
// local midnight is the previous day in UTC, so toISOString().slice(0,10)
// silently loses a day on every round trip — this avoids that entirely.
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TODAY = () => toLocalDateStr(new Date());

const WATER_PRESETS = [500, 650, 850] as const;

type LogItem = { id: number; name: string; protein: number; kcal: number };
type DayLog = { items: LogItem[]; supplements: Record<string, boolean> };
type WeightEntry = { date: string; weight: number };
type WaterEntry = { id: number; date: string; amountMl: number; createdAt: string };
type Food = { id: number; name: string; protein: number; kcal: number; archived: boolean };
type Supplement = { id: number; name: string; time: string; archived: boolean };
type Exercise = {
  id: number;
  name: string;
  dayType: string;
  defaultSets: number;
  defaultReps: string;
  restSeconds: number | null;
  variant: string;
  block: string;
  muscleGroup: string;
  videoUrl: string | null;
  archived: boolean;
};
type ExerciseLogRow = {
  id: number;
  exerciseId: number;
  sets: number | null;
  reps: string | null;
  weight: number | null;
  done: boolean;
  name: string | null;
  defaultSets: number | null;
  defaultReps: string | null;
  restSeconds: number | null;
  block: string | null;
  muscleGroup: string | null;
  videoUrl: string | null;
};
type DayType = "Push" | "Pull" | "Legs" | "Rest";
type Variant = "strength" | "hypertrophy" | null;
type WorkoutState = {
  dayType: DayType;
  status: string;
  suggested: boolean;
  variant: Variant;
  log: ExerciseLogRow[];
};

const ink = "#EDEAE3",
  inkDim = "#9A968C",
  bg = "#15140F",
  bg2 = "#1D1B15",
  line = "#2C2A22",
  amber = "#D4922C",
  green = "#7FA66B",
  red = "#C1604B",
  blue = "#6B9BC1",
  purple = "#A67FB5";

// Rough color family per muscle group prefix, purely visual grouping, not
// scientific. Falls back to amber for anything unmapped.
function muscleColor(muscleGroup: string): string {
  const g = muscleGroup.toLowerCase();
  if (g.startsWith("chest") || g.startsWith("shoulder") || g.startsWith("tricep")) return amber;
  if (g.startsWith("back") || g.startsWith("bicep") || g.startsWith("forearm") || g.startsWith("trap")) return blue;
  if (g.startsWith("quad") || g.startsWith("hamstring") || g.startsWith("glute") || g.startsWith("calf") || g.startsWith("adductor") || g.startsWith("abductor"))
    return green;
  if (g.startsWith("core") || g.startsWith("lower back")) return purple;
  return inkDim;
}

function ProgressBar({ value, goal, color }: { value: number; goal: number; color: string }) {
  const pct = Math.min(100, (value / goal) * 100);
  return (
    <div style={{ height: 8, background: bg, overflow: "hidden", border: `1px solid ${line}` }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s ease" }} />
    </div>
  );
}

const cardStyle = { background: bg2, border: `1px solid ${line}`, padding: 14 } as const;

function MuscleBadge({ muscleGroup }: { muscleGroup: string }) {
  if (!muscleGroup) return null;
  const color = muscleColor(muscleGroup);
  return (
    <span style={{ fontSize: 10, color, border: `1px solid ${color}55`, padding: "1px 5px", whiteSpace: "nowrap" }}>
      {muscleGroup}
    </span>
  );
}

function VideoLink({ videoUrl }: { videoUrl: string | null }) {
  if (!videoUrl) return null;
  return (
    <a
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{ fontSize: 10, color: amber, textDecoration: "underline", whiteSpace: "nowrap" }}
    >
      ▶ How to
    </a>
  );
}

function Stepper({
  value,
  onChange,
  min = 0,
  step = 1,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", border: `1px solid ${line}`, background: bg }}>
      <button
        onClick={() => onChange(Math.max(min, (value ?? min) - step))}
        style={{ background: "none", border: "none", color: inkDim, width: 22, height: 26, fontSize: 13 }}
      >
        −
      </button>
      <input
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          const n = parseInt(e.target.value);
          onChange(Number.isFinite(n) ? n : min);
        }}
        style={{
          width: 30,
          textAlign: "center",
          background: "none",
          border: "none",
          color: ink,
          fontSize: 13,
          outline: "none",
        }}
      />
      <button
        onClick={() => onChange((value ?? min) + step)}
        style={{ background: "none", border: "none", color: inkDim, width: 22, height: 26, fontSize: 13 }}
      >
        +
      </button>
    </div>
  );
}
const inputStyle = {
  background: bg,
  border: `1px solid ${line}`,
  color: ink,
  padding: "9px 10px",
  fontSize: 14,
  outline: "none",
  width: "100%",
} as const;
const smallInputStyle = { ...inputStyle, padding: "6px 8px", fontSize: 13 } as const;
const primaryBtn = {
  background: amber,
  border: "none",
  color: bg,
  padding: "9px 16px",
  fontSize: 14,
  fontWeight: 600,
  whiteSpace: "nowrap",
} as const;
const secondaryBtn = { background: "none", border: `1px solid ${line}`, color: inkDim, padding: "9px 16px", fontSize: 14 } as const;
const tinyBtn = { background: "none", border: `1px solid ${line}`, color: inkDim, padding: "5px 10px", fontSize: 12 } as const;
const sectionLabel = { marginBottom: 8, fontSize: 13, color: inkDim, fontWeight: 600, letterSpacing: 0.3 } as const;

export default function App() {
  const [date, setDate] = useState(TODAY());
  const [log, setLog] = useState<DayLog>({ items: [], supplements: {} });
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [exerciseOptions, setExerciseOptions] = useState<Exercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [workout, setWorkout] = useState<WorkoutState>({
    dayType: "Push",
    status: "planned",
    suggested: true,
    variant: "strength",
    log: [],
  });

  const [customName, setCustomName] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customKcal, setCustomKcal] = useState("");
  const [showCustomFood, setShowCustomFood] = useState(false);
  const [showManageFoods, setShowManageFoods] = useState(false);
  const [editingFoodId, setEditingFoodId] = useState<number | null>(null);
  const [foodEdit, setFoodEdit] = useState({ name: "", protein: "", kcal: "" });
  const [showManageSupplements, setShowManageSupplements] = useState(false);
  const [editingSuppId, setEditingSuppId] = useState<number | null>(null);
  const [suppEdit, setSuppEdit] = useState({ name: "", time: "" });
  const [newSuppName, setNewSuppName] = useState("");
  const [newSuppTime, setNewSuppTime] = useState("");

  const [customExName, setCustomExName] = useState("");
  const [customExSets, setCustomExSets] = useState("3");
  const [customExReps, setCustomExReps] = useState("8-12");
  const [showCustomExercise, setShowCustomExercise] = useState(false);
  const [showManageExercises, setShowManageExercises] = useState(false);
  const [showFullProgram, setShowFullProgram] = useState(false);
  const [editingExId, setEditingExId] = useState<number | null>(null);
  const [exEdit, setExEdit] = useState({ name: "", dayType: "Push", defaultSets: "3", defaultReps: "8-12", muscleGroup: "", videoUrl: "" });

  const [weightInput, setWeightInput] = useState("");
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [waterTotal, setWaterTotal] = useState(0);
  const [customWaterMl, setCustomWaterMl] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLog = useCallback(async (d: string) => {
    const res = await fetch(`/api/log?date=${d}`);
    setLog(await res.json());
  }, []);

  const loadWeights = useCallback(async () => {
    const res = await fetch("/api/weights");
    setWeights(await res.json());
  }, []);

  const loadFoods = useCallback(async () => {
    const res = await fetch("/api/foods");
    setFoods(await res.json());
  }, []);

  const loadSupplements = useCallback(async () => {
    const res = await fetch("/api/supplements");
    setSupplements(await res.json());
  }, []);

  const loadWorkout = useCallback(async (d: string) => {
    const res = await fetch(`/api/workout?date=${d}`);
    const data: WorkoutState = await res.json();
    setWorkout(data);
    if (data.dayType !== "Rest" && data.variant) {
      const exRes = await fetch(`/api/exercises?dayType=${data.dayType}&variant=${data.variant}`);
      setExerciseOptions(await exRes.json());
    } else {
      setExerciseOptions([]);
    }
  }, []);

  const loadAllExercises = useCallback(async () => {
    const res = await fetch("/api/exercises");
    setAllExercises(await res.json());
  }, []);

  const loadWater = useCallback(async (d: string) => {
    const res = await fetch(`/api/water?date=${d}`);
    const data = await res.json();
    setWaterEntries(data.entries);
    setWaterTotal(data.total);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadLog(date), loadWeights(), loadFoods(), loadWorkout(date), loadWater(date), loadSupplements()]).finally(
      () => setLoading(false)
    );
  }, [date, loadLog, loadWeights, loadFoods, loadWorkout, loadWater, loadSupplements]);

  const totalProtein = log.items.reduce((s, i) => s + i.protein, 0);
  const totalKcal = log.items.reduce((s, i) => s + (i.kcal || 0), 0);

  // ---- Food ----
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

  // ---- Supplements ----
  const toggleSupp = async (id: string) => {
    const next = !log.supplements[id];
    setLog((prev) => ({ ...prev, supplements: { ...prev.supplements, [id]: next } }));
    await fetch("/api/log/supplements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, supplementId: id, done: next }),
    });
  };

  const addSupplement = async () => {
    if (!newSuppName.trim()) return;
    const res = await fetch("/api/supplements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSuppName.trim(), time: newSuppTime.trim() }),
    });
    const created: Supplement = await res.json();
    setSupplements((prev) => [...prev, created]);
    setNewSuppName("");
    setNewSuppTime("");
  };

  const startEditSupp = (s: Supplement) => {
    setEditingSuppId(s.id);
    setSuppEdit({ name: s.name, time: s.time });
  };

  const saveEditSupp = async (id: number) => {
    const res = await fetch(`/api/supplements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: suppEdit.name, time: suppEdit.time }),
    });
    const updated = await res.json();
    setSupplements((prev) => prev.map((s) => (s.id === id ? updated : s)));
    setEditingSuppId(null);
  };

  const deleteSupplement = async (id: number) => {
    setSupplements((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/supplements/${id}`, { method: "DELETE" });
  };

  // ---- Weights ----
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

  // ---- Water ----
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

  // ---- Workout / exercise ----
  const commitSession = async (dayType: DayType, status: string, isManualOverride = false) => {
    await fetch("/api/workout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, dayType, status, isManualOverride }),
    });
    await loadWorkout(date);
  };

  const addExerciseToLog = async (ex: Exercise) => {
    // reps is intentionally omitted here — defaultReps like "6-8" is a
    // suggested range, not an actual outcome. It shows as a placeholder in
    // the UI; the logged value starts empty until a real number is entered.
    const res = await fetch("/api/workout/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, exerciseId: ex.id, sets: ex.defaultSets }),
    });
    const row = await res.json();
    setWorkout((prev) => ({
      ...prev,
      log: [
        ...prev.log,
        {
          ...row,
          name: ex.name,
          defaultSets: ex.defaultSets,
          defaultReps: ex.defaultReps,
          restSeconds: ex.restSeconds,
          block: ex.block,
          muscleGroup: ex.muscleGroup,
          videoUrl: ex.videoUrl,
        },
      ],
    }));
  };

  const updateLogRow = async (id: number, patch: Partial<ExerciseLogRow>) => {
    setWorkout((prev) => ({ ...prev, log: prev.log.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
    await fetch(`/api/workout/log/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  };

  const removeLogRow = async (id: number) => {
    setWorkout((prev) => ({ ...prev, log: prev.log.filter((r) => r.id !== id) }));
    await fetch(`/api/workout/log/${id}`, { method: "DELETE" });
  };

  const addCustomExercise = async () => {
    if (!customExName.trim() || workout.dayType === "Rest") return;
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: customExName.trim(),
        dayType: workout.dayType,
        defaultSets: parseInt(customExSets) || 3,
        defaultReps: customExReps || "8-12",
      }),
    });
    const created: Exercise = await res.json();
    setExerciseOptions((prev) => [...prev, created]);
    await addExerciseToLog(created);
    setCustomExName("");
    setCustomExSets("3");
    setCustomExReps("8-12");
    setShowCustomExercise(false);
  };

  const startEditEx = (ex: Exercise) => {
    setEditingExId(ex.id);
    setExEdit({
      name: ex.name,
      dayType: ex.dayType,
      defaultSets: String(ex.defaultSets),
      defaultReps: ex.defaultReps,
      muscleGroup: ex.muscleGroup,
      videoUrl: ex.videoUrl ?? "",
    });
  };

  const saveEditEx = async (id: number) => {
    const res = await fetch(`/api/exercises/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: exEdit.name,
        dayType: exEdit.dayType,
        defaultSets: parseInt(exEdit.defaultSets) || 3,
        defaultReps: exEdit.defaultReps,
        muscleGroup: exEdit.muscleGroup,
        videoUrl: exEdit.videoUrl,
      }),
    });
    const updated = await res.json();
    setAllExercises((prev) => prev.map((e) => (e.id === id ? updated : e)));
    setEditingExId(null);
  };

  const deleteEx = async (id: number) => {
    setAllExercises((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/exercises/${id}`, { method: "DELETE" });
  };

  const shiftDate = (delta: number) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(toLocalDateStr(d));
  };

  const suppDoneCount = supplements.filter((s) => log.supplements[String(s.id)]).length;
  const isToday = date === TODAY();
  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const last8Weights = weights.slice(-8);
  const minW = last8Weights.length ? Math.min(...last8Weights.map((w) => w.weight)) - 0.5 : 0;
  const maxW = last8Weights.length ? Math.max(...last8Weights.map((w) => w.weight)) + 0.5 : 1;

  const navBtn = {
    width: 36,
    height: 36,
    background: bg2,
    border: `1px solid ${line}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;
  const foodBtnStyle = {
    background: bg2,
    border: `1px solid ${line}`,
    padding: "10px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: ink,
  } as const;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: inkDim }}>
        Loading…
      </div>
    );
  }

  const dayTypeColor = workout.dayType === "Rest" ? inkDim : amber;
  const exDoneCount = workout.log.filter((r) => r.done).length;

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
            <button
              onClick={async () => {
                await fetch("/api/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              style={navBtn}
              title="Log out"
            >
              ⏻
            </button>
          </div>
        </div>

        {/* ---- Workout / exercise section ---- */}
        <div
          style={{
            background: workout.dayType === "Rest" ? bg2 : `linear-gradient(135deg, ${bg2}, ${bg})`,
            border: `1px solid ${workout.dayType === "Rest" ? line : amber + "55"}`,
            padding: "14px 16px",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: workout.dayType !== "Rest" ? 12 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 20 }}>{workout.dayType === "Rest" ? "💤" : "🏋️"}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {workout.dayType === "Rest" ? "Rest day" : `${workout.dayType} day`}
                  {workout.variant && (
                    <span style={{ fontSize: 11, color: amber, fontWeight: 400 }}>
                      {" "}
                      · {workout.variant === "strength" ? "Strength" : "Hypertrophy"}
                    </span>
                  )}
                  {workout.suggested && <span style={{ fontSize: 11, color: inkDim, fontWeight: 400 }}> · suggested</span>}
                  {workout.status === "done" && <span style={{ fontSize: 11, color: green, fontWeight: 400 }}> · done</span>}
                  {workout.status === "skipped" && <span style={{ fontSize: 11, color: red, fontWeight: 400 }}> · skipped</span>}
                </div>
                {workout.dayType !== "Rest" && (
                  <div style={{ fontSize: 12, color: inkDim }}>
                    {exDoneCount}/{workout.log.length || 0} exercises done
                  </div>
                )}
              </div>
            </div>
            <select
              value={workout.dayType}
              onChange={(e) => commitSession(e.target.value as DayType, "planned", true)}
              style={{ ...smallInputStyle, width: "auto" }}
            >
              <option value="Push">Push</option>
              <option value="Pull">Pull</option>
              <option value="Legs">Legs</option>
              <option value="Rest">Rest</option>
            </select>
          </div>

          {workout.dayType !== "Rest" && (
            <>
              {workout.log.length > 0 && (
                <div style={{ border: `1px solid ${line}`, marginBottom: 10 }}>
                  {workout.log.map((row, idx) => (
                    <div
                      key={row.id}
                      style={{
                        padding: "8px 10px",
                        borderBottom: idx < workout.log.length - 1 ? `1px solid ${line}` : "none",
                        background: bg,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <button
                          onClick={() => updateLogRow(row.id, { done: !row.done })}
                          style={{
                            width: 18,
                            height: 18,
                            border: `1.5px solid ${row.done ? green : line}`,
                            background: row.done ? green : "transparent",
                            flexShrink: 0,
                            color: bg,
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          {row.done ? "✓" : ""}
                        </button>
                        <span
                          style={{
                            fontSize: 13,
                            flex: 1,
                            textDecoration: row.done ? "line-through" : "none",
                            color: row.done ? inkDim : ink,
                          }}
                        >
                          {row.name}
                        </span>
                        <MuscleBadge muscleGroup={row.muscleGroup ?? ""} />
                        <VideoLink videoUrl={row.videoUrl} />
                        <button onClick={() => removeLogRow(row.id)} style={{ background: "none", border: "none", color: inkDim, padding: 2 }}>
                          ✕
                        </button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 26 }}>
                        <Stepper value={row.sets} onChange={(v) => updateLogRow(row.id, { sets: v })} min={1} />
                        <input
                          value={row.reps ?? ""}
                          placeholder={row.defaultReps ?? "reps"}
                          onChange={(e) => updateLogRow(row.id, { reps: e.target.value })}
                          style={{ ...smallInputStyle, width: 50, textAlign: "center" }}
                        />
                        <button
                          onClick={() => updateLogRow(row.id, { reps: String(Math.max(0, parseInt(row.reps || "0") - 1)) })}
                          style={{ background: "none", border: `1px solid ${line}`, color: inkDim, width: 22, height: 26, fontSize: 13 }}
                        >
                          −
                        </button>
                        <button
                          onClick={() => updateLogRow(row.id, { reps: String((parseInt(row.reps || "0") || 0) + 1) })}
                          style={{ background: "none", border: `1px solid ${line}`, color: inkDim, width: 22, height: 26, fontSize: 13 }}
                        >
                          +
                        </button>
                        <input
                          value={row.weight ?? ""}
                          onChange={(e) => updateLogRow(row.id, { weight: parseFloat(e.target.value) || 0 })}
                          style={{ ...smallInputStyle, width: 50, textAlign: "center" }}
                          placeholder="kg"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {exerciseOptions.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {exerciseOptions
                    .filter((ex) => !workout.log.some((r) => r.exerciseId === ex.id))
                    .map((ex) => (
                      <button
                        key={ex.id}
                        onClick={() => addExerciseToLog(ex)}
                        style={{ ...tinyBtn, borderStyle: "dashed", display: "flex", alignItems: "center", gap: 5 }}
                      >
                        + {ex.name}
                        <MuscleBadge muscleGroup={ex.muscleGroup} />
                      </button>
                    ))}
                </div>
              )}

              {!showCustomExercise ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowCustomExercise(true)} style={{ ...secondaryBtn, flex: 1 }}>
                    + Custom exercise
                  </button>
                  <button onClick={() => commitSession(workout.dayType, "done")} style={primaryBtn}>
                    Mark day done
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input placeholder="Exercise name" value={customExName} onChange={(e) => setCustomExName(e.target.value)} style={inputStyle} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <input placeholder="Sets" value={customExSets} onChange={(e) => setCustomExSets(e.target.value)} style={inputStyle} />
                    <input placeholder="Reps (e.g. 8-12)" value={customExReps} onChange={(e) => setCustomExReps(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={addCustomExercise} style={{ ...primaryBtn, flex: 1 }}>
                      Add
                    </button>
                    <button onClick={() => setShowCustomExercise(false)} style={{ ...secondaryBtn, flex: 1 }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {workout.dayType === "Rest" && workout.status !== "rest" && (
            <button onClick={() => commitSession("Rest", "rest", true)} style={{ ...secondaryBtn, marginTop: 10, width: "100%" }}>
              Confirm rest day
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button
            onClick={() => {
              setShowManageExercises((v) => !v);
              if (!showManageExercises) loadAllExercises();
            }}
            style={{ ...tinyBtn, flex: 1 }}
          >
            {showManageExercises ? "Hide" : "Manage"} exercise library
          </button>
          <button
            onClick={() => {
              setShowFullProgram(true);
              loadAllExercises();
            }}
            style={{ ...tinyBtn, flex: 1 }}
          >
            Full program table
          </button>
        </div>

        {showFullProgram && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "#000000cc",
              zIndex: 10,
              padding: "20px 12px",
              overflowY: "auto",
            }}
          >
            <div style={{ maxWidth: 640, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>Full PPL Program</div>
                <button onClick={() => setShowFullProgram(false)} style={navBtn}>
                  ✕
                </button>
              </div>
              {(
                [
                  ["Push", "strength", "Push · Strength"],
                  ["Pull", "strength", "Pull · Strength"],
                  ["Legs", "strength", "Legs · Strength"],
                  ["Push", "hypertrophy", "Push · Hypertrophy"],
                  ["Pull", "hypertrophy", "Pull · Hypertrophy"],
                  ["Legs", "hypertrophy", "Legs · Hypertrophy"],
                ] as [string, string, string][]
              ).map(([dt, v, label]) => {
                const sessionExercises = allExercises
                  .filter((ex) => !ex.archived && ex.dayType === dt && (ex.variant === v || ex.variant === "standard"))
                  .sort((a, b) => {
                    const order: Record<string, number> = { main: 0, core: 1, conditioning: 2 };
                    return (order[a.block] ?? 0) - (order[b.block] ?? 0);
                  });
                return (
                  <div key={label} style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        background: amber + "22",
                        color: amber,
                        fontWeight: 600,
                        padding: 8,
                        fontSize: 13,
                        border: `1px solid ${line}`,
                      }}
                    >
                      {label}
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          {["Exercise", "Muscle", "Sets", "Reps", "Rest"].map((h) => (
                            <th
                              key={h}
                              style={{
                                border: `1px solid ${line}`,
                                padding: "6px 8px",
                                textAlign: "left",
                                background: bg2,
                                color: inkDim,
                                fontSize: 11,
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sessionExercises.map((ex) => (
                          <tr key={ex.id}>
                            <td style={{ border: `1px solid ${line}`, padding: "6px 8px" }}>
                              {ex.name}
                              {ex.block !== "main" && <span style={{ color: inkDim }}> · {ex.block}</span>}
                              {ex.videoUrl && (
                                <>
                                  {" "}
                                  <VideoLink videoUrl={ex.videoUrl} />
                                </>
                              )}
                            </td>
                            <td style={{ border: `1px solid ${line}`, padding: "6px 8px" }}>
                              <MuscleBadge muscleGroup={ex.muscleGroup} />
                            </td>
                            <td style={{ border: `1px solid ${line}`, padding: "6px 8px" }}>{ex.defaultSets}</td>
                            <td style={{ border: `1px solid ${line}`, padding: "6px 8px" }}>{ex.defaultReps}</td>
                            <td style={{ border: `1px solid ${line}`, padding: "6px 8px" }}>
                              {ex.restSeconds ? `${ex.restSeconds} sec` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ marginBottom: 20 }}>
          {showManageExercises && (
            <div style={{ border: `1px solid ${line}`, marginTop: 8 }}>
              {allExercises.map((ex, idx) => (
                <div
                  key={ex.id}
                  style={{
                    padding: "8px 10px",
                    borderBottom: idx < allExercises.length - 1 ? `1px solid ${line}` : "none",
                  }}
                >
                  {editingExId === ex.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <input value={exEdit.name} onChange={(e) => setExEdit({ ...exEdit, name: e.target.value })} style={smallInputStyle} />
                      <div style={{ display: "flex", gap: 6 }}>
                        <select
                          value={exEdit.dayType}
                          onChange={(e) => setExEdit({ ...exEdit, dayType: e.target.value })}
                          style={smallInputStyle}
                        >
                          <option value="Push">Push</option>
                          <option value="Pull">Pull</option>
                          <option value="Legs">Legs</option>
                        </select>
                        <input
                          value={exEdit.defaultSets}
                          onChange={(e) => setExEdit({ ...exEdit, defaultSets: e.target.value })}
                          style={{ ...smallInputStyle, width: 50 }}
                        />
                        <input
                          value={exEdit.defaultReps}
                          onChange={(e) => setExEdit({ ...exEdit, defaultReps: e.target.value })}
                          style={{ ...smallInputStyle, width: 70 }}
                        />
                      </div>
                      <input
                        value={exEdit.muscleGroup}
                        onChange={(e) => setExEdit({ ...exEdit, muscleGroup: e.target.value })}
                        style={smallInputStyle}
                        placeholder="Muscle group, e.g. Chest · Upper"
                      />
                      <input
                        value={exEdit.videoUrl}
                        onChange={(e) => setExEdit({ ...exEdit, videoUrl: e.target.value })}
                        style={smallInputStyle}
                        placeholder="Video URL (optional)"
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => saveEditEx(ex.id)} style={{ ...primaryBtn, flex: 1, padding: "6px 10px", fontSize: 12 }}>
                          Save
                        </button>
                        <button onClick={() => setEditingExId(null)} style={{ ...secondaryBtn, flex: 1, padding: "6px 10px", fontSize: 12 }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {ex.name} <span style={{ color: inkDim }}>· {ex.dayType} · {ex.defaultSets}×{ex.defaultReps}</span>
                        <MuscleBadge muscleGroup={ex.muscleGroup} />
                        <VideoLink videoUrl={ex.videoUrl} />
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => startEditEx(ex)} style={tinyBtn}>
                          Edit
                        </button>
                        <button onClick={() => deleteEx(ex.id)} style={tinyBtn}>
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 10 }}>
          {foods.map((f) => (
            <button key={f.id} className="foodbtn" onClick={() => addFood(f)} style={foodBtnStyle}>
              <span style={{ fontSize: 13 }}>{f.name}</span>
              <span style={{ fontSize: 12, color: amber, fontWeight: 600 }}>{f.protein}g</span>
            </button>
          ))}
        </div>

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
          <div style={{ border: `1px solid ${line}`, marginBottom: 20 }}>
            {foods.map((f, idx) => (
              <div key={f.id} style={{ padding: "8px 10px", borderBottom: idx < foods.length - 1 ? `1px solid ${line}` : "none" }}>
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

        {log.items.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={sectionLabel}>LOGGED</div>
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

        {/* ---- Supplements ---- */}
        <div style={sectionLabel}>
          SUPPLEMENTS · {suppDoneCount}/{supplements.length}
        </div>
        <div style={{ border: `1px solid ${line}`, marginBottom: 8 }}>
          {supplements.map((s, idx) => {
            const done = !!log.supplements[String(s.id)];
            return (
              <button
                key={s.id}
                onClick={() => toggleSupp(String(s.id))}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  padding: "10px 12px",
                  background: "none",
                  border: "none",
                  borderBottom: idx < supplements.length - 1 ? `1px solid ${line}` : "none",
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

        <button onClick={() => setShowManageSupplements((v) => !v)} style={{ ...tinyBtn, width: "100%", marginBottom: 20 }}>
          {showManageSupplements ? "Hide" : "Manage"} supplement list
        </button>
        {showManageSupplements && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ border: `1px solid ${line}` }}>
              {supplements.map((s, idx) => (
                <div key={s.id} style={{ padding: "8px 10px", borderBottom: idx < supplements.length - 1 ? `1px solid ${line}` : "none" }}>
                  {editingSuppId === s.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <input value={suppEdit.name} onChange={(e) => setSuppEdit({ ...suppEdit, name: e.target.value })} style={smallInputStyle} />
                      <input value={suppEdit.time} onChange={(e) => setSuppEdit({ ...suppEdit, time: e.target.value })} style={smallInputStyle} placeholder="e.g. AM · with food" />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => saveEditSupp(s.id)} style={{ ...primaryBtn, flex: 1, padding: "6px 10px", fontSize: 12 }}>
                          Save
                        </button>
                        <button onClick={() => setEditingSuppId(null)} style={{ ...secondaryBtn, flex: 1, padding: "6px 10px", fontSize: 12 }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13 }}>
                        {s.name} <span style={{ color: inkDim }}>· {s.time}</span>
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => startEditSupp(s)} style={tinyBtn}>
                          Edit
                        </button>
                        <button onClick={() => deleteSupplement(s.id)} style={tinyBtn}>
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input placeholder="New supplement name" value={newSuppName} onChange={(e) => setNewSuppName(e.target.value)} style={{ ...smallInputStyle, flex: 1 }} />
              <input placeholder="Time (optional)" value={newSuppTime} onChange={(e) => setNewSuppTime(e.target.value)} style={{ ...smallInputStyle, flex: 1 }} />
              <button onClick={addSupplement} style={{ ...primaryBtn, padding: "6px 12px", fontSize: 13 }}>
                Add
              </button>
            </div>
          </div>
        )}

        {/* ---- Weight ---- */}
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

        {/* ---- Water ---- */}
        <div style={{ ...sectionLabel, marginTop: 20 }}>
          WATER · {(waterTotal / 1000).toFixed(2)}L today
        </div>
        <div style={cardStyle}>
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

        <div style={{ textAlign: "center", fontSize: 11, color: inkDim, marginTop: 24, paddingBottom: 8 }}>
          {weights.length > 0 ? `${weights[weights.length - 1]!.weight}kg` : "Cutting"} · {KCAL_GOAL} kcal · {PROTEIN_GOAL}g protein · PPL ×2
        </div>
      </div>
    </div>
  );
}
