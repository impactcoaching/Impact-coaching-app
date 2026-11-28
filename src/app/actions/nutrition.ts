"use server";

import { inFolder } from "@/lib/paths";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCoach, requireProfile } from "@/lib/auth";
import { forGrams, type Food, type FoundFood } from "@/lib/nutrition";
import { searchOff } from "@/lib/openfoodfacts";
import { dayTypeInput } from "@/lib/schemas";

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ---------- food search (coach and client) ----------

/** Search Open Food Facts for branded and supermarket foods in the person's country. */
export async function searchSupermarket(q: string, country: string | null): Promise<{ foods: FoundFood[]; error?: string }> {
  await requireProfile();
  const query = q.trim().slice(0, 80);
  if (query.length < 2) return { foods: [] };
  return searchOff(query, country, true);
}

const foodInput = z.object({
  name: z.string().trim().min(1).max(120),
  brand: z.string().trim().max(80).nullable(),
  kcal: z.number().min(0).max(950),
  protein_g: z.number().min(0).max(100),
  carbs_g: z.number().min(0).max(100),
  fat_g: z.number().min(0).max(100),
  fibre_g: z.number().min(0).max(100).nullable(),
  sodium_mg: z.number().min(0).max(40000).nullable(),
  serving_g: z.number().min(0).max(2000).nullable(),
  serving_name: z.string().trim().max(40).nullable(),
  barcode: z.string().max(20).nullable(),
  source: z.enum(["coach", "client", "off"]),
});

/**
 * Save a food to the library. The coach's foods are shared with everyone;
 * a client's foods are theirs only. A supermarket food someone picks is saved
 * once, so it shows up straight away next time.
 */
export async function saveFood(input: z.input<typeof foodInput>): Promise<{ food?: Food; error?: string }> {
  const { supabase, user, profile } = await requireProfile();
  const parsed = foodInput.safeParse(input);
  if (!parsed.success) return { error: "Check the numbers: they're per 100 g, so protein, carbs and fat can't be over 100." };
  const d = parsed.data;
  if (d.protein_g + d.carbs_g + d.fat_g > 101) return { error: "Protein, carbs and fat add up to more than 100 g in 100 g. Check the label." };
  const coach = profile.role === "coach";
  const owner = coach ? null : user.id;
  if (d.barcode) {
    let q = supabase.from("foods").select("*").eq("barcode", d.barcode);
    q = owner ? q.or(`owner_id.is.null,owner_id.eq.${owner}`) : q.is("owner_id", null);
    const { data: existing } = await q.limit(1).maybeSingle<Food>();
    if (existing) return { food: existing };
  }
  const { data, error } = await supabase
    .from("foods")
    .insert({ ...d, source: d.source === "off" ? "off" : coach ? "coach" : "client", owner_id: owner })
    .select("*")
    .single<Food>();
  if (error || !data) return { error: "Couldn't save that food. Please try again." };
  return { food: data };
}

// ---------- coach: plans ----------

export async function createNutritionPlan(form: FormData) {
  const { supabase } = await requireCoach();
  const clientId = uuid.parse(form.get("client_id"));
  const style = z.enum(["macros", "plan", "portions"]).catch("macros").parse(form.get("style"));
  const { data: plan, error } = await supabase.from("nutrition_plans").insert({ client_id: clientId, style }).select("id").single();
  if (error || !plan) throw new Error("Couldn't create the plan");
  await supabase.from("day_types").insert([
    { plan_id: plan.id, client_id: clientId, name: "Training day", position: 0, weekdays: [1, 2, 4, 5] },
    { plan_id: plan.id, client_id: clientId, name: "Rest day", position: 1, weekdays: [3, 6, 7] },
  ]);
  revalidatePath(`/coach/clients/${clientId}/nutrition`);
}

export async function setNutritionLive(form: FormData) {
  const { supabase } = await requireCoach();
  const id = uuid.parse(form.get("plan_id"));
  const live = form.get("live") === "true";
  const { data } = await supabase.from("nutrition_plans").update({ is_live: live }).eq("id", id).select("client_id").single();
  if (data) revalidatePath(`/coach/clients/${data.client_id}/nutrition`);
}

const planInput = z.object({
  planId: uuid,
  style: z.enum(["macros", "plan", "portions"]),
  notes: z.string().max(2000).nullable(),
  dayTypes: z.array(dayTypeInput).min(1).max(7),
});

export async function saveNutritionPlan(input: z.input<typeof planInput>): Promise<{ error?: string }> {
  const { supabase } = await requireCoach();
  const parsed = planInput.safeParse(input);
  if (!parsed.success) return { error: "Some of the numbers aren't valid. Check each day type." };
  const { planId, style, notes, dayTypes } = parsed.data;
  const { data: plan } = await supabase.from("nutrition_plans").select("client_id").eq("id", planId).single();
  if (!plan) return { error: "That plan no longer exists." };
  const clientId = plan.client_id as string;

  const { error: upErr } = await supabase.from("nutrition_plans").update({ style, notes }).eq("id", planId);
  if (upErr) return { error: "Couldn't save. Please try again." };

  // Keep day types that still exist (so a client's past days keep their day type), add new ones, remove the rest.
  const { data: existing } = await supabase.from("day_types").select("id").eq("plan_id", planId);
  const keep = new Set(dayTypes.map((d) => d.id).filter(Boolean));
  const gone = (existing ?? []).map((d) => d.id as string).filter((id) => !keep.has(id));
  if (gone.length) await supabase.from("day_types").delete().in("id", gone);

  for (const [position, d] of dayTypes.entries()) {
    const { meals, id, ...fields } = d;
    const row = { ...fields, position, plan_id: planId, client_id: clientId };
    let dayId = id;
    if (dayId && (existing ?? []).some((e) => e.id === dayId)) {
      const { error } = await supabase.from("day_types").update(row).eq("id", dayId);
      if (error) return { error: "Couldn't save. Please try again." };
    } else {
      const { data, error } = await supabase.from("day_types").insert(row).select("id").single();
      if (error || !data) return { error: "Couldn't save. Please try again." };
      dayId = data.id as string;
    }
    // Meals are rewritten each time; nothing else points at them.
    await supabase.from("plan_meals").delete().eq("day_type_id", dayId);
    for (const [mi, m] of meals.entries()) {
      const { data: meal, error } = await supabase
        .from("plan_meals")
        .insert({ day_type_id: dayId, client_id: clientId, name: m.name, notes: m.notes, position: mi })
        .select("id")
        .single();
      if (error || !meal) return { error: "Couldn't save the meals. Please try again." };
      if (m.items.length) {
        const { error: itemErr } = await supabase
          .from("plan_meal_items")
          .insert(m.items.map((it, ii) => ({ meal_id: meal.id, client_id: clientId, food_id: it.food_id, grams: it.grams, position: ii })));
        if (itemErr) return { error: "Couldn't save the meals. Please try again." };
      }
    }
  }
  revalidatePath(`/coach/clients/${clientId}/nutrition`);
  return {};
}

