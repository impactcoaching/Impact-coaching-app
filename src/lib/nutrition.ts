// Shared nutrition types and maths, used by the coach plan builder and the client diary.

export type Food = {
  id: string;
  name: string;
  brand: string | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number | null;
  sodium_mg: number | null;
  serving_g: number | null;
  serving_name: string | null;
  barcode: string | null;
  source: "generic" | "coach" | "client" | "off";
  owner_id: string | null;
};

/** A food found on Open Food Facts that isn't saved in our library yet. */
export type FoundFood = Omit<Food, "id" | "owner_id"> & { id: null; owner_id: null };

export type DayType = {
  id?: string;
  name: string;
  weekdays: number[]; // 1 = Monday … 7 = Sunday
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fibre_g: number | null;
  sodium_mg: number | null;
  water_ml: number | null;
  palms: number | null;
  fists: number | null;
  cupped: number | null;
  thumbs: number | null;
  notes: string | null;
  meals: PlanMeal[];
};

export type PlanMeal = { id?: string; name: string; notes: string | null; items: PlanItem[] };
export type PlanItem = { food_id: string; grams: number };

export type Totals = { kcal: number; protein_g: number; carbs_g: number; fat_g: number; fibre_g: number; sodium_mg: number };

export const STYLES = {
  macros: { label: "Macros", sub: "They log food against daily targets" },
  plan: { label: "Meal plan", sub: "They follow set meals, with swaps" },
  portions: { label: "Hand portions", sub: "No weighing, just palms, fists, cups and thumbs" },
} as const;
export type Style = keyof typeof STYLES;

export const PORTIONS = [
  { key: "palms", label: "Palms", what: "protein", icon: "✋" },
  { key: "fists", label: "Fists", what: "veg", icon: "✊" },
  { key: "cupped", label: "Cupped hands", what: "carbs", icon: "🤲" },
  { key: "thumbs", label: "Thumbs", what: "fats", icon: "👍" },
] as const;
export type PortionKey = (typeof PORTIONS)[number]["key"];

export const DEFAULT_MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const blankDayType = (name: string, weekdays: number[] = []): DayType => ({
  name,
  weekdays,
  kcal: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  fibre_g: null,
  sodium_mg: null,
  water_ml: null,
  palms: null,
  fists: null,
  cupped: null,
  thumbs: null,
  notes: null,
  meals: [],
});

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Numbers for a given weight of a food (food values are per 100 g). */
export function forGrams(f: Pick<Food, "kcal" | "protein_g" | "carbs_g" | "fat_g" | "fibre_g" | "sodium_mg">, grams: number): Totals {
  const k = grams / 100;
  return {
    kcal: r1(Number(f.kcal) * k),
    protein_g: r1(Number(f.protein_g) * k),
    carbs_g: r1(Number(f.carbs_g) * k),
    fat_g: r1(Number(f.fat_g) * k),
    fibre_g: r1(Number(f.fibre_g ?? 0) * k),
    sodium_mg: Math.round(Number(f.sodium_mg ?? 0) * k),
  };
}

export const zero = (): Totals => ({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, sodium_mg: 0 });

export function sum(list: Partial<Totals>[]): Totals {
  const t = zero();
  for (const x of list) {
    t.kcal += Number(x.kcal ?? 0);
    t.protein_g += Number(x.protein_g ?? 0);
    t.carbs_g += Number(x.carbs_g ?? 0);
    t.fat_g += Number(x.fat_g ?? 0);
    t.fibre_g += Number(x.fibre_g ?? 0);
    t.sodium_mg += Number(x.sodium_mg ?? 0);
  }
  return { kcal: Math.round(t.kcal), protein_g: r1(t.protein_g), carbs_g: r1(t.carbs_g), fat_g: r1(t.fat_g), fibre_g: r1(t.fibre_g), sodium_mg: Math.round(t.sodium_mg) };
}

/** Calories implied by the macros (4/4/9). */
export const kcalFromMacros = (p: number | null, c: number | null, f: number | null) => Math.round((p ?? 0) * 4 + (c ?? 0) * 4 + (f ?? 0) * 9);

/** New Zealand and Australia read kilojoules on labels, so we show kJ alongside kcal there. */
export const showsKj = (country: string | null) => country === "NZ" || country === "AU";
export const toKj = (kcal: number) => Math.round(kcal * 4.184);
export const energyText = (kcal: number, kj: boolean) => (kj ? `${Math.round(kcal)} kcal · ${toKj(kcal)} kJ` : `${Math.round(kcal)} kcal`);

/** The main macro of a food, used to work out a fair swap. */
export function mainMacro(f: Pick<Food, "protein_g" | "carbs_g" | "fat_g">): "protein_g" | "carbs_g" | "fat_g" {
  const p = Number(f.protein_g) * 4,
    c = Number(f.carbs_g) * 4,
    fat = Number(f.fat_g) * 9;
  return p >= c && p >= fat ? "protein_g" : c >= fat ? "carbs_g" : "fat_g";
}

/**
 * Grams of `to` that match `grams` of `from` on the original food's main macro.
 * Falls back to matching calories if the new food has none of that macro.
 */
export function swapGrams(from: Food, grams: number, to: Food) {
  const m = mainMacro(from);
  const want = (Number(from[m]) * grams) / 100;
  const per = Number(to[m]);
  const g = per > 0.5 ? (want / per) * 100 : (Number(from.kcal) * grams) / Math.max(1, Number(to.kcal));
  return Math.max(1, Math.round(g / 5) * 5);
}

/** Today's date (YYYY-MM-DD) in the person's own time zone. */
export function todayIn(tz: string | null) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function isoWeekday(date: string) {
  const d = new Date(date + "T12:00:00Z").getUTCDay();
  return d === 0 ? 7 : d;
}

export function addDays(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const isDate = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function dayLabel(date: string, today: string) {
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  if (date === addDays(today, 1)) return "Tomorrow";
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
}

/** The day type to use for a date: the one the client picked, else the one set for that weekday, else the first. */
export function pickDayType<T extends { id?: string; weekdays: number[] }>(list: T[], date: string, chosen: string | null | undefined) {
  return list.find((d) => d.id === chosen) ?? list.find((d) => d.weekdays.includes(isoWeekday(date))) ?? list[0] ?? null;
}
