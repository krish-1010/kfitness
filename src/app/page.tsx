"use client";

import { useEffect, useState, useCallback } from "react";
import { SUPPLEMENTS, PROTEIN_GOAL, KCAL_GOAL } from "@/lib/constants";

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TODAY = () => toLocalDateStr(new Date());

type LogItem = { id: number; name: string; protein: number; kcal: number };
type DayLog = { items: LogItem[]; supplements: Record<string, boolean> };
type WeightEntry = { date: string; weight: number };
type Food = {
  id: number;
  name: string;
  protein: number;
  kcal: number;
  archived: boolean;
};
type Exercise = {
  id: number;
  name: string;
  dayType: string;
  defaultSets: number;
  defaultReps: string;
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
};
type DayType = "Push" | "Pull" | "Legs" | "Rest";
type WorkoutState = {
  dayType: DayType;
  status: string;
  suggested: boolean;
  log: ExerciseLogRow[];
};

const ink = "#EDEAE3",
  inkDim = "#9A968C",
  bg = "#15140F",
  bg2 = "#1D1B15",
  line = "#2C2A22",
  amber = "#D4922C",
  green = "#7FA66B",
  red = "#C1604B";

function ProgressBar({
  value,
  goal,
  color,
}: {
  value: number;
  goal: number;
  color: string;
}) {
  const pct = Math.min(100, (value / goal) * 100);
  return (
    <div
      style={{
        height: 8,
        background: bg,
        overflow: "hidden",
        border: `1px solid ${line}`,
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

const cardStyle = {
  background: bg2,
  border: `1px solid ${line}`,
  padding: 14,
} as const;
const inputStyle = {
  background: bg,
  border: `1px solid ${line}`,
  color: ink,
  padding: "9px 10px",
  fontSize: 14,
  outline: "none",
  width: "100%",
} as const;
const smallInputStyle = {
  ...inputStyle,
  padding: "6px 8px",
  fontSize: 13,
} as const;
const primaryBtn = {
  background: amber,
  border: "none",
  color: bg,
  padding: "9px 16px",
  fontSize: 14,
  fontWeight: 600,
  whiteSpace: "nowrap",
} as const;
const secondaryBtn = {
  background: "none",
  border: `1px solid ${line}`,
  color: inkDim,
  padding: "9px 16px",
  fontSize: 14,
} as const;
const tinyBtn = {
  background: "none",
  border: `1px solid ${line}`,
  color: inkDim,
  padding: "5px 10px",
  fontSize: 12,
} as const;
const sectionLabel = {
  marginBottom: 8,
  fontSize: 13,
  color: inkDim,
  fontWeight: 600,
  letterSpacing: 0.3,
} as const;

export default function App() {
  const [date, setDate] = useState(TODAY());
  const [log, setLog] = useState<DayLog>({ items: [], supplements: {} });
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [exerciseOptions, setExerciseOptions] = useState<Exercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [workout, setWorkout] = useState<WorkoutState>({
    dayType: "Push",
    status: "planned",
    suggested: true,
    log: [],
  });

  const [customName, setCustomName] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customKcal, setCustomKcal] = useState("");
  const [showCustomFood, setShowCustomFood] = useState(false);
  const [showManageFoods, setShowManageFoods] = useState(false);
  const [editingFoodId, setEditingFoodId] = useState<number | null>(null);
  const [foodEdit, setFoodEdit] = useState({ name: "", protein: "", kcal: "" });

  const [customExName, setCustomExName] = useState("");
  const [customExSets, setCustomExSets] = useState("3");
  const [customExReps, setCustomExReps] = useState("8-12");
  const [showCustomExercise, setShowCustomExercise] = useState(false);
  const [showManageExercises, setShowManageExercises] = useState(false);
  const [editingExId, setEditingExId] = useState<number | null>(null);
  const [exEdit, setExEdit] = useState({
    name: "",
    dayType: "Push",
    defaultSets: "3",
    defaultReps: "8-12",
  });

  const [weightInput, setWeightInput] = useState("");
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

  const loadWorkout = useCallback(async (d: string) => {
    const res = await fetch(`/api/workout?date=${d}`);
    const data: WorkoutState = await res.json();
    setWorkout(data);
    if (data.dayType !== "Rest") {
      const exRes = await fetch(`/api/exercises?dayType=${data.dayType}`);
      setExerciseOptions(await exRes.json());
    } else {
      setExerciseOptions([]);
    }
  }, []);

  const loadAllExercises = useCallback(async () => {
    const res = await fetch("/api/exercises");
    setAllExercises(await res.json());
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadLog(date),
      loadWeights(),
      loadFoods(),
      loadWorkout(date),
    ]).finally(() => setLoading(false));
  }, [date, loadLog, loadWeights, loadFoods, loadWorkout]);

  const totalProtein = log.items.reduce((s, i) => s + i.protein, 0);
  const totalKcal = log.items.reduce((s, i) => s + (i.kcal || 0), 0);

  // ---- Food ----
  const addFood = async (food: {
    name: string;
    protein: number;
    kcal: number;
  }) => {
    const res = await fetch("/api/log/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, ...food }),
    });
    const item = await res.json();
    setLog((prev) => ({ ...prev, items: [...prev.items, item] }));
  };

  const removeFood = async (id: number) => {
    setLog((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== id),
    }));
    await fetch(`/api/log/items/${id}`, { method: "DELETE" });
  };

  const addCustomFood = () => {
    if (!customName.trim() || !customProtein) return;
    addFood({
      name: customName.trim(),
      protein: parseFloat(customProtein) || 0,
      kcal: parseFloat(customKcal) || 0,
    });
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
    setFoodEdit({
      name: f.name,
      protein: String(f.protein),
      kcal: String(f.kcal),
    });
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
    setLog((prev) => ({
      ...prev,
      supplements: { ...prev.supplements, [id]: next },
    }));
    await fetch("/api/log/supplements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, supplementId: id, done: next }),
    });
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

  // ---- Workout / exercise ----
  const commitSession = async (
    dayType: DayType,
    status: string,
    isManualOverride = false,
  ) => {
    await fetch("/api/workout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, dayType, status, isManualOverride }),
    });
    await loadWorkout(date);
  };

  const addExerciseToLog = async (ex: Exercise) => {
    const res = await fetch("/api/workout/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        exerciseId: ex.id,
        sets: ex.defaultSets,
        reps: ex.defaultReps,
      }),
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
        },
      ],
    }));
  };

  const updateLogRow = async (id: number, patch: Partial<ExerciseLogRow>) => {
    setWorkout((prev) => ({
      ...prev,
      log: prev.log.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
    await fetch(`/api/workout/log/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  };

  const removeLogRow = async (id: number) => {
    setWorkout((prev) => ({
      ...prev,
      log: prev.log.filter((r) => r.id !== id),
    }));
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

  const suppDoneCount = SUPPLEMENTS.filter((s) => log.supplements[s.id]).length;
  const isToday = date === TODAY();
  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const last8Weights = weights.slice(-8);
  const minW = last8Weights.length
    ? Math.min(...last8Weights.map((w) => w.weight)) - 0.5
    : 0;
  const maxW = last8Weights.length
    ? Math.max(...last8Weights.map((w) => w.weight)) + 0.5
    : 1;

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
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: inkDim,
        }}
      >
        Loading…
      </div>
    );
  }

  const dayTypeColor = workout.dayType === "Rest" ? inkDim : amber;
  const exDoneCount = workout.log.filter((r) => r.done).length;

  return (
    <div style={{ minHeight: "100vh", padding: "24px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 0.5,
                color: inkDim,
                marginBottom: 2,
              }}
            >
              CUT LOG
            </div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>
              {dateLabel}
              {isToday ? " · Today" : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => shiftDate(-1)} style={navBtn}>
              ‹
            </button>
            <button
              onClick={() => shiftDate(1)}
              style={navBtn}
              disabled={isToday}
            >
              ›
            </button>
          </div>
        </div>

        {/* ---- Workout / exercise section ---- */}
        <div
          style={{
            background:
              workout.dayType === "Rest"
                ? bg2
                : `linear-gradient(135deg, ${bg2}, ${bg})`,
            border: `1px solid ${workout.dayType === "Rest" ? line : amber + "55"}`,
            padding: "14px 16px",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: workout.dayType !== "Rest" ? 12 : 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 20 }}>
                {workout.dayType === "Rest" ? "💤" : "🏋️"}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {workout.dayType === "Rest"
                    ? "Rest day"
                    : `${workout.dayType} day`}
                  {workout.suggested && (
                    <span
                      style={{ fontSize: 11, color: inkDim, fontWeight: 400 }}
                    >
                      {" "}
                      · suggested
                    </span>
                  )}
                  {workout.status === "done" && (
                    <span
                      style={{ fontSize: 11, color: green, fontWeight: 400 }}
                    >
                      {" "}
                      · done
                    </span>
                  )}
                  {workout.status === "skipped" && (
                    <span style={{ fontSize: 11, color: red, fontWeight: 400 }}>
                      {" "}
                      · skipped
                    </span>
                  )}
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
              onChange={(e) =>
                commitSession(e.target.value as DayType, "planned", true)
              }
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
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderBottom:
                          idx < workout.log.length - 1
                            ? `1px solid ${line}`
                            : "none",
                        background: bg,
                      }}
                    >
                      <button
                        onClick={() =>
                          updateLogRow(row.id, { done: !row.done })
                        }
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
                      <input
                        value={row.sets ?? ""}
                        onChange={(e) =>
                          updateLogRow(row.id, {
                            sets: parseInt(e.target.value) || 0,
                          })
                        }
                        style={{
                          ...smallInputStyle,
                          width: 40,
                          textAlign: "center",
                        }}
                        placeholder="sets"
                      />
                      <input
                        value={row.reps ?? ""}
                        onChange={(e) =>
                          updateLogRow(row.id, { reps: e.target.value })
                        }
                        style={{
                          ...smallInputStyle,
                          width: 55,
                          textAlign: "center",
                        }}
                        placeholder="reps"
                      />
                      <input
                        value={row.weight ?? ""}
                        onChange={(e) =>
                          updateLogRow(row.id, {
                            weight: parseFloat(e.target.value) || 0,
                          })
                        }
                        style={{
                          ...smallInputStyle,
                          width: 50,
                          textAlign: "center",
                        }}
                        placeholder="kg"
                      />
                      <button
                        onClick={() => removeLogRow(row.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: inkDim,
                          padding: 2,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {exerciseOptions.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginBottom: 10,
                  }}
                >
                  {exerciseOptions
                    .filter(
                      (ex) => !workout.log.some((r) => r.exerciseId === ex.id),
                    )
                    .map((ex) => (
                      <button
                        key={ex.id}
                        onClick={() => addExerciseToLog(ex)}
                        style={{ ...tinyBtn, borderStyle: "dashed" }}
                      >
                        + {ex.name}
                      </button>
                    ))}
                </div>
              )}

              {!showCustomExercise ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setShowCustomExercise(true)}
                    style={{ ...secondaryBtn, flex: 1 }}
                  >
                    + Custom exercise
                  </button>
                  <button
                    onClick={() => commitSession(workout.dayType, "done")}
                    style={primaryBtn}
                  >
                    Mark day done
                  </button>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <input
                    placeholder="Exercise name"
                    value={customExName}
                    onChange={(e) => setCustomExName(e.target.value)}
                    style={inputStyle}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      placeholder="Sets"
                      value={customExSets}
                      onChange={(e) => setCustomExSets(e.target.value)}
                      style={inputStyle}
                    />
                    <input
                      placeholder="Reps (e.g. 8-12)"
                      value={customExReps}
                      onChange={(e) => setCustomExReps(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={addCustomExercise}
                      style={{ ...primaryBtn, flex: 1 }}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowCustomExercise(false)}
                      style={{ ...secondaryBtn, flex: 1 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {workout.dayType === "Rest" && workout.status !== "rest" && (
            <button
              onClick={() => commitSession("Rest", "rest", true)}
              style={{ ...secondaryBtn, marginTop: 10, width: "100%" }}
            >
              Confirm rest day
            </button>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => {
              setShowManageExercises((v) => !v);
              if (!showManageExercises) loadAllExercises();
            }}
            style={{ ...tinyBtn, width: "100%" }}
          >
            {showManageExercises ? "Hide" : "Manage"} exercise library
          </button>
          {showManageExercises && (
            <div style={{ border: `1px solid ${line}`, marginTop: 8 }}>
              {allExercises.map((ex, idx) => (
                <div
                  key={ex.id}
                  style={{
                    padding: "8px 10px",
                    borderBottom:
                      idx < allExercises.length - 1
                        ? `1px solid ${line}`
                        : "none",
                  }}
                >
                  {editingExId === ex.id ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <input
                        value={exEdit.name}
                        onChange={(e) =>
                          setExEdit({ ...exEdit, name: e.target.value })
                        }
                        style={smallInputStyle}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <select
                          value={exEdit.dayType}
                          onChange={(e) =>
                            setExEdit({ ...exEdit, dayType: e.target.value })
                          }
                          style={smallInputStyle}
                        >
                          <option value="Push">Push</option>
                          <option value="Pull">Pull</option>
                          <option value="Legs">Legs</option>
                        </select>
                        <input
                          value={exEdit.defaultSets}
                          onChange={(e) =>
                            setExEdit({
                              ...exEdit,
                              defaultSets: e.target.value,
                            })
                          }
                          style={{ ...smallInputStyle, width: 50 }}
                        />
                        <input
                          value={exEdit.defaultReps}
                          onChange={(e) =>
                            setExEdit({
                              ...exEdit,
                              defaultReps: e.target.value,
                            })
                          }
                          style={{ ...smallInputStyle, width: 70 }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => saveEditEx(ex.id)}
                          style={{
                            ...primaryBtn,
                            flex: 1,
                            padding: "6px 10px",
                            fontSize: 12,
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingExId(null)}
                          style={{
                            ...secondaryBtn,
                            flex: 1,
                            padding: "6px 10px",
                            fontSize: 12,
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 13 }}>
                        {ex.name}{" "}
                        <span style={{ color: inkDim }}>
                          · {ex.dayType} · {ex.defaultSets}×{ex.defaultReps}
                        </span>
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={cardStyle}>
            <div style={{ fontSize: 11, color: inkDim, marginBottom: 6 }}>
              PROTEIN
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
              {totalProtein.toFixed(0)}
              <span style={{ fontSize: 14, color: inkDim, fontWeight: 400 }}>
                {" "}
                / {PROTEIN_GOAL}g
              </span>
            </div>
            <ProgressBar
              value={totalProtein}
              goal={PROTEIN_GOAL}
              color={totalProtein >= PROTEIN_GOAL ? green : amber}
            />
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 11, color: inkDim, marginBottom: 6 }}>
              CALORIES (est.)
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
              {totalKcal.toFixed(0)}
              <span style={{ fontSize: 14, color: inkDim, fontWeight: 400 }}>
                {" "}
                / {KCAL_GOAL}
              </span>
            </div>
            <ProgressBar
              value={totalKcal}
              goal={KCAL_GOAL}
              color={totalKcal > KCAL_GOAL ? red : green}
            />
          </div>
        </div>

        {/* ---- Add food ---- */}
        <div style={sectionLabel}>ADD FOOD</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 8,
            marginBottom: 10,
          }}
        >
          {foods.map((f) => (
            <button
              key={f.id}
              className="foodbtn"
              onClick={() => addFood(f)}
              style={foodBtnStyle}
            >
              <span style={{ fontSize: 13 }}>{f.name}</span>
              <span style={{ fontSize: 12, color: amber, fontWeight: 600 }}>
                {f.protein}g
              </span>
            </button>
          ))}
        </div>

        {!showCustomFood ? (
          <button
            onClick={() => setShowCustomFood(true)}
            style={{
              ...foodBtnStyle,
              width: "100%",
              justifyContent: "center",
              gap: 6,
              marginBottom: 10,
              borderStyle: "dashed",
            }}
          >
            + Custom item
          </button>
        ) : (
          <div
            style={{
              ...cardStyle,
              marginBottom: 10,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <input
              placeholder="Food name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Protein (g)"
                type="number"
                value={customProtein}
                onChange={(e) => setCustomProtein(e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder="Kcal (optional)"
                type="number"
                value={customKcal}
                onChange={(e) => setCustomKcal(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={addCustomFood}
                style={{ ...primaryBtn, flex: 1 }}
              >
                Log once
              </button>
              <button
                onClick={addFoodToLibrary}
                style={{ ...secondaryBtn, flex: 1 }}
              >
                Save to list
              </button>
              <button
                onClick={() => setShowCustomFood(false)}
                style={{ ...secondaryBtn, flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowManageFoods((v) => !v)}
          style={{ ...tinyBtn, width: "100%", marginBottom: 20 }}
        >
          {showManageFoods ? "Hide" : "Manage"} food list
        </button>
        {showManageFoods && (
          <div style={{ border: `1px solid ${line}`, marginBottom: 20 }}>
            {foods.map((f, idx) => (
              <div
                key={f.id}
                style={{
                  padding: "8px 10px",
                  borderBottom:
                    idx < foods.length - 1 ? `1px solid ${line}` : "none",
                }}
              >
                {editingFoodId === f.id ? (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    <input
                      value={foodEdit.name}
                      onChange={(e) =>
                        setFoodEdit({ ...foodEdit, name: e.target.value })
                      }
                      style={smallInputStyle}
                    />
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={foodEdit.protein}
                        onChange={(e) =>
                          setFoodEdit({ ...foodEdit, protein: e.target.value })
                        }
                        style={{ ...smallInputStyle, width: 70 }}
                        placeholder="protein"
                      />
                      <input
                        value={foodEdit.kcal}
                        onChange={(e) =>
                          setFoodEdit({ ...foodEdit, kcal: e.target.value })
                        }
                        style={{ ...smallInputStyle, width: 70 }}
                        placeholder="kcal"
                      />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => saveEditFood(f.id)}
                        style={{
                          ...primaryBtn,
                          flex: 1,
                          padding: "6px 10px",
                          fontSize: 12,
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingFoodId(null)}
                        style={{
                          ...secondaryBtn,
                          flex: 1,
                          padding: "6px 10px",
                          fontSize: 12,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13 }}>
                      {f.name}{" "}
                      <span style={{ color: inkDim }}>
                        · {f.protein}g · {f.kcal}kcal
                      </span>
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
                    borderBottom:
                      idx < log.items.length - 1 ? `1px solid ${line}` : "none",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{item.name}</span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: 13, color: amber }}>
                      {item.protein}g
                    </span>
                    <button
                      onClick={() => removeFood(item.id)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 4,
                        color: inkDim,
                      }}
                    >
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
                  borderBottom:
                    idx < SUPPLEMENTS.length - 1 ? `1px solid ${line}` : "none",
                  textAlign: "left",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      color: done ? inkDim : ink,
                      textDecoration: done ? "line-through" : "none",
                    }}
                  >
                    {s.name}
                  </div>
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

        {/* ---- Weight ---- */}
        <div style={sectionLabel}>WEIGHT LOG</div>
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: last8Weights.length ? 16 : 0,
            }}
          >
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
              <svg
                viewBox="0 0 300 80"
                style={{ width: "100%", height: 80, overflow: "visible" }}
              >
                <polyline
                  points={last8Weights
                    .map((w, i) => {
                      const x =
                        last8Weights.length > 1
                          ? (i / (last8Weights.length - 1)) * 290 + 5
                          : 150;
                      const y =
                        75 - ((w.weight - minW) / (maxW - minW || 1)) * 70;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke={amber}
                  strokeWidth="2"
                />
                {last8Weights.map((w, i) => {
                  const x =
                    last8Weights.length > 1
                      ? (i / (last8Weights.length - 1)) * 290 + 5
                      : 150;
                  const y = 75 - ((w.weight - minW) / (maxW - minW || 1)) * 70;
                  return (
                    <circle key={w.date} cx={x} cy={y} r="3" fill={amber} />
                  );
                })}
              </svg>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: inkDim,
                  marginTop: 4,
                }}
              >
                <span>{last8Weights[0]!.weight}kg</span>
                <span>
                  {last8Weights[last8Weights.length - 1]!.weight}kg latest
                </span>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: inkDim,
            marginTop: 24,
            paddingBottom: 8,
          }}
        >
          90kg → cut · 2700-2800 kcal · 120g protein · PPL ×2
        </div>
      </div>
    </div>
  );
}
