// Zod schemas shared by the client plan actions and the templates library.

import { z } from "zod";

const uuid = z.string().uuid();
const int = (max: number) => z.number().int().min(0).max(max).nullable();
const portion = z.number().min(0).max(20).nullable();

export const intensifier = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("drop"), drops: z.number().int().min(1).max(5), pct: z.number().int().min(5).max(60) }),
    z.object({ type: z.literal("rp"), mini: z.number().int().min(1).max(6), rest: z.number().int().min(5).max(60) }),
    z.object({ type: z.literal("cluster"), clusters: z.number().int().min(2).max(8), reps: z.number().int().min(1).max(10), rest: z.number().int().min(5).max(90) }),
    z.object({ type: z.literal("myo"), mini: z.number().int().min(1).max(8), reps: z.number().int().min(1).max(10), rest: z.number().int().min(3).max(30) }),
    z.object({ type: z.literal("partials"), reps: z.number().int().min(1).max(20) }),
  ])
  .nullable();

export const planExercise = z.object({
  exercise_id: uuid,
  linked_to_previous: z.boolean(),
  warmup_sets: z.number().int().min(0).max(10),
  work_sets: z.number().int().min(1).max(20),
  reps_type: z.enum(["fixed", "range", "amrap", "time"]),
  reps_min: z.number().int().min(1).max(300).nullable(),
  reps_max: z.number().int().min(1).max(300).nullable(),
  tempo: z.string().max(20).nullable(),
  effort_type: z.enum(["RIR", "RPE", "%1RM", "Weight"]),
  effort_value: z.string().max(20).nullable(),
  rest_seconds: z.number().int().min(0).max(900),
  intensifier,
  intensifier_on: z.enum(["last", "all"]),
  film_set: z.number().int().min(1).max(20).nullable(),
  notes: z.string().max(1000).nullable(),
});

export const dayTypeInput = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(40),
  weekdays: z.array(z.number().int().min(1).max(7)).max(7),
  kcal: int(10000),
  protein_g: int(1000),
  carbs_g: int(2000),
  fat_g: int(1000),
  fibre_g: int(200),
  sodium_mg: int(20000),
  water_ml: int(15000),
  palms: portion,
  fists: portion,
  cupped: portion,
  thumbs: portion,
  notes: z.string().max(1000).nullable(),
  meals: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        notes: z.string().max(500).nullable(),
        items: z.array(z.object({ food_id: uuid, grams: z.number().min(1).max(5000) })).max(30),
      }),
    )
    .max(10),
});

