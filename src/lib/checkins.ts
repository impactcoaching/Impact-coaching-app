// Check-in questions, goal modules and photo pose templates.

export type Scale = { key: string; label: string; low: string; high: string; optional?: boolean };
export type NumberQ = { key: string; label: string; unit?: string; step?: number; optional?: boolean };
export type ChoiceQ = { key: string; label: string; options: string[]; optional?: boolean };
export type TextQ = { key: string; label: string; placeholder?: string; short?: boolean; optional?: boolean };
export type Question = ({ kind: "scale" } & Scale) | ({ kind: "number" } & NumberQ) | ({ kind: "choice" } & ChoiceQ) | ({ kind: "text" } & TextQ);

/** Scores run 1 to 10. */
export const SCALE_MAX = 10;

/** Everyone answers these. Matches the check-in mock-up Adam approved. */
export const GENERAL: Question[] = [
  { kind: "scale", key: "nutrition", label: "How well did you stick to your nutrition?", low: "Way off", high: "Spot on" },
  { kind: "scale", key: "energy", label: "Energy", low: "Running on empty", high: "Flying" },
  { kind: "scale", key: "sleep_quality", label: "Sleep quality", low: "Awful", high: "Brilliant" },
  { kind: "number", key: "sleep_hours", label: "Average sleep", unit: "hours a night", step: 0.5 },
  { kind: "scale", key: "stress", label: "Stress", low: "Calm", high: "Through the roof" },
  { kind: "scale", key: "hunger", label: "Hunger", low: "Not hungry", high: "Starving" },
  { kind: "scale", key: "digestion", label: "Digestion", low: "Rough", high: "Spot on" },
  { kind: "scale", key: "mood", label: "Mood", low: "Low", high: "Great" },
  { kind: "text", key: "win", label: "Biggest win this week", optional: true },
  { kind: "text", key: "hard", label: "What was hard?", optional: true },
  { kind: "text", key: "note", label: "Anything for Adam?", optional: true },
];

export const MODULES = {
  general: { label: "General only", sub: "Just the questions everyone gets", questions: [] as Question[] },
  fat_loss: {
    label: "Lifestyle: fat loss",
    sub: "Waist, clothes, meals out, alcohol, confidence",
    questions: [
      { kind: "number", key: "waist_cm", label: "Waist measurement", unit: "cm, at the belly button", step: 0.5 },
      { kind: "choice", key: "clothes", label: "How are your clothes fitting?", options: ["Looser", "About the same", "Tighter"] },
      { kind: "number", key: "meals_out", label: "Meals out or takeaways", unit: "this week", step: 1 },
      { kind: "number", key: "alcohol", label: "Alcohol", unit: "units this week", step: 1 },
      { kind: "scale", key: "confidence", label: "How confident do you feel about next week?", low: "Not at all", high: "Fully" },
    ] as Question[],
  },
  off_season: {
    label: "Off-season / build",
    sub: "Strength, appetite, gym performance, niggles",
    questions: [
      { kind: "choice", key: "strength", label: "Strength this week", options: ["Up", "Same", "Down"] },
      { kind: "scale", key: "appetite", label: "Appetite", low: "Struggling to eat", high: "Could eat more" },
      { kind: "scale", key: "performance", label: "Gym performance", low: "Flat", high: "Best ever" },
      { kind: "text", key: "niggles", label: "Any niggles or pain?", optional: true },
    ] as Question[],
  },
  prep_female: {
    label: "Bikini, wellness and figure prep",
    sub: "Posing, cardio, water, fullness, conditioning",
    questions: [
      { kind: "number", key: "posing_min", label: "Posing practice", unit: "minutes this week", step: 5 },
      { kind: "number", key: "cardio_min", label: "Cardio", unit: "minutes this week", step: 5 },
      { kind: "number", key: "water_l", label: "Water", unit: "litres a day", step: 0.5 },
      { kind: "scale", key: "fullness", label: "How full do you look?", low: "Flat", high: "Full" },
      { kind: "text", key: "conditioning", label: "Conditioning notes (how you look and feel on stage days)", optional: true },
    ] as Question[],
  },
  prep_male: {
    label: "Physique and bodybuilding prep",
    sub: "Posing, cardio, pumps, fullness, vascularity, health markers",
    questions: [
      { kind: "number", key: "posing_min", label: "Posing practice", unit: "minutes this week", step: 5 },
      { kind: "number", key: "cardio_min", label: "Cardio", unit: "minutes this week", step: 5 },
      { kind: "scale", key: "pumps", label: "Pumps in the gym", low: "None", high: "Skin-splitting" },
      { kind: "scale", key: "fullness", label: "How full do you look?", low: "Flat", high: "Full" },
      { kind: "scale", key: "vascularity", label: "Vascularity", low: "None", high: "Road map" },
      { kind: "number", key: "rhr", label: "Resting heart rate", unit: "bpm, morning average", step: 1, optional: true },
      { kind: "text", key: "bp", label: "Blood pressure, if you track it", placeholder: "for example 125/80", short: true, optional: true },
      { kind: "text", key: "meds", label: "Any changes to supplements or medication?", optional: true },
    ] as Question[],
  },
} as const;
export type ModuleKey = keyof typeof MODULES;

