import type { BodyState, MuscleId } from "body-muscles";

// Maps this app's canonical muscleGroup strings (src/lib/muscleTaxonomy.ts)
// onto the `body-muscles` package's ~70-region MuscleId set — the
// alternative diagram backend to react-muscle-highlighter's mapping in
// muscleSlug.ts (see MUSCLE_DIAGRAM_BACKEND in page.tsx to switch between
// them; both adapters are kept complete so the swap is a one-line change).
//
// Our data doesn't track left/right, so every entry lights up both sides
// symmetrically. Where body-muscles has no exact match for a taxonomy
// entry (no separate biceps head, no transverse abdominis, no rhomboids
// region), the nearest visually-overlapping region is used instead — same
// "fold onto the closest real region" convention muscleSlug.ts already
// uses for react-muscle-highlighter. "Full Body · Conditioning" has no
// entry at all and is simply omitted from the diagram, not forced onto a
// wrong region.
const MUSCLE_GROUP_TO_IDS: Record<string, MuscleId[]> = {
  "Chest · Upper": ["chest-upper-left", "chest-upper-right"],
  "Chest · Mid": ["chest-lower-left", "chest-lower-right"],
  "Chest · Lower/Inner": ["chest-lower-left", "chest-lower-right"],

  "Back · Lats": ["lats-upper-left", "lats-mid-left", "lats-lower-left", "lats-upper-right", "lats-mid-right", "lats-lower-right"],
  "Back · Mid/Thickness": ["lats-mid-left", "lats-mid-right", "traps-mid-left", "traps-mid-right"],
  "Back · Rhomboids": ["traps-mid-left", "traps-mid-right"],
  Traps: ["traps-upper-left", "traps-mid-left", "traps-lower-left", "traps-upper-right", "traps-mid-right", "traps-lower-right"],
  "Lower Back · Erectors": ["lower-back-erectors-left", "lower-back-erectors-right", "lower-back-ql-left", "lower-back-ql-right"],

  "Shoulders · Front": ["shoulder-front-left", "shoulder-front-right"],
  "Shoulders · Side": ["shoulder-side-left", "shoulder-side-right"],
  "Shoulders · Rear": ["deltoid-rear-left", "deltoid-rear-right"],

  Biceps: ["biceps-left", "biceps-right"],
  "Biceps · Short Head": ["biceps-left", "biceps-right"],
  "Biceps · Long Head": ["biceps-left", "biceps-right"],
  "Biceps · Brachialis": ["biceps-left", "biceps-right"],

  "Triceps · Lateral": ["triceps-lateral-left", "triceps-lateral-right"],
  "Triceps · Long Head": ["triceps-long-left", "triceps-long-right"],
  "Triceps · Medial Head": ["triceps-long-left", "triceps-long-right"],

  Forearms: ["forearm-left", "forearm-right", "forearm-flexors-left", "forearm-flexors-right", "forearm-extensors-left", "forearm-extensors-right"],
  "Forearms · Flexors": ["forearm-flexors-left", "forearm-flexors-right"],
  "Forearms · Extensors": ["forearm-extensors-left", "forearm-extensors-right"],

  "Core · Anterior": ["abs-upper-left", "abs-upper-right", "abs-lower-left", "abs-lower-right"],
  "Core · Posterior/Glutes": ["lower-back-erectors-left", "lower-back-erectors-right", "gluteus-maximus-left", "gluteus-maximus-right"],
  "Core · Rectus Upper": ["abs-upper-left", "abs-upper-right"],
  "Core · Rectus Lower": ["abs-lower-left", "abs-lower-right"],
  "Core · Obliques": ["obliques-left", "obliques-right"],
  "Core · Transverse": ["obliques-left", "obliques-right"],

  Quads: ["quads-left", "quads-right"],
  Hamstrings: ["hamstrings-medial-left", "hamstrings-lateral-left", "hamstrings-medial-right", "hamstrings-lateral-right"],
  Glutes: ["gluteus-maximus-left", "gluteus-maximus-right", "gluteus-medius-left", "gluteus-medius-right"],
  Adductors: ["adductors-left", "adductors-right"],
  Abductors: ["gluteus-medius-left", "gluteus-medius-right"], // closest available — same fold-in as muscleSlug.ts
  "Hip Flexors": ["hip-flexor-left", "hip-flexor-right"],

  Calves: [
    "calves-gastroc-medial-left",
    "calves-gastroc-lateral-left",
    "calves-soleus-left",
    "calves-gastroc-medial-right",
    "calves-gastroc-lateral-right",
    "calves-soleus-right",
  ],
  "Calves · Gastrocnemius": ["calves-gastroc-medial-left", "calves-gastroc-lateral-left", "calves-gastroc-medial-right", "calves-gastroc-lateral-right"],
  "Calves · Soleus": ["calves-soleus-left", "calves-soleus-right"],
};

function muscleGroupToIds(muscleGroup: string): MuscleId[] {
  return MUSCLE_GROUP_TO_IDS[muscleGroup] ?? [];
}

// Builds body-muscles' BodyState from a list of muscleGroup strings — more
// exercises hitting the same region raises its intensity, same "count
// occurrences, cap it" idea as muscleSlug.ts's version for the other
// backend, just rescaled onto body-muscles' wider 0-10 range instead of a
// 3-step one.
export function muscleGroupsToBodyMusclesState(muscleGroups: string[]): BodyState {
  const counts = new Map<MuscleId, number>();
  for (const g of muscleGroups) {
    for (const id of muscleGroupToIds(g)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const state: BodyState = {};
  for (const [id, count] of counts) {
    state[id] = { intensity: Math.min(count * 3 + 1, 10), selected: false };
  }
  return state;
}

// Full intensity + selected on every region a single exercise targets —
// this is "where does THIS exercise hit", not a multi-exercise heat map.
export function muscleGroupsToFullBodyMusclesState(muscleGroups: string[]): BodyState {
  const state: BodyState = {};
  for (const g of muscleGroups) {
    for (const id of muscleGroupToIds(g)) {
      state[id] = { intensity: 10, selected: true };
    }
  }
  return state;
}
