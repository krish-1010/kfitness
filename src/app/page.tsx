"use client";

import { useEffect, useState, useCallback } from "react";
import Body from "react-muscle-highlighter";
import { PROTEIN_GOAL, KCAL_GOAL } from "@/lib/constants";
import { muscleGroupsToBodyData } from "@/lib/muscleSlug";
import { MUSCLE_TAXONOMY } from "@/lib/muscleTaxonomy";

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

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type LogItem = { id: number; name: string; protein: number; kcal: number };
type DayLog = { items: LogItem[]; supplements: Record<string, boolean> };
type WeightEntry = { date: string; weight: number };
type WaterEntry = { id: number; date: string; amountMl: number; createdAt: string };
type Food = { id: number; name: string; protein: number; kcal: number; archived: boolean };
type Supplement = { id: number; name: string; time: string; archived: boolean };
type TrackingType = "reps_weight" | "duration_distance";
type VariantMode = "none" | "strength_hypertrophy";
type PlanDay = { id: number; planId: number; dayIndex: number; label: string; variantMode: VariantMode };
type Plan = { id: number; name: string; isActive: boolean; fixedRestWeekday: number | null };
type Exercise = {
  id: number;
  name: string;
  planDayId: number;
  defaultSets: number;
  defaultReps: string;
  restSeconds: number | null;
  variant: string;
  block: string;
  muscleGroup: string;
  trackingType: TrackingType;
  linkCount: number;
  archived: boolean;
};
type SetRow = {
  id: number;
  setNumber: number;
  reps: string | null;
  weight: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  done: boolean;
};
type ExerciseLogRow = {
  id: number;
  exerciseId: number;
  targetSets: number | null;
  done: boolean;
  name: string | null;
  defaultSets: number | null;
  defaultReps: string | null;
  restSeconds: number | null;
  block: string | null;
  muscleGroup: string | null;
  trackingType: TrackingType | null;
  linkCount: number;
  sets: SetRow[];
};
type ExerciseLink = { id: number; label: string; url: string };
type Variant = "strength" | "hypertrophy" | null;
type WorkoutState = {
  planDayId: number | null; // null = Rest
  label: string;
  variantMode: VariantMode;
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

function MuscleBadge({ muscleGroup, onClick, linkCount }: { muscleGroup: string; onClick?: () => void; linkCount?: number }) {
  if (!muscleGroup) return null;
  const color = muscleColor(muscleGroup);
  const style = {
    fontSize: 10,
    color,
    border: `1px solid ${color}55`,
    padding: "1px 5px",
    whiteSpace: "nowrap" as const,
    background: "none",
    cursor: onClick ? "pointer" : "default",
  };
  const label = linkCount ? `${muscleGroup} · ▶${linkCount}` : muscleGroup;
  if (!onClick) return <span style={style}>{label}</span>;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={style}
    >
      {label}
    </button>
  );
}

type DetailTarget = { id: number; name: string; muscleGroup: string; manage: boolean };