/** Rough time to fill in, as shown on the mock-up. */
export function minutesFor(questions: number, poses: number) {
  return Math.max(3, Math.round(4 + questions * 0.25 + poses * 0.4));
}

export type Flag = { label: string; detail: string };

/** Prompts for a conversation, not a diagnosis. */
export function flagsFor(answers: Record<string, unknown>, mod: Record<string, unknown>, cycle: { period?: string | null } | null): Flag[] {
  const n = (v: unknown) => (typeof v === "number" ? v : null);
  const f: Flag[] = [];
  const sleep = n(answers.sleep_hours);
  if (sleep != null && sleep < 6) f.push({ label: "Sleep", detail: `Averaging ${sleep} hours a night.` });
  const energy = n(answers.energy);
  if (energy != null && energy <= 3) f.push({ label: "Energy", detail: `Rated ${energy}/10.` });
  const mood = n(answers.mood);
  if (mood != null && mood <= 3) f.push({ label: "Mood", detail: `Rated ${mood}/10.` });
  const stress = n(answers.stress);
  if (stress != null && stress >= 8) f.push({ label: "Stress", detail: `Rated ${stress}/10.` });
  if (cycle?.period === "Late" || cycle?.period === "Missed") f.push({ label: "Cycle", detail: `Period ${cycle.period.toLowerCase()} this week. Worth a chat about energy availability.` });
  const bp = typeof mod.bp === "string" ? parseInt(mod.bp, 10) : NaN;
  if (bp >= 135) f.push({ label: "Blood pressure", detail: `${mod.bp} reported.` });
  return f;
}

export const MEASUREMENTS = [
  { key: "waist", label: "Waist" },
  { key: "hips", label: "Hips" },
  { key: "chest", label: "Chest" },
  { key: "thigh", label: "Thigh" },
  { key: "arm", label: "Arm" },
] as const;

export const CYCLE_PHASES = ["Menstrual", "Follicular", "Ovulation", "Luteal", "Not sure", "Prefer not to say"] as const;
export const PERIOD_CHANGES = ["No", "Late", "Missed", "Heavier or lighter", "Prefer not to say"] as const;

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
  "Men's physique": ["Front pose", "Back pose", "Left side", "Right side"],
  "Women's physique": ["Front double biceps", "Side chest", "Back double biceps", "Side triceps", "Abdominals and thigh"],
  "Classic physique": ["Front double biceps", "Side chest", "Back double biceps", "Abdominals and thigh", "Vacuum", "Favourite classic pose"],
  Bodybuilding: ["Front double biceps", "Front lat spread", "Side chest", "Back double biceps", "Back lat spread", "Side triceps", "Abdominals and thigh", "Most muscular"],
};

export function posesFor(custom: string[] | null | undefined, competes: boolean, division: string | null): string[] {
  if (custom && custom.length) return custom;
  const stage = competes && division ? POSE_TEMPLATES[division] ?? [] : [];
  return [...RELAXED, ...stage];
}

export function scoreLabel(v: unknown) {
  return typeof v === "number" ? `${v}/${SCALE_MAX}` : "–";
}

export const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