export async function replyEatingOut(form: FormData) {
  const { supabase } = await requireCoach();
  const id = uuid.parse(form.get("id"));
  const reply = z.string().trim().min(1).max(2000).safeParse(form.get("reply"));
  if (!reply.success) return;
  const { data } = await supabase.from("eating_out").update({ coach_reply: reply.data, replied_at: new Date().toISOString() }).eq("id", id).select("client_id").single();
  if (data) revalidatePath(`/coach/clients/${data.client_id}/nutrition`);
}

// ---------- client: diary ----------

const logInput = z.object({
  date,
  meal: z.string().trim().min(1).max(40),
  eatingOut: z.boolean().default(false),
  entries: z
    .array(
      z.object({
        food_id: uuid,
        grams: z.number().min(1).max(5000),
      }),
    )
    .min(1)
    .max(30),
});

/** Add foods to the diary. Numbers are worked out here from the saved food, so they can't be tampered with. */
export async function logFoods(input: z.input<typeof logInput>): Promise<{ error?: string }> {
  const { supabase, user } = await requireProfile();
  const parsed = logInput.safeParse(input);
  if (!parsed.success) return { error: "Check the amount and try again." };
  const { date: d, meal, eatingOut, entries } = parsed.data;
  const ids = [...new Set(entries.map((e) => e.food_id))];
  const { data: foods } = await supabase.from("foods").select("*").in("id", ids);
  const byId = new Map((foods as Food[] | null)?.map((f) => [f.id, f]) ?? []);
  const rows = [];
  for (const e of entries) {
    const f = byId.get(e.food_id);
    if (!f) return { error: "One of those foods couldn't be found." };
    rows.push({
      client_id: user.id,
      log_date: d,
      meal,
      food_id: f.id,
      name: f.brand ? `${f.name} (${f.brand})` : f.name,
      grams: e.grams,
      eating_out: eatingOut,
      ...forGrams(f, e.grams),
    });
  }
  const { error } = await supabase.from("food_logs").insert(rows);
  if (error) return { error: "Couldn't add that. Please try again." };
  revalidatePath("/app/food");
  return {};
}

export async function deleteFoodLog(id: string): Promise<{ error?: string }> {
  const { supabase } = await requireProfile();
  if (!uuid.safeParse(id).success) return { error: "Not found." };
  const { error } = await supabase.from("food_logs").delete().eq("id", id);
  if (error) return { error: "Couldn't remove that. Please try again." };
  revalidatePath("/app/food");
  return {};
}

const dayInput = z.object({
  date,
  day_type_id: uuid.nullable().optional(),
  water_ml: z.number().int().min(0).max(20000).optional(),
  portions: z.record(z.enum(["palms", "fists", "cupped", "thumbs"]), z.number().min(0).max(20)).optional(),
});

/** Save the day's water, hand portions or day type. */
export async function saveDay(input: z.input<typeof dayInput>): Promise<{ error?: string }> {
  const { supabase, user } = await requireProfile();
  const parsed = dayInput.safeParse(input);
  if (!parsed.success) return { error: "Couldn't save that." };
  const { date: d, ...patch } = parsed.data;
  const { error } = await supabase.from("nutrition_days").upsert({ client_id: user.id, log_date: d, ...patch }, { onConflict: "client_id,log_date" });
  if (error) return { error: "Couldn't save that. Please try again." };
  revalidatePath("/app/food");
  return {};
}

const eatingOutInput = z.object({
  photo_path: z.string().max(300).nullable(),
  note: z.string().trim().max(1000).nullable(),
  remaining: z.object({ kcal: z.number(), protein_g: z.number(), carbs_g: z.number(), fat_g: z.number() }).partial(),
});

/** Send a menu photo to the coach, with what's left of today's targets. */
export async function sendEatingOut(input: z.input<typeof eatingOutInput>): Promise<{ error?: string }> {
  const { supabase, user } = await requireProfile();
  const parsed = eatingOutInput.safeParse(input);
  if (!parsed.success) return { error: "Couldn't send that. Please try again." };
  const { photo_path, note, remaining } = parsed.data;
  if (!photo_path && !note) return { error: "Add a photo of the menu or a note first." };
  if (photo_path && !inFolder(photo_path, user.id)) return { error: "That photo couldn't be attached." };
  const { error } = await supabase.from("eating_out").insert({ client_id: user.id, photo_path, note, remaining });
  if (error) return { error: "Couldn't send that. Please try again." };
  revalidatePath("/app/food");
  return {};
}
