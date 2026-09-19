// Canonical muscle-group strings for the exercise editor's dropdown, replacing
// the old free-text field. Every string already live in the `exercises` table
// (confirmed via a one-off SELECT DISTINCT muscle_group against the real DB
// before writing this list) is included verbatim so existing exercises still
// resolve to a real selected option — this taxonomy is additive, not a data
// migration. The extra entries beyond what's currently used (Back · Rhomboids,
// Biceps · Short Head, Triceps · Medial Head, Forearms · Flexors/Extensors,
// Core's Rectus/Obliques/Transverse split, a dedicated Glutes distinct from
// "Core · Posterior/Glutes", Hip Flexors, and the Calves head split) fill the
// real gaps the user asked for ("look for proper muscle names, build the list
// even more").
export const MUSCLE_TAXONOMY: { group: string; options: string[] }[] = [
  { group: "Chest", options: ["Chest · Upper", "Chest · Mid", "Chest · Lower/Inner"] },
  { group: "Back", options: ["Back · Lats", "Back · Mid/Thickness", "Back · Rhomboids", "Traps", "Lower Back · Erectors"] },
  { group: "Shoulders", options: ["Shoulders · Front", "Shoulders · Side", "Shoulders · Rear"] },
  { group: "Biceps", options: ["Biceps", "Biceps · Short Head", "Biceps · Long Head", "Biceps · Brachialis"] },
  { group: "Triceps", options: ["Triceps · Lateral", "Triceps · Long Head", "Triceps · Medial Head"] },
  { group: "Forearms", options: ["Forearms", "Forearms · Flexors", "Forearms · Extensors"] },
  {
    group: "Core",
    options: ["Core · Anterior", "Core · Posterior/Glutes", "Core · Rectus Upper", "Core · Rectus Lower", "Core · Obliques", "Core · Transverse"],
  },
  {
    group: "Legs",
    options: ["Quads", "Hamstrings", "Glutes", "Adductors", "Abductors", "Hip Flexors", "Calves", "Calves · Gastrocnemius", "Calves · Soleus"],
  },
  { group: "Other", options: ["Full Body · Conditioning"] },
];

export const ALL_MUSCLE_GROUPS: string[] = MUSCLE_TAXONOMY.flatMap((g) => g.options);
