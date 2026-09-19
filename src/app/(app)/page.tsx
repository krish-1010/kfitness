"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Body from "react-muscle-highlighter";
import { BodyChart, ViewSide, type BodyState } from "body-muscles";
import { muscleGroupsToBodyData } from "@/lib/muscleSlug";
import { muscleGroupsToBodyMusclesState, muscleGroupsToFullBodyMusclesState } from "@/lib/muscleBodyMuscles";
import { MUSCLE_TAXONOMY } from "@/lib/muscleTaxonomy";
import { useDate } from "./_lib/DateContext";
import { CenteredLoading } from "./_components/shared";

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Which body-diagram library is actually rendered. Both adapters
// (muscleSlug.ts for react-muscle-highlighter, muscleBodyMuscles.ts for
// body-muscles) are kept complete and independent, so falling back is this
// one line — nothing else in the app references either library directly
// except the MuscleBodyView component below.
const MUSCLE_DIAGRAM_BACKEND: "body-muscles" | "react-muscle-highlighter" = "body-muscles";

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
  priority: number;
  alternativeGroupId: number | null;
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
  alternatives: { id: number; name: string }[];
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

// Rough color family per muscle group prefix, purely visual grouping, not
// scientific. Falls back to a muted badge for anything unmapped.
function muscleBadgeClass(muscleGroup: string): string {
  const g = muscleGroup.toLowerCase();
  if (g.startsWith("chest") || g.startsWith("shoulder") || g.startsWith("tricep")) return "badge-primary";
  if (g.startsWith("back") || g.startsWith("bicep") || g.startsWith("forearm") || g.startsWith("trap")) return "badge-info";
  if (g.startsWith("quad") || g.startsWith("hamstring") || g.startsWith("glute") || g.startsWith("calf") || g.startsWith("adductor") || g.startsWith("abductor"))
    return "badge-success";
  if (g.startsWith("core") || g.startsWith("lower back")) return "badge-info2";
  return "badge-muted";
}

function MuscleBadge({ muscleGroup, onClick, linkCount }: { muscleGroup: string; onClick?: () => void; linkCount?: number }) {
  if (!muscleGroup) return null;
  const className = `badge ${muscleBadgeClass(muscleGroup)}`;
  const label = linkCount ? `${muscleGroup} · ▶${linkCount}` : muscleGroup;
  if (!onClick) return <span className={className}>{label}</span>;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={className}
    >
      {label}
    </button>
  );
}

