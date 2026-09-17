import type { Slug } from "react-muscle-highlighter";

// Maps this app's free-text muscleGroup strings (see seed-ppl-program.ts)
// onto react-muscle-highlighter's fixed Slug set. The library has no
// sub-head distinction (e.g. triceps lateral vs long head both light up
// the same "triceps" region) and no dedicated "abductors" region — those
// fold onto the closest real slug. Anything unmapped (e.g. "Full Body ·
// Conditioning") is intentionally omitted from the diagram.
const PREFIX_TO_SLUG: [string, Slug][] = [
  ["chest", "chest"],
  ["shoulder", "deltoids"],
  ["tricep", "triceps"],
  ["bicep", "biceps"],
  ["back", "upper-back"],
  ["trap", "trapezius"],
  ["forearm", "forearm"],
  ["core", "abs"],
  ["lower back", "lower-back"],
  ["quad", "quadriceps"],
  ["hamstring", "hamstring"],
  ["calve", "calves"],
  ["calf", "calves"],
  ["adductor", "adductors"],
  ["abductor", "gluteal"], // closest available region — no dedicated slug
];

export function muscleGroupToSlug(muscleGroup: string): Slug | null {
  const g = muscleGroup.toLowerCase();
  for (const [prefix, slug] of PREFIX_TO_SLUG) {
    if (g.startsWith(prefix) || g.includes(` ${prefix}`) || g.includes(`· ${prefix}`)) return slug;
  }
  return null;
}

// Builds react-muscle-highlighter's `data` prop from a list of muscleGroup
// strings, one per exercise shown for the day — more exercises hitting the
// same region means a higher intensity (deeper color), capped at 3.
export function muscleGroupsToBodyData(muscleGroups: string[]): { slug: Slug; intensity: number }[] {
  const counts = new Map<Slug, number>();
  for (const g of muscleGroups) {
    const slug = muscleGroupToSlug(g);
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([slug, count]) => ({ slug, intensity: Math.min(count, 3) }));
}
