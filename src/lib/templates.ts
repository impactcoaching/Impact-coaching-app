// Templates library: shared types, tag options and helpers.
// A template's plan lives in `body`, in the same shape as a client's programme or nutrition plan.
// Exercises and foods can be given by id, by name, or both (seed SQL uses names; the app adds ids).

import type { PlanExercise } from "@/lib/training";
import type { CardioMode } from "@/lib/cardio";
import type { Style } from "@/lib/nutrition";

export type TemplateKind = "training" | "nutrition";

export type TemplateExercise = Omit<PlanExercise, "id" | "exercise_id"> & { exercise_id?: string; exercise?: string };
export type TemplateWorkout = { name: string; weekdays: number[]; exercises: TemplateExercise[] };
export type TemplateCardioSession = {
  day: number | null;
  kind: string;
  minutes: number;
  mode: CardioMode;
  target: string | null;
  iv_work: number | null;
  iv_rest: number | null;
  iv_rounds: number | null;
  timing: string | null;
  notes: string | null;
};
export type TemplateCardio = { weekly_minutes: number; daily_steps: number | null; extra_counts: boolean; sessions: TemplateCardioSession[] };
export type TrainingBody = { notes: string | null; workouts: TemplateWorkout[]; cardio: TemplateCardio | null };

export type TemplateItem = { food_id?: string; food?: string; grams: number };
export type TemplateMeal = { name: string; notes: string | null; items: TemplateItem[] };
export type TemplateDay = {
  name: string;
  weekdays: number[];
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fibre_g: number | null;
  sodium_mg: number | null; // coach-set only
  water_ml: number | null; // coach-set only
  palms: number | null;
  fists: number | null;
  cupped: number | null;
  thumbs: number | null;
  notes: string | null;
  meals: TemplateMeal[];
};
export type NutritionBody = { style: Style; notes: string | null; day_types: TemplateDay[] };

export type Template = {
  id: string;
  kind: TemplateKind;
  name: string;
  summary: string | null;
  goal: string | null;
  level: "Beginner" | "Intermediate" | "Advanced" | null;
  location: "Gym" | "Home" | "Any" | null;
  audience: "any" | "female" | "male";
  competitor: "any" | "yes" | "no";
  tags: string[];
  self_guided: boolean;
  body: unknown;
  updated_at: string;
};

