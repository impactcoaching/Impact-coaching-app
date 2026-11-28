// Lists used by the sign-up form and the coach screens.

export const EQUIPMENT = {
  db: "Dumbbells",
  barbell: "Barbell and plates",
  kb: "Kettlebells",
  rack: "Squat rack",
  smith: "Smith machine",
  bench: "Flat bench",
  adjbench: "Adjustable bench",
  pullup: "Pull-up bar",
  dip: "Dip station",
  legpress: "Leg press",
  hacksquat: "Hack squat",
  pendulum: "Pendulum squat",
  legext: "Leg extension",
  legcurl: "Leg curl",
  hipthrust: "Hip thrust machine",
  abductor: "Hip abduction",
  chestpress: "Chest press",
  pecdeck: "Pec deck",
  shpress: "Shoulder press",
  pulldown: "Lat pulldown",
  backext: "Back extension bench",
  cable: "Cable stack",
  bands: "Resistance bands",
  treadmill: "Treadmill",
  stairs: "Stair climber",
  bike: "Bike",
  rower: "Rower",
} as const;

export type EquipmentKey = keyof typeof EQUIPMENT;
export const ALL_EQUIPMENT = Object.keys(EQUIPMENT) as EquipmentKey[];

export const GYM_PRESETS: Record<"big" | "small" | "home" | "none", { label: string; hint: string; kit: EquipmentKey[] }> = {
  big: { label: "Big commercial gym", hint: "Most machines, cables and free weights", kit: ALL_EQUIPMENT },
  small: {
    label: "Small or hotel gym",
    hint: "Dumbbells, a cable and a few machines",
    kit: ["db", "adjbench", "cable", "smith", "pulldown", "legpress", "treadmill", "bike"],
  },
  home: { label: "Home", hint: "Dumbbells, bands, maybe a bench", kit: ["db", "adjbench", "bands", "pullup"] },
  none: { label: "Start from scratch", hint: "Tick what you have", kit: [] },
};

export const GOALS = [
  { value: "fat_loss", label: "Lose fat" },
  { value: "muscle", label: "Build muscle" },
  { value: "competition", label: "Compete on stage" },
  { value: "health", label: "Get fitter and healthier" },
  { value: "performance", label: "Get stronger" },
] as const;

export const FEDERATIONS = ["PCA", "UKBFF", "NPC", "IFBB Pro League", "NABBA", "WNBF", "ICN", "Other"] as const;
export const DIVISIONS = [
  "Bikini",
  "Wellness",
  "Figure",
  "Fitness",
  "Women's physique",
  "Men's physique",
  "Classic physique",
  "Bodybuilding",
  "Other",
] as const;

/** The class programme set for a sign-up class. Fitness trains like figure; bodybuilding splits by sex. */
export function programmeClass(division: string | null | undefined, sex: string | null | undefined): string | null {
  if (!division) return null;
  if (division === "Bodybuilding") return sex === "female" ? "Women's bodybuilding" : sex === "male" ? "Men's bodybuilding" : null;
  if (division === "Fitness") return "Figure";
  return CLASS_FOCUS[division] ? division : null;
}

/** The 5 focus areas for each class programme set (template names are "Class: Focus, N days"). */
export const CLASS_FOCUS: Record<string, string[]> = {
  Bikini: ["Glutes", "Glute-ham tie-in", "Shoulder caps", "Back width", "Abs and waist"],
  Wellness: ["Glutes", "Quads", "Hamstrings and tie-in", "Shoulders", "Abs and waist"],
  Figure: ["Shoulders", "Back width", "Glutes and hamstrings", "Quads", "Abs and waist"],
  "Women's physique": ["Back", "Shoulders", "Arms", "Legs", "Abs and waist"],
  "Women's bodybuilding": ["Back", "Shoulders", "Quads", "Glutes and hamstrings", "Abs and waist"],
  "Men's physique": ["Upper chest", "Shoulder width", "Back width", "Arms", "Abs and upper back detail"],
  "Classic physique": ["Chest", "Back width", "Quad sweep", "Arms", "Abs and waist"],
  "Men's bodybuilding": ["Back", "Chest", "Legs", "Arms", "Abs and waist"],
};

export const EXPERIENCE = [
  { value: "new", label: "New to training" },
  { value: "some", label: "Under 2 years" },
  { value: "solid", label: "2 to 5 years" },
  { value: "veteran", label: "Over 5 years" },
] as const;

export const NUTRITION_STYLES = [
  { value: "plan", label: "A meal plan to follow" },
  { value: "macros", label: "Macros I log myself" },
  { value: "portions", label: "Hand portions, no weighing" },
  { value: "unsure", label: "Not sure, Adam can decide" },
] as const;

export const COUNTRIES = [
  { value: "UK", label: "United Kingdom" },
  { value: "NZ", label: "New Zealand" },
  { value: "AU", label: "Australia" },
  { value: "US", label: "United States" },
  { value: "IE", label: "Ireland" },
  { value: "other", label: "Somewhere else" },
] as const;

// Health screening, based on the widely used PAR-Q questions.
export const SCREENING = [
  { key: "heart", q: "Has a doctor ever said you have a heart condition or high blood pressure?" },
  { key: "chest_pain", q: "Do you get chest pain at rest, in daily life, or when you exercise?" },
  { key: "dizzy", q: "Have you lost your balance from dizziness, or lost consciousness, in the last 12 months?" },
  { key: "condition", q: "Do you have any other long-term medical condition, such as diabetes?" },
  { key: "medication", q: "Do you take any prescribed medication for a long-term condition?" },
  { key: "joints", q: "Do you have a bone, joint or soft tissue problem that could get worse with exercise?" },
  { key: "pregnant", q: "Are you pregnant, or have you given birth in the last 12 months?" },
  { key: "eating", q: "Have you ever had, or been treated for, an eating disorder?" },
] as const;

export const POLICY_VERSION = "2026-11-draft";