// Renders one body-muscles view (front or back) into a plain div — the
// library exposes an imperative BodyChart class, not a React component, so
// this wraps it the way body-muscles' own docs recommend (useRef + useEffect,
// destroying on unmount, update()-ing in place when bodyState changes
// without tearing down and rebuilding the SVG).
function BodyMusclesPane({ side, bodyState, size }: { side: "front" | "back"; bodyState: BodyState; size: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<BodyChart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    chartRef.current = new BodyChart(containerRef.current, {
      view: side === "front" ? ViewSide.FRONT : ViewSide.BACK,
      bodyState,
      enableTransitions: true,
    });
    return () => chartRef.current?.destroy();
    // Only (re)build on side change — bodyState updates go through the
    // effect below via .update() so the SVG isn't torn down every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side]);

  useEffect(() => {
    chartRef.current?.update({ bodyState });
  }, [bodyState]);

  return <div ref={containerRef} style={{ width: size, height: size * 1.5 }} />;
}

// Single entry point for both call sites below (MuscleDiagram's multi-
// exercise heat map and ExerciseDetailModal's single-exercise highlight) —
// switches on MUSCLE_DIAGRAM_BACKEND so falling back to
// react-muscle-highlighter never touches either call site, just this
// function. `full` mirrors the old "single exercise at max intensity"
// behavior; without it, intensity is counted across muscleGroups (more
// exercises hitting a region = a hotter color).
function MuscleBodyView({ muscleGroups, full, size = 130 }: { muscleGroups: string[]; full?: boolean; size?: number }) {
  if (MUSCLE_DIAGRAM_BACKEND === "body-muscles") {
    const bodyState = full ? muscleGroupsToFullBodyMusclesState(muscleGroups) : muscleGroupsToBodyMusclesState(muscleGroups);
    if (Object.keys(bodyState).length === 0) return null;
    return (
      <div className="flex justify-center gap-2">
        <BodyMusclesPane side="front" bodyState={bodyState} size={size} />
        <BodyMusclesPane side="back" bodyState={bodyState} size={size} />
      </div>
    );
  }

  // Dormant fallback — MUSCLE_DIAGRAM_BACKEND is hardcoded to "body-muscles"
  // above, so this branch never actually renders today. Its colors are
  // fixed hex matching the dark theme's original palette rather than theme
  // tokens, since making it theme-aware is only worth doing if this
  // constant is ever flipped back (see the plan's dormant-fallback note).
  const data = full ? muscleGroupsToBodyData(muscleGroups).map((d) => ({ ...d, intensity: 3 })) : muscleGroupsToBodyData(muscleGroups);
  if (data.length === 0) return null;
  const scale = size / 240;
  return (
    <div className="flex justify-center gap-2">
      <Body data={data} side="front" gender="male" scale={scale} colors={["#4a3b21", "#8a6a2f", "#D4922C"]} defaultFill="#15140F" border="#2C2A22" />
      <Body data={data} side="back" gender="male" scale={scale} colors={["#4a3b21", "#8a6a2f", "#D4922C"]} defaultFill="#15140F" border="#2C2A22" />
    </div>
  );
}

// Whether either backend actually has anything to draw for these
// muscleGroups — used to decide whether to show the diagram toggle at all
// (e.g. a day of only "Full Body · Conditioning" exercises has nothing
// mappable in either adapter).
function hasMuscleDiagramData(muscleGroups: string[]): boolean {
  if (MUSCLE_DIAGRAM_BACKEND === "body-muscles") {
    return Object.keys(muscleGroupsToBodyMusclesState(muscleGroups)).length > 0;
  }
  return muscleGroupsToBodyData(muscleGroups).length > 0;
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

  return (
    <div onClick={onClose} className="modal-overlay z-30">
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border max-w-[380px] w-full max-h-[85vh] overflow-y-auto p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold text-[15px]">{target.name}</div>
          <button onClick={onClose} className="bg-transparent border border-border text-muted-foreground px-2 py-0.5">
            ✕
          </button>
        </div>
        <MuscleBadge muscleGroup={target.muscleGroup} />

        <div className="my-3.5">
          <MuscleBodyView muscleGroups={[target.muscleGroup]} full size={140} />
        </div>

        <div className="text-[11px] text-muted-foreground mb-1.5 tracking-wide">TUTORIAL LINKS</div>
        <div className={`flex flex-col gap-1.5 ${target.manage ? "mb-2.5" : ""}`}>
          {links === null ? (
            <span className="text-xs text-muted-foreground">Loading…</span>
          ) : links.length === 0 ? (
            <span className="text-xs text-muted-foreground">No tutorial links yet</span>
          ) : (
            links.map((l) => (
              <div key={l.id} className="flex justify-between items-center gap-1.5">
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-[13px] text-primary">
                  {l.label || l.url}
                </a>
                {target.manage && (
                  <button onClick={() => removeLink(l.id)} className="bg-transparent border-none text-muted-foreground text-xs p-0.5">
                    ✕
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        {target.manage && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-2.5">
            <input placeholder="Label (e.g. Form check)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="input-sm" />
            <input placeholder="URL" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="input-sm" />
            <button onClick={addLink} className="btn-secondary">
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
  if (!hasMuscleDiagramData(muscleGroups)) return null;

  return (
    <div className="mb-2.5">
      <button onClick={() => setShown((v) => !v)} className="btn-tiny">
        {shown ? "Hide" : "👁 Muscles worked today"}
      </button>
      {shown && (
        <div className="mt-2">
          <MuscleBodyView muscleGroups={muscleGroups} size={80} />
        </div>
      )}
    </div>
  );
}

export default function WorkoutPage() {
  const { date } = useDate();
  const [exerciseOptions, setExerciseOptions] = useState<Exercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
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

  const [customExName, setCustomExName] = useState("");
  const [customExSets, setCustomExSets] = useState("3");
  const [customExReps, setCustomExReps] = useState("8-12");
  const [customExMuscleGroup, setCustomExMuscleGroup] = useState("");
  const [customExRestSeconds, setCustomExRestSeconds] = useState("");
  const [customExPriority, setCustomExPriority] = useState("100");
  const [customExTrackingType, setCustomExTrackingType] = useState<TrackingType>("reps_weight");
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
    restSeconds: "",
    priority: "100",
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
  const [loading, setLoading] = useState(true);

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
    setPlanDaysList(data.days);
  }, []);

  const loadPlans = useCallback(async () => {
    const res = await fetch("/api/plans");
    setPlansList(await res.json());
  }, []);

  useEffect(() => {
    setLoading(true);
    loadWorkout(date).finally(() => setLoading(false));
  }, [date, loadWorkout]);

  // The active plan (day labels, cycle order) is not date-scoped, loads once.
  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

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
          // Best-effort guess for instant feedback — exerciseOptions is
          // scoped to the day's active variant, so an alternative tagged
          // with the *other* variant won't be in it yet. Corrected below.
          alternatives:
            ex.alternativeGroupId != null
              ? exerciseOptions.filter((o) => o.alternativeGroupId === ex.alternativeGroupId && o.id !== ex.id).map((o) => ({ id: o.id, name: o.name }))
              : [],
        },
      ],
    }));
    // Reconcile against the server's variant-independent alternatives
    // resolution (see /api/workout's GET handler) so a swap option tagged
    // with the day's other variant still shows up without a manual refresh.
    if (ex.alternativeGroupId != null) await loadWorkout(date);
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

  // Substitutes a logged exercise for an interchangeable alternative
  // (equipment unavailable, etc) — existing sets on this log row carry over
  // untouched, only which exercise it points to changes. Reloads rather
  // than patching local state since the row's name/muscleGroup/trackingType/
  // alternatives all need to reflect the new exercise.
  const swapExercise = async (logId: number, newExerciseId: number) => {
    await fetch(`/api/workout/log/${logId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId: newExerciseId }),
    });
    await loadWorkout(date);
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
        muscleGroup: customExMuscleGroup,
        restSeconds: customExRestSeconds.trim() === "" ? null : parseInt(customExRestSeconds) || null,
        priority: parseInt(customExPriority) || 100,
        trackingType: customExTrackingType,
      }),
    });
    const created: Exercise = await res.json();
    setExerciseOptions((prev) => [...prev, created]);
    await addExerciseToLog(created);
    setCustomExName("");
    setCustomExSets("3");
    setCustomExReps("8-12");
    setCustomExMuscleGroup("");
    setCustomExRestSeconds("");
    setCustomExPriority("100");
    setCustomExTrackingType("reps_weight");
    setShowCustomExercise(false);
    // Full parity with the manage-panel edit form means not needing a
    // second trip there just to attach a tutorial link right after
    // creating the exercise.
    setDetailTarget({ id: created.id, name: created.name, muscleGroup: created.muscleGroup, manage: true });
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
      restSeconds: ex.restSeconds == null ? "" : String(ex.restSeconds),
      priority: String(ex.priority),
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
        restSeconds: exEdit.restSeconds.trim() === "" ? null : parseInt(exEdit.restSeconds) || null,
        priority: parseInt(exEdit.priority) || 100,
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

  // Links two exercises as interchangeable alternatives (e.g. Face Pulls <->
  // Reverse Pec Deck Fly). No separate groups table — the shared group id is
  // just whichever of the two already has one, or one exercise's own id if
  // neither does yet (guaranteed unique since it's a primary key).
  const linkAlternative = async (exerciseId: number, targetId: number) => {
    const ex = allExercises.find((e) => e.id === exerciseId);
    const target = allExercises.find((e) => e.id === targetId);
    if (!ex || !target) return;
    const groupId = ex.alternativeGroupId ?? target.alternativeGroupId ?? ex.id;
    await Promise.all(
      [exerciseId, targetId].map((id) =>
        fetch(`/api/exercises/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alternativeGroupId: groupId }),
        })
      )
    );
    await loadAllExercises();
  };

  const unlinkAlternative = async (exerciseId: number) => {
    await fetch(`/api/exercises/${exerciseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alternativeGroupId: null }),
    });
    await loadAllExercises();
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

  if (loading) return <CenteredLoading />;

  const exDoneCount = workout.log.filter((r) => r.done).length;

  // Manage-exercise-library rows: a search flattens everything into a plain
  // filtered list; with no query, group into collapsible per-plan-day
  // sections instead — the library's long enough now that showing it all
  // flat was the actual complaint.
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
    <div>
      {/* ---- Workout / exercise section ---- */}
      <div
        className={`py-3.5 px-4 mb-3 border ${
          workout.planDayId === null
            ? "bg-card border-border"
            : "bg-[linear-gradient(135deg,var(--card),var(--background))] border-primary/33"
        }`}
      >
        <div className={`flex items-center justify-between ${workout.planDayId !== null ? "mb-3" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="text-xl">{workout.planDayId === null ? "💤" : "🏋️"}</div>
            <div>
              <div className="text-base font-semibold">
                {workout.planDayId === null ? "Rest day" : `${workout.label} day`}
                {workout.variant && (
                  <span className="text-[11px] text-primary font-normal">
                    {" "}
                    · {workout.variant === "strength" ? "Strength" : "Hypertrophy"}
                  </span>
                )}
                {workout.suggested && <span className="text-[11px] text-muted-foreground font-normal"> · suggested</span>}
                {workout.status === "done" && <span className="text-[11px] text-success font-normal"> · done</span>}
                {workout.status === "skipped" && <span className="text-[11px] text-destructive font-normal"> · skipped</span>}
              </div>
              {workout.planDayId !== null && (
                <div className="text-xs text-muted-foreground">
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
            className="input-sm w-auto"
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
              <div className="border border-border mb-2.5">
                {workout.log.map((row) => (
                  <div key={row.id} className="list-row bg-background">
                    <div className="flex items-center gap-2 mb-1.5">
                      <button onClick={() => updateLogRow(row.id, !row.done)} className={`checkbox ${row.done ? "checkbox-done" : ""}`}>
                        {row.done ? "✓" : ""}
                      </button>
                      <span className={`text-[13px] flex-1 ${row.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {row.name}
                      </span>
                      <MuscleBadge
                        muscleGroup={row.muscleGroup ?? ""}
                        linkCount={row.linkCount}
                        onClick={() =>
                          setDetailTarget({ id: row.exerciseId, name: row.name ?? "", muscleGroup: row.muscleGroup ?? "", manage: false })
                        }
                      />
                      {row.alternatives.length > 0 && (
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) swapExercise(row.id, Number(e.target.value));
                          }}
                          title="Swap for an alternative exercise"
                          className="input-sm w-auto py-0.5 px-1 text-[11px]"
                        >
                          <option value="">⇄</option>
                          {row.alternatives.map((alt) => (
                            <option key={alt.id} value={alt.id}>
                              {alt.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <button onClick={() => removeLogRow(row.id)} className="bg-transparent border-none text-muted-foreground p-0.5">
                        ✕
                      </button>
                    </div>
                    <div className="flex flex-col gap-1 pl-[26px]">
                      {row.sets.map((set) =>
                        row.trackingType === "duration_distance" ? (
                          <div key={set.id} className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground w-3.5">{set.setNumber}</span>
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
                              className="input-sm w-[60px] text-center"
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
                              className="input-sm w-[60px] text-center"
                            />
                            <button onClick={() => removeSetRow(row.id, set.id)} className="bg-transparent border-none text-muted-foreground p-0.5 ml-auto">
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div key={set.id} className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground w-3.5">{set.setNumber}</span>
                            <input
                              value={set.reps ?? ""}
                              placeholder={row.defaultReps ?? "reps"}
                              onChange={(e) => updateSetRow(row.id, set.id, { reps: e.target.value })}
                              className="input-sm w-[55px] text-center"
                            />
                            <input
                              type="number"
                              step={0.5}
                              value={set.weight ?? ""}
                              onChange={(e) => updateSetRow(row.id, set.id, { weight: e.target.value === "" ? null : parseFloat(e.target.value) })}
                              className="input-sm w-[55px] text-center"
                              placeholder="kg"
                            />
                            <button onClick={() => removeSetRow(row.id, set.id)} className="bg-transparent border-none text-muted-foreground p-0.5 ml-auto">
                              ✕
                            </button>
                          </div>
                        )
                      )}
                      <button
                        onClick={() => addSetRow(row.id)}
                        className="self-start text-[11px] text-muted-foreground bg-transparent border border-dashed border-border px-2 py-0.5 mt-0.5"
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
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {exerciseOptions
                  .filter((ex) => !workout.log.some((r) => r.exerciseId === ex.id))
                  .map((ex) => (
                    <div key={ex.id} className="bg-transparent border border-dashed border-border text-muted-foreground text-xs flex items-center gap-1.5">
                      <button onClick={() => addExerciseToLog(ex)} className="bg-transparent border-none text-inherit font-inherit px-2 py-1.5">
                        + {ex.name}
                      </button>
                      <span className="pr-1.5">
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
              <div className="flex gap-2">
                <button onClick={() => setShowCustomExercise(true)} className="btn-secondary flex-1">
                  + Custom exercise
                </button>
                <button onClick={() => commitSession(workout.planDayId, "done")} className="btn-primary">
                  Mark day done
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <input placeholder="Exercise name" value={customExName} onChange={(e) => setCustomExName(e.target.value)} className="input" />
                <div className="flex gap-2">
                  <input placeholder="Sets" value={customExSets} onChange={(e) => setCustomExSets(e.target.value)} className="input" />
                  <input placeholder="Reps (e.g. 8-12)" value={customExReps} onChange={(e) => setCustomExReps(e.target.value)} className="input" />
                </div>
                <select value={customExMuscleGroup} onChange={(e) => setCustomExMuscleGroup(e.target.value)} className="input">
                  <option value="">— muscle group —</option>
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
                <div className="flex gap-2">
                  <input placeholder="Rest (sec)" value={customExRestSeconds} onChange={(e) => setCustomExRestSeconds(e.target.value)} className="input" />
                  <input placeholder="Priority" title="Lower = do first" value={customExPriority} onChange={(e) => setCustomExPriority(e.target.value)} className="input" />
                </div>
                <select value={customExTrackingType} onChange={(e) => setCustomExTrackingType(e.target.value as TrackingType)} className="input">
                  <option value="reps_weight">Sets × reps × weight</option>
                  <option value="duration_distance">Duration / distance (cardio)</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={addCustomExercise} className="btn-primary flex-1">
                    Add
                  </button>
                  <button onClick={() => setShowCustomExercise(false)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {workout.planDayId === null && workout.status !== "rest" && (
          <button onClick={() => commitSession(null, "rest", true)} className="btn-secondary mt-2.5 w-full">
            Confirm rest day
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => {
            setShowManageExercises((v) => !v);
            if (!showManageExercises) loadAllExercises();
          }}
          className="btn-tiny flex-1"
        >
          {showManageExercises ? "Hide" : "Manage"} exercise library
        </button>
        <button
          onClick={() => {
            setShowFullProgram(true);
            setProgramPage(0);
            loadAllExercises();
          }}
          className="btn-tiny flex-1"
        >
          Full program table
        </button>
        <button
          onClick={() => {
            setShowManagePlans(true);
            setPlanActionError(null);
            loadPlans();
          }}
          className="btn-tiny flex-1"
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
              const blockDiff = (order[a.block] ?? 0) - (order[b.block] ?? 0);
              return blockDiff !== 0 ? blockDiff : a.priority - b.priority;
            });
          return (
            <div className="fixed inset-0 bg-black/80 z-10 overflow-y-auto">
              <div className="max-w-[640px] mx-auto px-3 pb-5">
                <div className="sticky top-0 bg-background z-[1] flex justify-between items-center py-3.5 pb-2.5">
                  <div className="text-base font-semibold">Full PPL Program</div>
                  <button onClick={() => setShowFullProgram(false)} className="nav-btn">
                    ✕
                  </button>
                </div>

                <div className="flex items-center justify-between mb-2.5">
                  <button onClick={() => setProgramPage((p) => Math.max(0, p - 1))} disabled={programPage === 0} className="nav-btn">
                    ‹
                  </button>
                  <div className="text-xs text-muted-foreground">
                    {programPage + 1} / {programSections.length}
                  </div>
                  <button
                    onClick={() => setProgramPage((p) => Math.min(programSections.length - 1, p + 1))}
                    disabled={programPage === programSections.length - 1}
                    className="nav-btn"
                  >
                    ›
                  </button>
                </div>

                <div className="mb-5">
                  <div className="bg-primary/13 text-primary font-semibold p-1.5 text-xs border border-border">{label}</div>
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr>
                        {["Exercise", "Muscle", "Sets", "Reps", "Rest"].map((h) => (
                          <th key={h} className="border border-border px-1.5 py-1 text-left bg-card text-muted-foreground text-[10px]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessionExercises.map((ex) => (
                        <tr key={ex.id}>
                          <td className="border border-border px-1.5 py-1">
                            {ex.name}
                            {ex.block !== "main" && <span className="text-muted-foreground"> · {ex.block}</span>}
                          </td>
                          <td className="border border-border px-1.5 py-1">
                            <MuscleBadge
                              muscleGroup={ex.muscleGroup}
                              linkCount={ex.linkCount}
                              onClick={() => setDetailTarget({ id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, manage: false })}
                            />
                          </td>
                          <td className="border border-border px-1.5 py-1">{ex.defaultSets}</td>
                          <td className="border border-border px-1.5 py-1">{ex.defaultReps}</td>
                          <td className="border border-border px-1.5 py-1">{ex.restSeconds ? `${ex.restSeconds}s` : "—"}</td>
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
        <div className="fixed inset-0 bg-black/80 z-10 overflow-y-auto">
          <div className="max-w-[640px] mx-auto px-3 pb-5">
            <div className="sticky top-0 bg-background z-[1] flex justify-between items-center py-3.5 pb-2.5">
              <div className="text-base font-semibold">Manage Plans</div>
              <button onClick={() => setShowManagePlans(false)} className="nav-btn">
                ✕
              </button>
            </div>

            {planActionError && (
              <div className="bg-destructive/13 text-destructive px-2.5 py-2 text-xs mb-3 border border-destructive/33">{planActionError}</div>
            )}

            {plansList.map((plan) => (
              <div key={plan.id} className="card mb-3">
                <div className="flex justify-between items-center mb-2.5 gap-2 flex-wrap">
                  {editingPlanNameId === plan.id ? (
                    <div className="flex gap-1.5 flex-1 min-w-[160px]">
                      <input value={planNameEdit} onChange={(e) => setPlanNameEdit(e.target.value)} className="input-sm flex-1" />
                      <button onClick={() => savePlanName(plan.id)} className="btn-tiny">
                        Save
                      </button>
                      <button onClick={() => setEditingPlanNameId(null)} className="btn-tiny">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-semibold">{plan.name}</span>
                      {plan.isActive && <span className="text-[11px] text-success font-normal">· active</span>}
                      <button onClick={() => startEditPlanName(plan)} className="btn-tiny">
                        Rename
                      </button>
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    {!plan.isActive && (
                      <button onClick={() => activatePlan(plan.id)} className="btn-tiny text-primary border-primary/33">
                        Activate
                      </button>
                    )}
                    <button onClick={() => archivePlan(plan.id)} className="btn-tiny">
                      Archive
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2.5 text-xs text-muted-foreground">
                  Fixed rest day:
                  <select
                    value={plan.fixedRestWeekday === null ? "" : String(plan.fixedRestWeekday)}
                    onChange={(e) => setPlanRestWeekday(plan.id, e.target.value === "" ? null : Number(e.target.value))}
                    className="input-sm w-auto"
                  >
                    <option value="">None</option>
                    {WEEKDAY_NAMES.map((wd, i) => (
                      <option key={wd} value={i}>
                        {wd}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 mb-2.5">
                  {plan.days.map((day, idx) => (
                    <div key={day.id} className="flex items-center gap-1.5 bg-background border border-border py-1.5 px-2 flex-wrap">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveDay(plan.id, day.id, -1)} disabled={idx === 0} className="btn-tiny px-1.5 text-[10px] leading-[14px]">
                          ▲
                        </button>
                        <button
                          onClick={() => moveDay(plan.id, day.id, 1)}
                          disabled={idx === plan.days.length - 1}
                          className="btn-tiny px-1.5 text-[10px] leading-[14px]"
                        >
                          ▼
                        </button>
                      </div>
                      {editingDayId === day.id ? (
                        <input value={dayLabelEdit} onChange={(e) => setDayLabelEdit(e.target.value)} className="input-sm flex-1 min-w-[100px]" />
                      ) : (
                        <span className="text-[13px] flex-1 min-w-[100px]">{day.label}</span>
                      )}
                      <select
                        value={day.variantMode}
                        onChange={(e) => setDayVariantMode(plan.id, day.id, e.target.value as VariantMode)}
                        className="input-sm w-auto text-[11px]"
                      >
                        <option value="none">No variants</option>
                        <option value="strength_hypertrophy">Strength/Hypertrophy</option>
                      </select>
                      {editingDayId === day.id ? (
                        <>
                          <button onClick={() => saveDayLabel(plan.id, day.id)} className="btn-tiny">
                            Save
                          </button>
                          <button onClick={() => setEditingDayId(null)} className="btn-tiny">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditDay(day)} className="btn-tiny">
                            Rename
                          </button>
                          <button onClick={() => removeDay(plan.id, day.id)} className="btn-tiny">
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-1.5">
                  <input
                    value={newDayLabelByPlan[plan.id] || ""}
                    onChange={(e) => setNewDayLabelByPlan((prev) => ({ ...prev, [plan.id]: e.target.value }))}
                    placeholder="New day label, e.g. Upper A"
                    className="input-sm flex-1"
                  />
                  <button onClick={() => addDayToPlan(plan.id)} className="btn-tiny">
                    + Add day
                  </button>
                </div>
              </div>
            ))}

            <div className="card">
              <div className="section-label">CREATE NEW PLAN</div>
              <input
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                placeholder="Plan name, e.g. Upper/Lower"
                className="input mb-2"
              />
              {newPlanDayLabels.map((label, i) => (
                <div key={i} className="flex gap-1.5 mb-1.5">
                  <input
                    value={label}
                    onChange={(e) => setNewPlanDayLabels((prev) => prev.map((l, j) => (j === i ? e.target.value : l)))}
                    placeholder={`Day ${i + 1} label`}
                    className="input-sm flex-1"
                  />
                  <button
                    onClick={() => setNewPlanDayLabels((prev) => prev.filter((_, j) => j !== i))}
                    disabled={newPlanDayLabels.length <= 1}
                    className="btn-tiny"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="flex gap-2 mb-2.5">
                <button onClick={() => setNewPlanDayLabels((prev) => [...prev, ""])} className="btn-secondary flex-1 py-1.5 text-xs">
                  + Add day
                </button>
                <select
                  value={newPlanRestWeekday === null ? "" : String(newPlanRestWeekday)}
                  onChange={(e) => setNewPlanRestWeekday(e.target.value === "" ? null : Number(e.target.value))}
                  className="input-sm w-auto"
                >
                  <option value="">No fixed rest day</option>
                  {WEEKDAY_NAMES.map((wd, i) => (
                    <option key={wd} value={i}>
                      {wd}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={createPlan} className="btn-primary w-full">
                Create plan
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-5">
        {showManageExercises && (
          <>
            <input
              value={exerciseQuery}
              onChange={(e) => setExerciseQuery(e.target.value)}
              placeholder="Search exercises or muscle group…"
              className="input-sm mt-2 mb-2"
            />
            <div className="border border-border">
              {manageExerciseRows.map((row) => {
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
                      className="w-full text-left bg-card border-none border-b border-border text-primary font-semibold text-[13px] px-2.5 py-2"
                    >
                      {expanded ? "▾" : "▸"} {row.label}
                    </button>
                  );
                }
                const ex = row.ex;
                return (
                  <div key={ex.id} className="list-row">
                    {editingExId === ex.id ? (
                      <div className="flex flex-col gap-1.5">
                        <input value={exEdit.name} onChange={(e) => setExEdit({ ...exEdit, name: e.target.value })} className="input-sm" />
                        <div className="flex gap-1.5">
                          <select
                            value={exEdit.planDayId === null ? "" : String(exEdit.planDayId)}
                            onChange={(e) => setExEdit({ ...exEdit, planDayId: Number(e.target.value) })}
                            className="input-sm"
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
                            className="input-sm w-[50px]"
                          />
                          <input
                            value={exEdit.defaultReps}
                            onChange={(e) => setExEdit({ ...exEdit, defaultReps: e.target.value })}
                            className="input-sm w-[70px]"
                          />
                        </div>
                        <select
                          value={exEdit.muscleGroup}
                          onChange={(e) => setExEdit({ ...exEdit, muscleGroup: e.target.value })}
                          className="input-sm"
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
                          className="input-sm"
                        >
                          <option value="reps_weight">Sets × reps × weight</option>
                          <option value="duration_distance">Duration / distance (cardio)</option>
                        </select>
                        <div className="flex gap-1.5">
                          <input
                            value={exEdit.restSeconds}
                            onChange={(e) => setExEdit({ ...exEdit, restSeconds: e.target.value })}
                            placeholder="Rest (sec)"
                            className="input-sm flex-1"
                          />
                          <input
                            value={exEdit.priority}
                            onChange={(e) => setExEdit({ ...exEdit, priority: e.target.value })}
                            placeholder="Priority"
                            title="Lower = do first"
                            className="input-sm flex-1"
                          />
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {ex.alternativeGroupId != null ? (
                            <>
                              Alternates with: {allExercises.filter((o) => o.alternativeGroupId === ex.alternativeGroupId && o.id !== ex.id).map((o) => o.name).join(", ") || "—"}{" "}
                              <button onClick={() => unlinkAlternative(ex.id)} className="btn-tiny px-1.5">
                                Unlink
                              </button>
                            </>
                          ) : (
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) linkAlternative(ex.id, Number(e.target.value));
                              }}
                              className="input-sm"
                            >
                              <option value="">+ Link alternative exercise…</option>
                              {allExercises
                                .filter((o) => o.planDayId === ex.planDayId && o.id !== ex.id && !o.archived)
                                .map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.name}
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => saveEditEx(ex.id)} className="btn-primary flex-1 py-1.5 text-xs">
                            Save
                          </button>
                          <button onClick={() => setEditingExId(null)} className="btn-secondary flex-1 py-1.5 text-xs">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-[13px] flex items-center gap-1.5 flex-wrap">
                          {ex.name} <span className="text-muted-foreground">· {planDayById[ex.planDayId]?.label ?? "?"} · {ex.defaultSets}×{ex.defaultReps}</span>
                          {ex.alternativeGroupId != null && (
                            <span className="text-[11px] text-primary" title="Has an interchangeable alternative">
                              ⇄
                            </span>
                          )}
                          <MuscleBadge
                            muscleGroup={ex.muscleGroup}
                            linkCount={ex.linkCount}
                            onClick={() => setDetailTarget({ id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, manage: true })}
                          />
                        </span>
                        <div className="flex gap-1.5">
                          <button onClick={() => startEditEx(ex)} className="btn-tiny">
                            Edit
                          </button>
                          <button onClick={() => deleteEx(ex.id)} className="btn-tiny">
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

      {detailTarget && <ExerciseDetailModal target={detailTarget} onClose={() => setDetailTarget(null)} />}
    </div>
  );
}