export const GOALS: Record<TemplateKind, string[]> = {
  training: ["Fat loss", "Muscle gain", "Recomp", "Glutes and legs", "Strength", "General fitness", "Contest prep", "Off-season"],
  nutrition: ["Fat loss", "Maintenance", "Muscle gain", "Recomp", "Contest prep", "Reverse diet", "Off-season"],
};
export const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export const LOCATIONS = ["Gym", "Home", "Any"] as const;
export const AUDIENCE = { any: "Anyone", female: "Women", male: "Men" } as const;
export const COMPETITOR = { any: "Competing or not", yes: "Competitors", no: "Non-competitors" } as const;

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const s = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const days = (v: unknown) => [...new Set(arr<unknown>(v).map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort();

/** Read a training body safely, filling in defaults for anything left out (handy for hand-written seed SQL). */
export function trainingBody(raw: unknown): TrainingBody {
  const b = (raw ?? {}) as Record<string, unknown>;
  const c = b.cardio as Record<string, unknown> | null | undefined;
  return {
    notes: s(b.notes),
    workouts: arr<Record<string, unknown>>(b.workouts).map((w, i) => ({
      name: s(w.name) ?? `Day ${i + 1}`,
      weekdays: days(w.weekdays),
      exercises: arr<Record<string, unknown>>(w.exercises).map((e) => {
        const reps_min = n(e.reps_min);
        const reps_max = n(e.reps_max);
        return {
          exercise_id: s(e.exercise_id) ?? undefined,
          exercise: s(e.exercise) ?? undefined,
          linked_to_previous: e.linked_to_previous === true,
          warmup_sets: n(e.warmup_sets) ?? 0,
          work_sets: n(e.work_sets) ?? 3,
          reps_type: (["fixed", "range", "amrap", "time"].includes(String(e.reps_type)) ? e.reps_type : reps_max && reps_max !== reps_min ? "range" : "fixed") as PlanExercise["reps_type"],
          reps_min,
          reps_max,
          tempo: s(e.tempo),
          effort_type: (["RIR", "RPE", "%1RM", "Weight"].includes(String(e.effort_type)) ? e.effort_type : "RIR") as PlanExercise["effort_type"],
          effort_value: e.effort_value == null || e.effort_value === "" ? null : String(e.effort_value),
          rest_seconds: n(e.rest_seconds) ?? 90,
          intensifier: (e.intensifier as PlanExercise["intensifier"]) ?? null,
          intensifier_on: e.intensifier_on === "all" ? "all" : "last",
          film_set: n(e.film_set),
          notes: s(e.notes),
        };
      }),
    })),
    cardio: c
      ? {
          weekly_minutes: n(c.weekly_minutes) ?? 0,
          daily_steps: n(c.daily_steps),
          extra_counts: c.extra_counts !== false,
          sessions: arr<Record<string, unknown>>(c.sessions).map((x) => ({
            day: n(x.day),
            kind: s(x.kind) ?? "Incline walk",
            minutes: n(x.minutes) ?? 30,
            mode: (["hr", "rpe", "speed", "intervals"].includes(String(x.mode)) ? x.mode : "rpe") as CardioMode,
            target: x.target == null ? null : String(x.target),
            iv_work: n(x.iv_work),
            iv_rest: n(x.iv_rest),
            iv_rounds: n(x.iv_rounds),
            timing: s(x.timing),
            notes: s(x.notes),
          })),
        }
      : null,
  };
}

/** Read a nutrition body safely, filling in defaults for anything left out. */
export function nutritionBody(raw: unknown): NutritionBody {
  const b = (raw ?? {}) as Record<string, unknown>;
  const style = (["macros", "plan", "portions"].includes(String(b.style)) ? b.style : "macros") as Style;
  return {
    style,
    notes: s(b.notes),
    day_types: arr<Record<string, unknown>>(b.day_types).map((d, i) => ({
      name: s(d.name) ?? `Day type ${i + 1}`,
      weekdays: days(d.weekdays),
      kcal: n(d.kcal),
      protein_g: n(d.protein_g),
      carbs_g: n(d.carbs_g),
      fat_g: n(d.fat_g),
      fibre_g: n(d.fibre_g),
      sodium_mg: n(d.sodium_mg),
      water_ml: n(d.water_ml),
      palms: n(d.palms),
      fists: n(d.fists),
      cupped: n(d.cupped),
      thumbs: n(d.thumbs),
      notes: s(d.notes),
      meals: arr<Record<string, unknown>>(d.meals).map((m, mi) => ({
        name: s(m.name) ?? `Meal ${mi + 1}`,
        notes: s(m.notes),
        items: arr<Record<string, unknown>>(m.items)
          .map((it) => ({ food_id: s(it.food_id) ?? undefined, food: s(it.food) ?? undefined, grams: n(it.grams) ?? 0 }))
          .filter((it) => it.grams > 0),
      })),
    })),
  };
}

const key = (v: string) => v.trim().toLowerCase();

/** Match each exercise to the library: by id if it's still there, otherwise by name. */
export function resolveExercises(body: TrainingBody, library: { id: string; name: string }[]) {
  const ids = new Set(library.map((e) => e.id));
  const byName = new Map(library.map((e) => [key(e.name), e]));
  const byId = new Map(library.map((e) => [e.id, e]));
  const missing = new Set<string>();
  const workouts = body.workouts.map((w) => ({
    ...w,
    exercises: w.exercises.flatMap((e) => {
      const hit = e.exercise_id && ids.has(e.exercise_id) ? byId.get(e.exercise_id)! : e.exercise ? byName.get(key(e.exercise)) : undefined;
      if (!hit) {
        missing.add(e.exercise ?? "An exercise that's been deleted");
        return [];
      }
      return [{ ...e, exercise_id: hit.id, exercise: hit.name } as TemplateExercise & { exercise_id: string }];
    }),
  }));
  return { workouts, missing: [...missing] };
}

/** Match each food to the shared food library: by id if it's still there, otherwise by name (plain foods first). */
export function resolveFoods(body: NutritionBody, foods: { id: string; name: string; brand: string | null }[]) {
  const ids = new Map(foods.map((f) => [f.id, f]));
  const byName = new Map<string, { id: string; name: string }>();
  // Unbranded foods win a name clash, so "Chicken breast" means the plain one.
  [...foods].sort((a, b) => Number(!!b.brand) - Number(!!a.brand)).forEach((f) => byName.set(key(f.name), f));
  const missing = new Set<string>();
  const day_types = body.day_types.map((d) => ({
    ...d,
    meals: d.meals.map((m) => ({
      ...m,
      items: m.items.flatMap((it) => {
        const hit = it.food_id && ids.has(it.food_id) ? ids.get(it.food_id)! : it.food ? byName.get(key(it.food)) : undefined;
        if (!hit) {
          missing.add(it.food ?? "A food that's been deleted");
          return [];
        }
        return [{ food_id: hit.id, food: hit.name, grams: it.grams }];
      }),
    })),
  }));
  return { day_types, missing: [...missing] };
}

/** Days a week a training template asks for: the set weekdays if any, otherwise one per session. */
export function daysPerWeek(b: TrainingBody) {
  const set = new Set(b.workouts.flatMap((w) => w.weekdays));
  return set.size || b.workouts.length;
}

/** "1,600 kcal" or "1,600 to 1,900 kcal". */
export function kcalRange(b: NutritionBody) {
  const k = b.day_types.map((d) => d.kcal).filter((x): x is number => !!x);
  if (!k.length) return null;
  const lo = Math.min(...k);
  const hi = Math.max(...k);
  const f = (x: number) => x.toLocaleString("en-GB");
  return lo === hi ? `${f(lo)} kcal` : `${f(lo)} to ${f(hi)} kcal`;
}

/** Short tag line for a card, e.g. "Fat loss · Intermediate · Gym · Women". */
export function tagLine(t: Pick<Template, "goal" | "level" | "location" | "audience" | "competitor">) {
  return [t.goal, t.level, t.location && t.location !== "Any" ? t.location : null, t.audience !== "any" ? AUDIENCE[t.audience] : null, t.competitor !== "any" ? COMPETITOR[t.competitor] : null]
    .filter(Boolean)
    .join(" · ");
}

export const templatePath = (t: { id: string; kind: TemplateKind }) => `/coach/library/${t.kind === "training" ? "programmes" : "nutrition"}/${t.id}`;
