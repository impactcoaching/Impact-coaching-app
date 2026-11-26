// Check-in questions, goal modules and photo pose templates.

export type Scale = { key: string; label: string; low: string; high: string };
export type NumberQ = { key: string; label: string; unit?: string; step?: number };
export type ChoiceQ = { key: string; label: string; options: string[] };
export type TextQ = { key: string; label: string; placeholder?: string };
export type Question = ({ kind: "scale" } & Scale) | ({ kind: "number" } & NumberQ) | ({ kind: "choice" } & ChoiceQ) | ({ kind: "text" } & TextQ);

/** Everyone answers these. Scores are 1 to 5. */
export const GENERAL: Question[] = [
  { kind: "scale", key: "energy", label: "Energy", low: "Running on empty", high: "Buzzing" },
  { kind: "scale", key: "sleep", label: "Sleep", low: "Poor", high: "Great" },
  { kind: "scale", key: "hunger", label: "Hunger", low: "Not hungry", high: "Starving" },
  { kind: "scale", key: "stress", label: "Stress", low: "Calm", high: "Very stressed" },
  { kind: "scale", key: "digestion", label: "Digestion", low: "Poor", high: "Spot on" },
  { kind: "scale", key: "training", label: "Training", low: "Struggled", high: "Smashed it" },
  { kind: "scale", key: "nutrition", label: "Sticking to the nutrition plan", low: "Off track", high: "Bang on" },
  { kind: "number", key: "steps", label: "Average daily steps", step: 500 },
  { kind: "text", key: "wins", label: "Wins this week", placeholder: "Big or small" },
  { kind: "text", key: "struggles", label: "Anything you found hard", placeholder: "Be honest, it helps" },
  { kind: "text", key: "questions", label: "Questions for Adam" },
];

export const MODULES = {
  general: { label: "General only", sub: "Just the standard questions", questions: [] as Question[] },
  fat_loss: {
    label: "Fat loss",
    sub: "Cravings, how clothes fit, waist",
    questions: [
      { kind: "scale", key: "cravings", label: "Cravings", low: "None", high: "Constant" },
      { kind: "number", key: "waist_cm", label: "Waist at the belly button", unit: "cm", step: 0.5 },
      { kind: "text", key: "clothes", label: "How are your clothes fitting?" },
    ] as Question[],
  },
  off_season: {
    label: "Off-season",
    sub: "Appetite, strength, fullness",
    questions: [
      { kind: "scale", key: "appetite", label: "Appetite", low: "Forcing food down", high: "Always hungry" },
      { kind: "choice", key: "strength", label: "Strength this week", options: ["Up", "About the same", "Down"] },
      { kind: "scale", key: "fullness", label: "Fullness and pumps", low: "Flat", high: "Full" },
    ] as Question[],
  },
  prep_female: {
    label: "Prep: bikini, wellness, figure",
    sub: "Posing, fullness, water, cardio",
    questions: [
      { kind: "number", key: "posing_min", label: "Posing practice this week", unit: "minutes", step: 5 },
      { kind: "number", key: "cardio_min", label: "Cardio this week", unit: "minutes", step: 5 },
      { kind: "scale", key: "fullness", label: "Fullness", low: "Flat", high: "Full" },
      { kind: "scale", key: "water", label: "Water retention", low: "Dry", high: "Very watery" },
      { kind: "scale", key: "recovery", label: "Recovery", low: "Wrecked", high: "Fresh" },
    ] as Question[],
  },
  prep_male: {
    label: "Prep: physique, classic, bodybuilding",
    sub: "Posing, fullness, conditioning, cardio",
    questions: [
      { kind: "number", key: "posing_min", label: "Posing practice this week", unit: "minutes", step: 5 },
      { kind: "number", key: "cardio_min", label: "Cardio this week", unit: "minutes", step: 5 },
      { kind: "scale", key: "fullness", label: "Fullness", low: "Flat", high: "Full" },
      { kind: "scale", key: "conditioning", label: "How conditioned you feel", low: "Soft", high: "Dry and hard" },
      { kind: "scale", key: "recovery", label: "Recovery", low: "Wrecked", high: "Fresh" },
    ] as Question[],
  },
} as const;
export type ModuleKey = keyof typeof MODULES;

export const MEASUREMENTS = [
  { key: "waist", label: "Waist" },
  { key: "hips", label: "Hips" },
  { key: "chest", label: "Chest" },
  { key: "thigh", label: "Thigh" },
  { key: "arm", label: "Arm" },
] as const;

export const CYCLE_PHASES = ["On my period", "After my period", "Around ovulation", "Before my period", "Not sure"] as const;

/** Suggest a module from the sign-up answers. The coach can change it. */
export function suggestModule(goal: string | null, competes: boolean, division: string | null): ModuleKey {
  if (competes || goal === "competition") {
    return ["Men's physique", "Classic physique", "Bodybuilding"].includes(division ?? "") ? "prep_male" : "prep_female";
  }
  if (goal === "fat_loss") return "fat_loss";
  if (goal === "muscle" || goal === "performance") return "off_season";
  return "general";
}

const RELAXED = ["Relaxed front", "Relaxed side", "Relaxed back"];
const QUARTERS = ["Front pose", "Quarter turn left", "Back pose", "Quarter turn right"];

/**
 * Starting pose list for each division. Federations differ a little, so Adam can edit
 * the list for each client. Relaxed front, side and back are always included.
 */
export const POSE_TEMPLATES: Record<string, string[]> = {
  Bikini: QUARTERS,
  Wellness: QUARTERS,
  Figure: QUARTERS,
  Fitness: QUARTERS,
  "Men's physique": QUARTERS,
  "Women's physique": ["Front double biceps", "Side chest", "Back double biceps", "Side triceps", "Abdominals and thigh"],
  "Classic physique": ["Front double biceps", "Side chest", "Back double biceps", "Abdominals and thigh", "Favourite classic pose"],
  Bodybuilding: ["Front double biceps", "Front lat spread", "Side chest", "Back double biceps", "Back lat spread", "Side triceps", "Abdominals and thigh", "Most muscular"],
};

export function posesFor(custom: string[] | null | undefined, competes: boolean, division: string | null): string[] {
  if (custom && custom.length) return custom;
  const stage = competes && division ? POSE_TEMPLATES[division] ?? [] : [];
  return [...RELAXED, ...stage];
}

export function scoreLabel(v: unknown) {
  return typeof v === "number" ? `${v}/5` : "–";
}

export const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
