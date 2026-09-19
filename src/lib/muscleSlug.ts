import type { Slug } from "react-muscle-highlighter";

// Maps this app's muscleGroup strings (see src/lib/muscleTaxonomy.ts for the
// canonical list) onto react-muscle-highlighter's fixed Slug set. The library
// has no sub-head distinction (e.g. triceps lateral vs long head both light
// up the same "triceps" region) and no dedicated "abductors" or "hip flexors"
// region — those either fold onto the closest real slug or are omitted.
// Anything unmapped (e.g. "Full Body · Conditioning", "Hip Flexors") is
// intentionally left off the diagram rather than forced onto a wrong region.
// More specific entries (oblique, glute) are checked before their broader
// parent prefix (core, abductor) since match order is first-hit.
const PREFIX_TO_SLUG: [string, Slug][] = [
  ["chest", "chest"],
  ["shoulder", "deltoids"],
  ["tricep", "triceps"],
  ["bicep", "biceps"],
  ["oblique", "obliques"],
  ["back", "upper-back"],
  ["trap", "trapezius"],
  ["forearm", "forearm"],
  ["core", "abs"],
  ["lower back", "lower-back"],
  ["quad", "quadriceps"],
  ["hamstring", "hamstring"],
  ["glute", "gluteal"],
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
