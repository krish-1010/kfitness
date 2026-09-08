export const FOOD_LIBRARY = [
  { name: "Whey scoop (30g)", protein: 30, kcal: 120 },
  { name: "Whole egg", protein: 6, kcal: 78 },
  { name: "Egg white", protein: 3.5, kcal: 17 },
  { name: "Soy chunks 100g dry", protein: 52, kcal: 345 },
  { name: "Paneer 100g", protein: 18, kcal: 265 },
  { name: "Dal 1 cup cooked", protein: 16, kcal: 230 },
  { name: "Sprouts 1 cup", protein: 14, kcal: 150 },
  { name: "Milk 1 glass", protein: 8, kcal: 150 },
  { name: "Curd 1 cup", protein: 7, kcal: 150 },
  { name: "Chicken breast 100g", protein: 27, kcal: 165 },
  { name: "Fish 100g", protein: 21, kcal: 140 },
  { name: "Peanuts 30g", protein: 7, kcal: 170 },
  { name: "Chole 1 cup", protein: 15, kcal: 270 },
  { name: "Tofu 100g", protein: 8, kcal: 145 },
  { name: "Rajma 1 cup", protein: 15, kcal: 245 },
] as const;

export const SUPPLEMENTS = [
  { id: "multi", name: "Supradyn Daily", time: "AM · with food" },
  { id: "d3k2", name: "Carbamide Forte D3+K2", time: "AM · with food" },
  { id: "mag", name: "HK Vitals Magnesium Glycinate (2 tab)", time: "PM · before bed" },
  { id: "whey", name: "TrueBasics Whey (1 scoop)", time: "Post-workout" },
  { id: "creatine", name: "AS-IT-IS Creatine (5g)", time: "Anytime" },
] as const;

export const PROTEIN_GOAL = 120;
export const KCAL_GOAL = 2750;

export const DAY_PLAN: Record<number, string> = {
  1: "Push",
  2: "Pull",
  3: "Legs",
  4: "Push",
  5: "Pull",
  6: "Legs",
  0: "Rest",
};