// Clicking an exercise's muscle badge anywhere opens this: a clear, single
// exercise's target muscle at a readable size (not the tiny whole-day
// aggregate diagram) plus its tutorial links, combined in one place instead
// of two ("what does this hit" and "how do I do it" are the same question).
function ExerciseDetailModal({ target, onClose }: { target: DetailTarget; onClose: () => void }) {
  const [links, setLinks] = useState<ExerciseLink[] | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    fetch(`/api/exercises/${target.id}/links`)
      .then((r) => r.json())
      .then(setLinks);
  }, [target.id]);

  const removeLink = async (linkId: number) => {
    setLinks((prev) => (prev ?? []).filter((l) => l.id !== linkId));
    await fetch(`/api/exercises/${target.id}/links/${linkId}`, { method: "DELETE" });
  };

  const addLink = async () => {
    if (!newUrl.trim()) return;
    const res = await fetch(`/api/exercises/${target.id}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim(), url: newUrl.trim() }),
    });
    const row = await res.json();
    setLinks((prev) => [...(prev ?? []), row]);
    setNewLabel("");
    setNewUrl("");
  };

  // Full intensity on the single target region — this is "where does THIS
  // exercise hit", not a multi-exercise heat map, so there's only one level.
  const data = muscleGroupsToBodyData([target.muscleGroup]).map((d) => ({ ...d, intensity: 3 }));

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: bg2, border: `1px solid ${line}`, maxWidth: 380, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: 16 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{target.name}</div>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${line}`, color: inkDim, padding: "2px 8px" }}>
            ✕
          </button>
        </div>
        <MuscleBadge muscleGroup={target.muscleGroup} />

        {data.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "14px 0" }}>
            <Body data={data} side="front" gender="male" scale={0.55} colors={["#4a3b21", "#8a6a2f", amber]} defaultFill={bg} border={line} />
            <Body data={data} side="back" gender="male" scale={0.55} colors={["#4a3b21", "#8a6a2f", amber]} defaultFill={bg} border={line} />
          </div>
        )}

        <div style={{ fontSize: 11, color: inkDim, marginBottom: 6, letterSpacing: 0.3 }}>TUTORIAL LINKS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: target.manage ? 10 : 0 }}>
          {links === null ? (
            <span style={{ fontSize: 12, color: inkDim }}>Loading…</span>
          ) : links.length === 0 ? (
            <span style={{ fontSize: 12, color: inkDim }}>No tutorial links yet</span>
          ) : (
            links.map((l) => (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: amber }}>
                  {l.label || l.url}
                </a>
                {target.manage && (
                  <button onClick={() => removeLink(l.id)} style={{ background: "none", border: "none", color: inkDim, fontSize: 12, padding: 2 }}>
                    ✕
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        {target.manage && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: `1px solid ${line}`, paddingTop: 10 }}>
            <input
              placeholder="Label (e.g. Form check)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              style={smallInputStyle}
            />
            <input placeholder="URL" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} style={smallInputStyle} />
            <button onClick={addLink} style={{ ...secondaryBtn }}>
              + Add link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact front/back body diagram, collapsed behind a toggle so it doesn't
// eat screen real estate by default — highlights whichever muscle groups
// today's exercises (logged + suggested) actually cover.
function MuscleDiagram({ muscleGroups }: { muscleGroups: string[] }) {
  const [shown, setShown] = useState(false);
  const data = muscleGroupsToBodyData(muscleGroups);
  if (data.length === 0) return null;

  return (
    <div style={{ marginBottom: 10 }}>
      <button
        onClick={() => setShown((v) => !v)}
        style={{ fontSize: 11, color: inkDim, background: "none", border: `1px solid ${line}`, padding: "4px 8px", cursor: "pointer" }}
      >
        {shown ? "Hide" : "👁 Muscles worked today"}
      </button>
      {shown && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
          <Body data={data} side="front" gender="male" scale={0.32} colors={["#4a3b21", "#8a6a2f", amber]} defaultFill={bg2} border={line} />
          <Body data={data} side="back" gender="male" scale={0.32} colors={["#4a3b21", "#8a6a2f", amber]} defaultFill={bg2} border={line} />
        </div>
      )}
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
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [planDaysList, setPlanDaysList] = useState<PlanDay[]>([]);
  const [workout, setWorkout] = useState<WorkoutState>({
    planDayId: null,
    label: "",
    variantMode: "none",
    status: "planned",
    suggested: true,
    variant: null,
    log: [],
  });

  const [customName, setCustomName] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customKcal, setCustomKcal] = useState("");
  const [showCustomFood, setShowCustomFood] = useState(false);
  const [showManageFoods, setShowManageFoods] = useState(false);
  const [foodQuery, setFoodQuery] = useState("");
  const [foodPage, setFoodPage] = useState(0);
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
  const [programPage, setProgramPage] = useState(0);
  const [editingExId, setEditingExId] = useState<number | null>(null);
  const [exEdit, setExEdit] = useState({
    name: "",
    planDayId: null as number | null,
    defaultSets: "3",
    defaultReps: "8-12",
    muscleGroup: "",
    trackingType: "reps_weight" as TrackingType,
  });
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [expandedPlanDays, setExpandedPlanDays] = useState<Set<number>>(new Set());
  const [showManagePlans, setShowManagePlans] = useState(false);
  const [plansList, setPlansList] = useState<(Plan & { days: PlanDay[] })[]>([]);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanDayLabels, setNewPlanDayLabels] = useState<string[]>(["", "", ""]);
  const [newPlanRestWeekday, setNewPlanRestWeekday] = useState<number | null>(null);
  const [editingPlanNameId, setEditingPlanNameId] = useState<number | null>(null);
  const [planNameEdit, setPlanNameEdit] = useState("");
  const [editingDayId, setEditingDayId] = useState<number | null>(null);
  const [dayLabelEdit, setDayLabelEdit] = useState("");
  const [newDayLabelByPlan, setNewDayLabelByPlan] = useState<Record<number, string>>({});
  const [planActionError, setPlanActionError] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);

  const [weightInput, setWeightInput] = useState("");
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [waterTotal, setWaterTotal] = useState(0);
  const [waterTarget, setWaterTarget] = useState<number | null>(null);
  const [editingWaterTarget, setEditingWaterTarget] = useState(false);
  const [waterTargetInput, setWaterTargetInput] = useState("");
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

  const loadWorkout = useCallback(async (d: string, previewPlanDayId?: number | "rest") => {
    const url =
      previewPlanDayId !== undefined ? `/api/workout?date=${d}&previewPlanDayId=${previewPlanDayId}` : `/api/workout?date=${d}`;
    const res = await fetch(url);
    const data: WorkoutState = await res.json();
    setWorkout(data);
    if (data.planDayId !== null) {
      const variantParam = data.variant ? `&variant=${data.variant}` : "";
      const exRes = await fetch(`/api/exercises?planDayId=${data.planDayId}${variantParam}`);
      setExerciseOptions(await exRes.json());
    } else {
      setExerciseOptions([]);
    }
  }, []);

  const loadAllExercises = useCallback(async () => {
    const res = await fetch("/api/exercises");
    setAllExercises(await res.json());
  }, []);

  const loadPlan = useCallback(async () => {
    const res = await fetch("/api/plan");
    const data: { plan: Plan | null; days: PlanDay[] } = await res.json();
    setActivePlan(data.plan);
    setPlanDaysList(data.days);
  }, []);

  const loadPlans = useCallback(async () => {
    const res = await fetch("/api/plans");
    setPlansList(await res.json());
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

  // The active plan (day labels, cycle order) is not date-scoped, loads once.
  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

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
  const commitSession = async (planDayId: number | null, status: string, isManualOverride = false) => {
    await fetch("/api/workout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, planDayId, status, isManualOverride }),
    });
    await loadWorkout(date);
  };

  const addExerciseToLog = async (ex: Exercise) => {
    // The plan day shown might still be an unsaved preview (browsing "what
    // would Legs look like today" via the dropdown never writes anything —
    // see the previewPlanDayId handling in loadWorkout / /api/workout). The
    // moment you actually log an exercise against it, that's a real
    // decision, so commit it as this date's official (possibly overridden)
    // plan day before writing the log row.
    if (workout.suggested) {
      await fetch("/api/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, planDayId: workout.planDayId, status: "planned", isManualOverride: true }),
      });
      setWorkout((prev) => ({ ...prev, suggested: false }));
    }
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
          trackingType: ex.trackingType,
          linkCount: ex.linkCount,
        },
      ],
    }));
  };

  // Only ever called with { done } now — per-set fields go through
  // updateSetRow/addSetRow/removeSetRow below.
  const updateLogRow = async (id: number, done: boolean) => {
    setWorkout((prev) => ({ ...prev, log: prev.log.map((r) => (r.id === id ? { ...r, done } : r)) }));
    await fetch(`/api/workout/log/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
  };

  const removeLogRow = async (id: number) => {
    setWorkout((prev) => ({ ...prev, log: prev.log.filter((r) => r.id !== id) }));
    await fetch(`/api/workout/log/${id}`, { method: "DELETE" });
  };

  const updateSetRow = async (logId: number, setId: number, patch: Partial<SetRow>) => {
    setWorkout((prev) => ({
      ...prev,
      log: prev.log.map((r) => (r.id === logId ? { ...r, sets: r.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) } : r)),
    }));
    await fetch(`/api/workout/log/${logId}/sets/${setId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  };

  const addSetRow = async (logId: number) => {
    const res = await fetch(`/api/workout/log/${logId}/sets`, { method: "POST" });
    const row: SetRow = await res.json();
    setWorkout((prev) => ({ ...prev, log: prev.log.map((r) => (r.id === logId ? { ...r, sets: [...r.sets, row] } : r)) }));
  };

  const removeSetRow = async (logId: number, setId: number) => {
    setWorkout((prev) => ({
      ...prev,
      log: prev.log.map((r) => (r.id === logId ? { ...r, sets: r.sets.filter((s) => s.id !== setId) } : r)),
    }));
    await fetch(`/api/workout/log/${logId}/sets/${setId}`, { method: "DELETE" });
  };

  const addCustomExercise = async () => {
    if (!customExName.trim() || workout.planDayId === null) return;
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: customExName.trim(),
        planDayId: workout.planDayId,
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
      planDayId: ex.planDayId,
      defaultSets: String(ex.defaultSets),
      defaultReps: ex.defaultReps,
      muscleGroup: ex.muscleGroup,
      trackingType: ex.trackingType,
    });
  };

  const saveEditEx = async (id: number) => {
    const res = await fetch(`/api/exercises/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: exEdit.name,
        planDayId: exEdit.planDayId,
        defaultSets: parseInt(exEdit.defaultSets) || 3,
        defaultReps: exEdit.defaultReps,
        muscleGroup: exEdit.muscleGroup,
        trackingType: exEdit.trackingType,
      }),
    });
    const updated = await res.json();
    // Merge rather than replace — the PATCH response doesn't carry linkCount.
    setAllExercises((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
    setEditingExId(null);
  };

  const deleteEx = async (id: number) => {
    setAllExercises((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/exercises/${id}`, { method: "DELETE" });
  };

  // Any plan/day mutation can change what today's view should show (label,
  // variant alternation, which plan is active), so every handler below
  // refreshes both the plans list and the live day state — these are cheap
  // GETs and this modal is a low-frequency admin surface, not the hot path.
  const refreshAfterPlanChange = async () => {
    await Promise.all([loadPlans(), loadPlan(), loadWorkout(date)]);
  };

  const createPlan = async () => {
    const labels = newPlanDayLabels.map((l) => l.trim()).filter(Boolean);
    if (!newPlanName.trim() || labels.length === 0) return;
    await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPlanName.trim(), dayLabels: labels, fixedRestWeekday: newPlanRestWeekday }),
    });
    setNewPlanName("");
    setNewPlanDayLabels(["", "", ""]);
    setNewPlanRestWeekday(null);
    await refreshAfterPlanChange();
  };

  const activatePlan = async (id: number) => {
    await fetch(`/api/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    await refreshAfterPlanChange();
  };

  const startEditPlanName = (plan: Plan) => {
    setEditingPlanNameId(plan.id);
    setPlanNameEdit(plan.name);
  };

  const savePlanName = async (id: number) => {
    if (!planNameEdit.trim()) return;
    await fetch(`/api/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: planNameEdit.trim() }),
    });
    setEditingPlanNameId(null);
    await refreshAfterPlanChange();
  };

  const setPlanRestWeekday = async (id: number, value: number | null) => {
    await fetch(`/api/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fixedRestWeekday: value }),
    });
    await refreshAfterPlanChange();
  };

  const archivePlan = async (id: number) => {
    await fetch(`/api/plans/${id}`, { method: "DELETE" });
    await refreshAfterPlanChange();
  };

  const addDayToPlan = async (planId: number) => {
    const label = (newDayLabelByPlan[planId] || "").trim();
    if (!label) return;
    await fetch(`/api/plans/${planId}/days`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    setNewDayLabelByPlan((prev) => ({ ...prev, [planId]: "" }));
    await refreshAfterPlanChange();
  };

  const startEditDay = (day: PlanDay) => {
    setEditingDayId(day.id);
    setDayLabelEdit(day.label);
  };

  const saveDayLabel = async (planId: number, dayId: number) => {
    if (!dayLabelEdit.trim()) return;
    await fetch(`/api/plans/${planId}/days/${dayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: dayLabelEdit.trim() }),
    });
    setEditingDayId(null);
    await refreshAfterPlanChange();
  };

  const setDayVariantMode = async (planId: number, dayId: number, variantMode: VariantMode) => {
    await fetch(`/api/plans/${planId}/days/${dayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantMode }),
    });
    await refreshAfterPlanChange();
  };

  const moveDay = async (planId: number, dayId: number, direction: -1 | 1) => {
    const plan = plansList.find((p) => p.id === planId);
    if (!plan) return;
    const ids = plan.days.map((d) => d.id);
    const idx = ids.indexOf(dayId);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= ids.length) return;
    [ids[idx], ids[newIdx]] = [ids[newIdx]!, ids[idx]!];
    await fetch(`/api/plans/${planId}/days`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedDayIds: ids }),
    });
    await refreshAfterPlanChange();
  };

  const removeDay = async (planId: number, dayId: number) => {
    setPlanActionError(null);
    const res = await fetch(`/api/plans/${planId}/days/${dayId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setPlanActionError(data.error || "Could not delete this day.");
      return;
    }
    await refreshAfterPlanChange();
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

  const exDoneCount = workout.log.filter((r) => r.done).length;

  // Manage-exercise-library rows: a search flattens everything into a plain
  // filtered list; with no query, group into collapsible per-plan-day
  // sections instead — the library's long enough now that showing it all
  // flat was the actual complaint.
  const filteredFoods = foodQuery.trim()
    ? foods.filter((f) => f.name.toLowerCase().includes(foodQuery.trim().toLowerCase()))
    : foods;
  const FOOD_PAGE_SIZE = 10;
  const foodPageCount = Math.max(1, Math.ceil(filteredFoods.length / FOOD_PAGE_SIZE));
  const clampedFoodPage = Math.min(foodPage, foodPageCount - 1);
  const pagedFoods = filteredFoods.slice(clampedFoodPage * FOOD_PAGE_SIZE, (clampedFoodPage + 1) * FOOD_PAGE_SIZE);

  const exerciseSearchActive = exerciseQuery.trim().length > 0;
  const manageExerciseRows: ({ type: "header"; key: number; label: string } | { type: "exercise"; ex: Exercise })[] = [];
  if (exerciseSearchActive) {
    const q = exerciseQuery.trim().toLowerCase();
    allExercises
      .filter((ex) => ex.name.toLowerCase().includes(q) || ex.muscleGroup.toLowerCase().includes(q))
      .forEach((ex) => manageExerciseRows.push({ type: "exercise", ex }));
  } else {
    planDaysList.forEach((pd) => {
      const group = allExercises.filter((ex) => ex.planDayId === pd.id);
      if (group.length === 0) return;
      manageExerciseRows.push({ type: "header", key: pd.id, label: `${pd.label} (${group.length})` });
      if (expandedPlanDays.has(pd.id)) {
        group.forEach((ex) => manageExerciseRows.push({ type: "exercise", ex }));
      }
    });
  }

  const planDayById: Record<number, PlanDay> = Object.fromEntries(planDaysList.map((d) => [d.id, d]));

  type ProgramSection = { planDayId: number; variant: "strength" | "hypertrophy" | null; label: string };
  const programSections: ProgramSection[] = planDaysList.flatMap((day): ProgramSection[] =>
    day.variantMode === "strength_hypertrophy"
      ? [
          { planDayId: day.id, variant: "strength", label: `${day.label} · Strength` },
          { planDayId: day.id, variant: "hypertrophy", label: `${day.label} · Hypertrophy` },
        ]
      : [{ planDayId: day.id, variant: null, label: day.label }]
  );

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
            background: workout.planDayId === null ? bg2 : `linear-gradient(135deg, ${bg2}, ${bg})`,
            border: `1px solid ${workout.planDayId === null ? line : amber + "55"}`,
            padding: "14px 16px",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: workout.planDayId !== null ? 12 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 20 }}>{workout.planDayId === null ? "💤" : "🏋️"}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {workout.planDayId === null ? "Rest day" : `${workout.label} day`}
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
                {workout.planDayId !== null && (
                  <div style={{ fontSize: 12, color: inkDim }}>
                    {exDoneCount}/{workout.log.length || 0} exercises done
                  </div>
                )}
              </div>
            </div>
            <select
              value={workout.planDayId === null ? "rest" : String(workout.planDayId)}
              onChange={(e) => {
                const v = e.target.value;
                loadWorkout(date, v === "rest" ? "rest" : Number(v));
              }}
              style={{ ...smallInputStyle, width: "auto" }}
            >
              {planDaysList.map((day) => (
                <option key={day.id} value={String(day.id)}>
                  {day.label}
                </option>
              ))}
              <option value="rest">Rest</option>
            </select>
          </div>

          {workout.planDayId !== null && (
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
                          onClick={() => updateLogRow(row.id, !row.done)}
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
                        <MuscleBadge
                          muscleGroup={row.muscleGroup ?? ""}
                          linkCount={row.linkCount}
                          onClick={() =>
                            setDetailTarget({ id: row.exerciseId, name: row.name ?? "", muscleGroup: row.muscleGroup ?? "", manage: false })
                          }
                        />
                        <button onClick={() => removeLogRow(row.id)} style={{ background: "none", border: "none", color: inkDim, padding: 2 }}>
                          ✕
                        </button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 26 }}>
                        {row.sets.map((set) =>
                          row.trackingType === "duration_distance" ? (
                            <div key={set.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 11, color: inkDim, width: 14 }}>{set.setNumber}</span>
                              <input
                                type="number"
                                step={0.5}
                                min={0}
                                value={set.durationSeconds != null ? set.durationSeconds / 60 : ""}
                                placeholder="min"
                                onChange={(e) =>
                                  updateSetRow(row.id, set.id, {
                                    durationSeconds: e.target.value === "" ? null : Math.round(parseFloat(e.target.value) * 60),
                                  })
                                }
                                style={{ ...smallInputStyle, width: 60, textAlign: "center" }}
                              />
                              <input
                                type="number"
                                step={0.1}
                                min={0}
                                value={set.distanceMeters != null ? set.distanceMeters / 1000 : ""}
                                placeholder="km"
                                onChange={(e) =>
                                  updateSetRow(row.id, set.id, {
                                    distanceMeters: e.target.value === "" ? null : parseFloat(e.target.value) * 1000,
                                  })
                                }
                                style={{ ...smallInputStyle, width: 60, textAlign: "center" }}
                              />
                              <button
                                onClick={() => removeSetRow(row.id, set.id)}
                                style={{ background: "none", border: "none", color: inkDim, padding: 2, marginLeft: "auto" }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div key={set.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 11, color: inkDim, width: 14 }}>{set.setNumber}</span>
                              <input
                                value={set.reps ?? ""}
                                placeholder={row.defaultReps ?? "reps"}
                                onChange={(e) => updateSetRow(row.id, set.id, { reps: e.target.value })}
                                style={{ ...smallInputStyle, width: 55, textAlign: "center" }}
                              />
                              <input
                                type="number"
                                step={0.5}
                                value={set.weight ?? ""}
                                onChange={(e) => updateSetRow(row.id, set.id, { weight: e.target.value === "" ? null : parseFloat(e.target.value) })}
                                style={{ ...smallInputStyle, width: 55, textAlign: "center" }}
                                placeholder="kg"
                              />
                              <button
                                onClick={() => removeSetRow(row.id, set.id)}
                                style={{ background: "none", border: "none", color: inkDim, padding: 2, marginLeft: "auto" }}
                              >
                                ✕
                              </button>
                            </div>
                          )
                        )}
                        <button
                          onClick={() => addSetRow(row.id)}
                          style={{ alignSelf: "flex-start", fontSize: 11, color: inkDim, background: "none", border: `1px dashed ${line}`, padding: "2px 8px", marginTop: 2 }}
                        >
                          + set
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <MuscleDiagram
                muscleGroups={[
                  ...workout.log.map((r) => r.muscleGroup ?? ""),
                  ...exerciseOptions.map((ex) => ex.muscleGroup),
                ]}
              />

              {exerciseOptions.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {exerciseOptions
                    .filter((ex) => !workout.log.some((r) => r.exerciseId === ex.id))
                    .map((ex) => (
                      <div key={ex.id} style={{ ...tinyBtn, borderStyle: "dashed", display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
                        <button
                          onClick={() => addExerciseToLog(ex)}
                          style={{ background: "none", border: "none", color: "inherit", font: "inherit", padding: "5px 8px", cursor: "pointer" }}
                        >
                          + {ex.name}
                        </button>
                        <span style={{ paddingRight: 6 }}>
                          <MuscleBadge
                            muscleGroup={ex.muscleGroup}
                            linkCount={ex.linkCount}
                            onClick={() => setDetailTarget({ id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, manage: false })}
                          />
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {!showCustomExercise ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowCustomExercise(true)} style={{ ...secondaryBtn, flex: 1 }}>
                    + Custom exercise
                  </button>
                  <button onClick={() => commitSession(workout.planDayId, "done")} style={primaryBtn}>
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

          {workout.planDayId === null && workout.status !== "rest" && (
            <button onClick={() => commitSession(null, "rest", true)} style={{ ...secondaryBtn, marginTop: 10, width: "100%" }}>
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
              setProgramPage(0);
              loadAllExercises();
            }}
            style={{ ...tinyBtn, flex: 1 }}
          >
            Full program table
          </button>
          <button
            onClick={() => {
              setShowManagePlans(true);
              setPlanActionError(null);
              loadPlans();
            }}
            style={{ ...tinyBtn, flex: 1 }}
          >
            Manage plans
          </button>
        </div>

        {showFullProgram &&
          (() => {
            const section = programSections[programPage];
            if (!section) return null;
            const { planDayId, variant: v, label } = section;
            const sessionExercises = allExercises
              .filter((ex) => !ex.archived && ex.planDayId === planDayId && (v === null || ex.variant === v || ex.variant === "standard"))
              .sort((a, b) => {
                const order: Record<string, number> = { main: 0, core: 1, conditioning: 2 };
                return (order[a.block] ?? 0) - (order[b.block] ?? 0);
              });
            return (
              <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 10, overflowY: "auto" }}>
                <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 12px 20px" }}>
                  <div
                    style={{
                      position: "sticky",
                      top: 0,
                      background: bg,
                      zIndex: 1,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 0 10px",
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 600 }}>Full PPL Program</div>
                    <button onClick={() => setShowFullProgram(false)} style={navBtn}>
                      ✕
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <button onClick={() => setProgramPage((p) => Math.max(0, p - 1))} disabled={programPage === 0} style={navBtn}>
                      ‹
                    </button>
                    <div style={{ fontSize: 12, color: inkDim }}>
                      {programPage + 1} / {programSections.length}
                    </div>
                    <button
                      onClick={() => setProgramPage((p) => Math.min(programSections.length - 1, p + 1))}
                      disabled={programPage === programSections.length - 1}
                      style={navBtn}
                    >
                      ›
                    </button>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ background: amber + "22", color: amber, fontWeight: 600, padding: 6, fontSize: 12, border: `1px solid ${line}` }}>
                      {label}
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr>
                          {["Exercise", "Muscle", "Sets", "Reps", "Rest"].map((h) => (
                            <th
                              key={h}
                              style={{ border: `1px solid ${line}`, padding: "4px 6px", textAlign: "left", background: bg2, color: inkDim, fontSize: 10 }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sessionExercises.map((ex) => (
                          <tr key={ex.id}>
                            <td style={{ border: `1px solid ${line}`, padding: "4px 6px" }}>
                              {ex.name}
                              {ex.block !== "main" && <span style={{ color: inkDim }}> · {ex.block}</span>}
                            </td>
                            <td style={{ border: `1px solid ${line}`, padding: "4px 6px" }}>
                              <MuscleBadge
                                muscleGroup={ex.muscleGroup}
                                linkCount={ex.linkCount}
                                onClick={() => setDetailTarget({ id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, manage: false })}
                              />
                            </td>
                            <td style={{ border: `1px solid ${line}`, padding: "4px 6px" }}>{ex.defaultSets}</td>
                            <td style={{ border: `1px solid ${line}`, padding: "4px 6px" }}>{ex.defaultReps}</td>
                            <td style={{ border: `1px solid ${line}`, padding: "4px 6px" }}>{ex.restSeconds ? `${ex.restSeconds}s` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

        {showManagePlans && (
          <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 10, overflowY: "auto" }}>
            <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 12px 20px" }}>
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  background: bg,
                  zIndex: 1,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 0 10px",
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 600 }}>Manage Plans</div>
                <button onClick={() => setShowManagePlans(false)} style={navBtn}>
                  ✕
                </button>
              </div>

              {planActionError && (
                <div style={{ background: red + "22", color: red, padding: "8px 10px", fontSize: 12, marginBottom: 12, border: `1px solid ${red}55` }}>
                  {planActionError}
                </div>
              )}

              {plansList.map((plan) => (
                <div key={plan.id} style={{ ...cardStyle, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
                    {editingPlanNameId === plan.id ? (
                      <div style={{ display: "flex", gap: 6, flex: 1, minWidth: 160 }}>
                        <input value={planNameEdit} onChange={(e) => setPlanNameEdit(e.target.value)} style={{ ...smallInputStyle, flex: 1 }} />
                        <button onClick={() => savePlanName(plan.id)} style={tinyBtn}>
                          Save
                        </button>
                        <button onClick={() => setEditingPlanNameId(null)} style={tinyBtn}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{plan.name}</span>
                        {plan.isActive && <span style={{ fontSize: 11, color: green, fontWeight: 400 }}>· active</span>}
                        <button onClick={() => startEditPlanName(plan)} style={tinyBtn}>
                          Rename
                        </button>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6 }}>
                      {!plan.isActive && (
                        <button onClick={() => activatePlan(plan.id)} style={{ ...tinyBtn, color: amber, borderColor: amber + "55" }}>
                          Activate
                        </button>
                      )}
                      <button onClick={() => archivePlan(plan.id)} style={tinyBtn}>
                        Archive
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 12, color: inkDim }}>
                    Fixed rest day:
                    <select
                      value={plan.fixedRestWeekday === null ? "" : String(plan.fixedRestWeekday)}
                      onChange={(e) => setPlanRestWeekday(plan.id, e.target.value === "" ? null : Number(e.target.value))}
                      style={{ ...smallInputStyle, width: "auto" }}
                    >
                      <option value="">None</option>
                      {WEEKDAY_NAMES.map((wd, i) => (
                        <option key={wd} value={i}>
                          {wd}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                    {plan.days.map((day, idx) => (
                      <div
                        key={day.id}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: bg, border: `1px solid ${line}`, padding: "6px 8px", flexWrap: "wrap" }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <button onClick={() => moveDay(plan.id, day.id, -1)} disabled={idx === 0} style={{ ...tinyBtn, padding: "0 6px", fontSize: 10, lineHeight: "14px" }}>
                            ▲
                          </button>
                          <button
                            onClick={() => moveDay(plan.id, day.id, 1)}
                            disabled={idx === plan.days.length - 1}
                            style={{ ...tinyBtn, padding: "0 6px", fontSize: 10, lineHeight: "14px" }}
                          >
                            ▼
                          </button>
                        </div>
                        {editingDayId === day.id ? (
                          <input value={dayLabelEdit} onChange={(e) => setDayLabelEdit(e.target.value)} style={{ ...smallInputStyle, flex: 1, minWidth: 100 }} />
                        ) : (
                          <span style={{ fontSize: 13, flex: 1, minWidth: 100 }}>{day.label}</span>
                        )}
                        <select
                          value={day.variantMode}
                          onChange={(e) => setDayVariantMode(plan.id, day.id, e.target.value as VariantMode)}
                          style={{ ...smallInputStyle, width: "auto", fontSize: 11 }}
                        >
                          <option value="none">No variants</option>
                          <option value="strength_hypertrophy">Strength/Hypertrophy</option>
                        </select>
                        {editingDayId === day.id ? (
                          <>
                            <button onClick={() => saveDayLabel(plan.id, day.id)} style={tinyBtn}>
                              Save
                            </button>
                            <button onClick={() => setEditingDayId(null)} style={tinyBtn}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditDay(day)} style={tinyBtn}>
                              Rename
                            </button>
                            <button onClick={() => removeDay(plan.id, day.id)} style={tinyBtn}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={newDayLabelByPlan[plan.id] || ""}
                      onChange={(e) => setNewDayLabelByPlan((prev) => ({ ...prev, [plan.id]: e.target.value }))}
                      placeholder="New day label, e.g. Upper A"
                      style={{ ...smallInputStyle, flex: 1 }}
                    />
                    <button onClick={() => addDayToPlan(plan.id)} style={tinyBtn}>
                      + Add day
                    </button>
                  </div>
                </div>
              ))}

              <div style={cardStyle}>
                <div style={sectionLabel}>CREATE NEW PLAN</div>
                <input
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="Plan name, e.g. Upper/Lower"
                  style={{ ...inputStyle, width: "100%", marginBottom: 8, boxSizing: "border-box" }}
                />
                {newPlanDayLabels.map((label, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <input
                      value={label}
                      onChange={(e) => setNewPlanDayLabels((prev) => prev.map((l, j) => (j === i ? e.target.value : l)))}
                      placeholder={`Day ${i + 1} label`}
                      style={{ ...smallInputStyle, flex: 1 }}
                    />
                    <button
                      onClick={() => setNewPlanDayLabels((prev) => prev.filter((_, j) => j !== i))}
                      disabled={newPlanDayLabels.length <= 1}
                      style={tinyBtn}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <button onClick={() => setNewPlanDayLabels((prev) => [...prev, ""])} style={{ ...secondaryBtn, flex: 1, padding: "6px 10px", fontSize: 12 }}>
                    + Add day
                  </button>
                  <select
                    value={newPlanRestWeekday === null ? "" : String(newPlanRestWeekday)}
                    onChange={(e) => setNewPlanRestWeekday(e.target.value === "" ? null : Number(e.target.value))}
                    style={{ ...smallInputStyle, width: "auto" }}
                  >
                    <option value="">No fixed rest day</option>
                    {WEEKDAY_NAMES.map((wd, i) => (
                      <option key={wd} value={i}>
                        {wd}
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={createPlan} style={{ ...primaryBtn, width: "100%" }}>
                  Create plan
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          {showManageExercises && (
            <>
              <input
                value={exerciseQuery}
                onChange={(e) => setExerciseQuery(e.target.value)}
                placeholder="Search exercises or muscle group…"
                style={{ ...smallInputStyle, width: "100%", marginTop: 8, marginBottom: 8, boxSizing: "border-box" }}
              />
              <div style={{ border: `1px solid ${line}` }}>
                {manageExerciseRows.map((row, idx) => {
                  if (row.type === "header") {
                    const expanded = expandedPlanDays.has(row.key);
                    return (
                      <button
                        key={row.key}
                        onClick={() =>
                          setExpandedPlanDays((prev) => {
                            const next = new Set(prev);
                            if (next.has(row.key)) next.delete(row.key);
                            else next.add(row.key);
                            return next;
                          })
                        }
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: bg2,
                          border: "none",
                          borderBottom: `1px solid ${line}`,
                          color: amber,
                          fontWeight: 600,
                          fontSize: 13,
                          padding: "8px 10px",
                          cursor: "pointer",
                        }}
                      >
                        {expanded ? "▾" : "▸"} {row.label}
                      </button>
                    );
                  }
                  const ex = row.ex;
                  return (
                <div
                  key={ex.id}
                  style={{
                    padding: "8px 10px",
                    borderBottom: idx < manageExerciseRows.length - 1 ? `1px solid ${line}` : "none",
                  }}
                >
                  {editingExId === ex.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <input value={exEdit.name} onChange={(e) => setExEdit({ ...exEdit, name: e.target.value })} style={smallInputStyle} />
                      <div style={{ display: "flex", gap: 6 }}>
                        <select
                          value={exEdit.planDayId === null ? "" : String(exEdit.planDayId)}
                          onChange={(e) => setExEdit({ ...exEdit, planDayId: Number(e.target.value) })}
                          style={smallInputStyle}
                        >
                          {planDaysList.map((day) => (
                            <option key={day.id} value={String(day.id)}>
                              {day.label}
                            </option>
                          ))}
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
                      <select
                        value={exEdit.muscleGroup}
                        onChange={(e) => setExEdit({ ...exEdit, muscleGroup: e.target.value })}
                        style={smallInputStyle}
                      >
                        <option value="">— none —</option>
                        {MUSCLE_TAXONOMY.map((g) => (
                          <optgroup key={g.group} label={g.group}>
                            {g.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <select
                        value={exEdit.trackingType}
                        onChange={(e) => setExEdit({ ...exEdit, trackingType: e.target.value as TrackingType })}
                        style={smallInputStyle}
                      >
                        <option value="reps_weight">Sets × reps × weight</option>
                        <option value="duration_distance">Duration / distance (cardio)</option>
                      </select>
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
                        {ex.name} <span style={{ color: inkDim }}>· {planDayById[ex.planDayId]?.label ?? "?"} · {ex.defaultSets}×{ex.defaultReps}</span>
                        <MuscleBadge
                          muscleGroup={ex.muscleGroup}
                          linkCount={ex.linkCount}
                          onClick={() => setDetailTarget({ id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, manage: true })}
                        />
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
                  );
                })}
              </div>
            </>
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
        <div style={{ ...sectionLabel, marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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

        <div style={{ textAlign: "center", fontSize: 11, color: inkDim, marginTop: 24, paddingBottom: 8 }}>
          {weights.length > 0 ? `${weights[weights.length - 1]!.weight}kg` : "Cutting"} · {KCAL_GOAL} kcal · {PROTEIN_GOAL}g protein · PPL ×2
        </div>
      </div>
      {detailTarget && <ExerciseDetailModal target={detailTarget} onClose={() => setDetailTarget(null)} />}
    </div>
  );
}
