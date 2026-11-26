"use server";

import { inFolder } from "@/lib/paths";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { z as z4 } from "zod/v4";
import { requireCoach, requireProfile } from "@/lib/auth";
import { aiEnabled, draftWithAi } from "@/lib/ai";

const uuid = z.string().uuid();
const clamp = (n: unknown, lo: number, hi: number, fallback: number | null = null) => {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return v == null ? null : Math.min(hi, Math.max(lo, Math.round(v)));
};

export type AiFormResult = { error?: string } | null;

type Supa = Awaited<ReturnType<typeof requireCoach>>["supabase"];

/** What the AI is told about a client. No name, contact details or date of birth: just what's needed to plan. */
async function clientBrief(supabase: Supa, clientId: string) {
  const [{ data: intake }, { data: lastCheckin }] = await Promise.all([
    supabase.from("client_intake").select("*").eq("client_id", clientId).maybeSingle(),
    supabase.from("checkins").select("weight_kg, created_at").eq("client_id", clientId).not("weight_kg", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!intake) return null;
  const age = intake.date_of_birth ? Math.floor((Date.now() - Date.parse(intake.date_of_birth)) / (365.25 * 86_400_000)) : null;
  const lines = [
    `Sex: ${intake.sex ?? "not given"}`,
    age ? `Age: ${age}` : null,
    intake.height_cm ? `Height: ${intake.height_cm} cm` : null,
    `Weight: ${lastCheckin?.weight_kg ?? intake.start_weight_kg ?? "not given"} kg`,
    `Goal: ${intake.goal}${intake.goal_detail ? ` (${intake.goal_detail})` : ""}`,
    intake.competes ? `Competes: ${[intake.federation, intake.division].filter(Boolean).join(" ")}` : "Doesn't compete",
    intake.days_per_week ? `Training days a week: ${intake.days_per_week}` : null,
    intake.session_minutes ? `Session length: ${intake.session_minutes} minutes` : null,
    intake.experience ? `Experience: ${intake.experience}` : null,
    intake.injuries ? `Injuries: ${intake.injuries}` : "Injuries: none given",
    intake.screening_flag && intake.screening_details ? `Health notes: ${intake.screening_details}` : null,
    intake.nutrition_style ? `Preferred nutrition style: ${intake.nutrition_style}` : null,
    intake.dietary_needs ? `Dietary needs: ${intake.dietary_needs}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

// ---------- training ----------

const ProgrammeDraft = z4.object({
  name: z4.string(),
  notes: z4.string(),
  workouts: z4.array(
    z4.object({
      name: z4.string(),
      exercises: z4.array(
        z4.object({
          exercise_id: z4.string(),
          superset_with_previous: z4.boolean(),
          warmup_sets: z4.number(),
          work_sets: z4.number(),
          reps_min: z4.number(),
          reps_max: z4.number(),
          rir: z4.number(),
          rest_seconds: z4.number(),
          tempo: z4.string(),
          notes: z4.string(),
        }),
      ),
    }),
  ),
});

/** Draft a programme with AI. It's saved as a new draft: the client keeps their current programme until Adam makes this one live. */
export async function draftProgramme(_prev: AiFormResult, form: FormData): Promise<AiFormResult> {
  const { supabase } = await requireCoach();
  const clientId = uuid.safeParse(form.get("client_id"));
  if (!clientId.success) return { error: "Client not found." };
  const brief = String(form.get("brief") ?? "").trim().slice(0, 1500);
  const about = await clientBrief(supabase, clientId.data);
  if (!about) return { error: "This client hasn't finished sign-up, so there's nothing to plan from yet." };

  const [{ data: gym }, { data: library }] = await Promise.all([
    supabase.from("gyms").select("name, equipment").eq("client_id", clientId.data).eq("is_main", true).maybeSingle(),
    supabase.from("exercises").select("id, name, muscle, equipment").order("muscle").order("name"),
  ]);
  const kit = gym?.equipment as string[] | null | undefined;
  const usable = (library ?? []).filter((e) => !kit || (e.equipment as string[]).every((k) => kit.includes(k)));
  if (!usable.length) return { error: "No exercises in the library match this client's gym kit." };
  const ids = new Set(usable.map((e) => e.id as string));

  const prompt = `Draft a training programme for this client.

About the client:
${about}
${gym ? `Main gym: ${gym.name}. Only exercises they have kit for are listed below.` : "No gym kit given."}

Adam's brief: ${brief || "Use your judgement from the client's goal, experience and days a week."}

Exercise library (use only these, by id):
${usable.map((e) => `${e.id} | ${e.name} | ${e.muscle}`).join("\n")}

Rules for the draft:
- One workout per training day (use the client's days a week unless the brief says otherwise). Name each like "Day 1: Upper".
- 4 to 8 exercises per workout. Fit the session length.
- reps_min and reps_max are a rep range (same number for fixed reps). rir is reps in reserve, 0 to 4. rest_seconds 30 to 300.
- Tempo like "3-1-1-0", or "" if not needed. warmup_sets 0 to 3 (usually 1 to 2 on the first compound lift).
- superset_with_previous is true only to pair an exercise with the one before it.
- notes: one short coaching cue per exercise, or "".
- Programme notes: 2 to 4 sentences on the split, progression and anything you avoided because of injuries.`;

  await supabase.from("ai_calls").insert({ client_id: clientId.data, kind: "programme" });
  const res = await draftWithAi({ schema: ProgrammeDraft, prompt, effort: "medium" });
  if ("error" in res) return { error: res.error };
  const d = res.data;

  const workouts = d.workouts
    .map((w) => ({ name: w.name.trim().slice(0, 60) || "Session", exercises: w.exercises.filter((e) => ids.has(e.exercise_id)).slice(0, 15) }))
    .filter((w) => w.exercises.length)
    .slice(0, 7);
  if (!workouts.length) return { error: "The draft didn't use any exercises from the library. Please try again." };

  const { data: prog, error } = await supabase
    .from("programmes")
    .insert({ client_id: clientId.data, name: (d.name.trim() || "Training programme").slice(0, 80), notes: `AI draft. ${d.notes}`.slice(0, 2000) })
    .select("id")
    .single();
  if (error || !prog) return { error: "Couldn't save the draft. Please try again." };

  for (const [wi, w] of workouts.entries()) {
    const { data: row, error: wErr } = await supabase.from("workouts").insert({ programme_id: prog.id, client_id: clientId.data, name: w.name, position: wi }).select("id").single();
    if (wErr || !row) return { error: "Couldn't save the draft sessions. Please try again." };
    const rows = w.exercises.map((e, i) => {
      const lo = clamp(e.reps_min, 1, 100, 8)!;
      const hi = Math.max(lo, clamp(e.reps_max, 1, 100, lo)!);
      return {
        workout_id: row.id,
        client_id: clientId.data,
        exercise_id: e.exercise_id,
        position: i,
        linked_to_previous: i > 0 && e.superset_with_previous,
        warmup_sets: clamp(e.warmup_sets, 0, 5, 0),
        work_sets: clamp(e.work_sets, 1, 8, 3),
        reps_type: lo === hi ? "fixed" : "range",
        reps_min: lo,
        reps_max: hi,
        tempo: /^[\dXx]-[\dXx]-[\dXx]-[\dXx]$/.test(e.tempo.trim()) ? e.tempo.trim() : null,
        effort_type: "RIR",
        effort_value: String(clamp(e.rir, 0, 5, 2)),
        rest_seconds: clamp(e.rest_seconds, 0, 600, 90),
        notes: e.notes.trim().slice(0, 500) || null,
      };
    });
    const { error: eErr } = await supabase.from("workout_exercises").insert(rows);
    if (eErr) return { error: "Couldn't save the draft exercises. Please try again." };
  }
  revalidatePath(`/coach/clients/${clientId.data}/training`);
  redirect(`/coach/clients/${clientId.data}/training?drafted=1`);
}

// ---------- nutrition ----------

const NutritionDraft = z4.object({
  notes: z4.string(),
  day_types: z4.array(
    z4.object({
      name: z4.string(),
      weekdays: z4.array(z4.number()),
      kcal: z4.number(),
      protein_g: z4.number(),
      carbs_g: z4.number(),
      fat_g: z4.number(),
      fibre_g: z4.number(),
      palms: z4.number(),
      fists: z4.number(),
      cupped: z4.number(),
      thumbs: z4.number(),
      meals: z4.array(z4.object({ name: z4.string(), items: z4.array(z4.object({ food_id: z4.string(), grams: z4.number() })) })),
    }),
  ),
});

/** Draft targets (and meals, for meal plan clients). Sodium and water are left blank for Adam. */
export async function draftNutrition(_prev: AiFormResult, form: FormData): Promise<AiFormResult> {
  const { supabase } = await requireCoach();
  const clientId = uuid.safeParse(form.get("client_id"));
  if (!clientId.success) return { error: "Client not found." };
  const style = z.enum(["macros", "plan", "portions"]).catch("macros").parse(form.get("style"));
  const brief = String(form.get("brief") ?? "").trim().slice(0, 1500);
  const about = await clientBrief(supabase, clientId.data);
  if (!about) return { error: "This client hasn't finished sign-up, so there's nothing to plan from yet." };

  const { data: foods } = style === "plan" ? await supabase.from("foods").select("id, name, kcal, protein_g, carbs_g, fat_g").or(`owner_id.is.null,owner_id.eq.${clientId.data}`).order("name") : { data: [] };
  const foodIds = new Set((foods ?? []).map((f) => f.id as string));

  const styleText =
    style === "plan"
      ? "a meal plan: 3 to 5 meals per day type, each with foods from the list below and grams, adding up close to the day's targets"
      : style === "portions"
        ? "hand portions: palms of protein, fists of veg, cupped hands of carbs and thumbs of fats per day, plus the matching kcal and macros. Leave meals empty."
        : "kcal and macro targets only. Leave meals empty and portions at 0.";

  const prompt = `Draft nutrition targets for this client, as ${styleText}

About the client:
${about}

Adam's brief: ${brief || "Use your judgement from the client's goal. Usually a training day and a rest day."}
${style === "plan" ? `\nFoods (per 100 g: kcal, protein, carbs, fat). Use only these, by id:\n${(foods ?? []).map((f) => `${f.id} | ${f.name} | ${f.kcal} | ${f.protein_g} | ${f.carbs_g} | ${f.fat_g}`).join("\n")}\n` : ""}
Rules for the draft:
- 1 to 4 day types (e.g. Training day, Rest day). weekdays uses 1 = Monday to 7 = Sunday; every day of the week belongs to exactly one day type.
- Protein around 1.6 to 2.2 g per kg of body weight. Keep fat at least 0.6 g per kg. Fibre 25 to 40 g.
- A sensible, sustainable deficit or surplus for the goal. Never below 1,200 kcal for women or 1,500 kcal for men.
- Do not include water, sodium or salt anywhere, not even in notes.
- Notes: 2 to 4 sentences on how you set the targets, so Adam can check the reasoning.`;

  await supabase.from("ai_calls").insert({ client_id: clientId.data, kind: "nutrition" });
  const res = await draftWithAi({ schema: NutritionDraft, prompt, effort: "medium" });
  if ("error" in res) return { error: res.error };
  const d = res.data;
  const dayTypes = d.day_types.slice(0, 4);
  if (!dayTypes.length) return { error: "The draft came back empty. Please try again." };

  const { data: plan, error } = await supabase
    .from("nutrition_plans")
    .insert({ client_id: clientId.data, style, notes: `AI draft. ${d.notes}`.slice(0, 2000) })
    .select("id")
    .single();
  if (error || !plan) return { error: "Couldn't save the draft. Please try again." };

  const portion = (n: number) => (style === "portions" ? Math.min(20, Math.max(0, Math.round(n * 2) / 2)) || null : null);
  for (const [i, t] of dayTypes.entries()) {
    const { data: day, error: dErr } = await supabase
      .from("day_types")
      .insert({
        plan_id: plan.id,
        client_id: clientId.data,
        name: t.name.trim().slice(0, 40) || `Day type ${i + 1}`,
        position: i,
        weekdays: [...new Set(t.weekdays.filter((w) => Number.isInteger(w) && w >= 1 && w <= 7))],
        kcal: clamp(t.kcal, 800, 6000),
        protein_g: clamp(t.protein_g, 0, 500),
        carbs_g: clamp(t.carbs_g, 0, 1000),
        fat_g: clamp(t.fat_g, 0, 400),
        fibre_g: clamp(t.fibre_g, 0, 100),
        palms: portion(t.palms),
        fists: portion(t.fists),
        cupped: portion(t.cupped),
        thumbs: portion(t.thumbs),
        // sodium_mg and water_ml stay empty: coach-set only.
      })
      .select("id")
      .single();
    if (dErr || !day) return { error: "Couldn't save the draft day types. Please try again." };
    if (style !== "plan") continue;
    for (const [mi, m] of t.meals.slice(0, 8).entries()) {
      const items = m.items.filter((it) => foodIds.has(it.food_id) && it.grams > 0).slice(0, 15);
      if (!items.length) continue;
      const { data: meal } = await supabase.from("plan_meals").insert({ day_type_id: day.id, client_id: clientId.data, name: m.name.trim().slice(0, 40) || `Meal ${mi + 1}`, position: mi }).select("id").single();
      if (!meal) continue;
      await supabase.from("plan_meal_items").insert(items.map((it, ii) => ({ meal_id: meal.id, client_id: clientId.data, food_id: it.food_id, grams: Math.min(2000, Math.round(it.grams)), position: ii })));
    }
  }
  revalidatePath(`/coach/clients/${clientId.data}/nutrition`);
  redirect(`/coach/clients/${clientId.data}/nutrition?drafted=1`);
}

// ---------- eating out (client) ----------

const MenuPicks = z4.object({
  readable: z4.boolean(),
  dishes: z4.array(
    z4.object({
      name: z4.string(),
      why: z4.string(),
      ask_for: z4.string(),
      kcal: z4.number(),
      protein_g: z4.number(),
      carbs_g: z4.number(),
      fat_g: z4.number(),
    }),
  ),
  tip: z4.string(),
});

export type MenuPick = { name: string; why: string; ask_for: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number };
const remainingInput = z.object({ kcal: z.number(), protein_g: z.number(), carbs_g: z.number(), fat_g: z.number() }).partial();
const MENU_DAILY_LIMIT = 8;
const IMAGE_TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" } as const;

/** Read a menu photo and rank the dishes by how well they fit what's left of today. Estimates only. */
export async function suggestFromMenu(input: { photo_path: string; remaining: z.input<typeof remainingInput> }): Promise<{ picks?: MenuPick[]; tip?: string; error?: string }> {
  const { supabase, user } = await requireProfile();
  if (!aiEnabled()) return { error: "Menu suggestions aren't switched on yet. Send it to Adam instead." };
  const path = String(input.photo_path ?? "");
  if (!inFolder(path, user.id)) return { error: "That photo couldn't be read." };
  const ext = path.split(".").pop()?.toLowerCase() as keyof typeof IMAGE_TYPES | undefined;
  const mediaType = ext ? IMAGE_TYPES[ext] : undefined;
  if (!mediaType) return { error: "Suggestions work with JPEG, PNG or WebP photos. Send this one to Adam instead." };
  const remaining = remainingInput.safeParse(input.remaining);
  // Cap menu suggestions per client, so the AI bill can't run away.
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await supabase.from("ai_calls").select("id", { count: "exact", head: true }).eq("client_id", user.id).eq("kind", "menu").gte("created_at", since);
  if ((count ?? 0) >= MENU_DAILY_LIMIT) return { error: `That's ${MENU_DAILY_LIMIT} menus in a day, the most for now. Send this one to Adam instead.` };
  const { error: logErr } = await supabase.from("ai_calls").insert({ client_id: user.id, kind: "menu" });
  if (logErr) return { error: "Menu suggestions aren't available right now. Send it to Adam instead." };
  const { data: file, error } = await supabase.storage.from("menu-photos").download(path);
  if (error || !file) return { error: "Couldn't open the photo. Please try again." };
  if (file.size > 5_000_000) return { error: "That photo is too big for suggestions. Send it to Adam instead." };
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  const left = remaining.success ? remaining.data : {};
  const prompt = `This is a photo of a restaurant menu. A coaching client wants to eat out and stay on track.
What's left of their targets today: ${left.kcal != null ? `${Math.round(left.kcal)} kcal, ` : ""}${left.protein_g != null ? `${Math.round(left.protein_g)} g protein, ` : ""}${left.carbs_g != null ? `${Math.round(left.carbs_g)} g carbs, ` : ""}${left.fat_g != null ? `${Math.round(left.fat_g)} g fat` : ""}${left.kcal == null ? "not known, so favour high protein, sensible portions" : ""}.

Pick the 3 to 5 dishes on this menu that fit best, best first. For each: the dish name as written, one short line on why it fits, one simple thing to ask for (e.g. sauce on the side, swap chips for salad), and your best estimate of kcal, protein, carbs and fat for a normal restaurant portion.
Set readable to false and leave dishes empty if this isn't a menu or you can't read it.
tip: one friendly sentence of general advice for eating out. Never mention water, salt or sodium. Don't lecture.`;

  const res = await draftWithAi({ schema: MenuPicks, prompt, image: { mediaType, base64 }, effort: "low" });
  if ("error" in res) return { error: res.error };
  if (!res.data.readable || !res.data.dishes.length) return { error: "Couldn't read a menu in that photo. Try a clearer one, or send it to Adam." };
  const picks = res.data.dishes.slice(0, 5).map((p) => ({
    name: p.name.slice(0, 120),
    why: p.why.slice(0, 300),
    ask_for: p.ask_for.slice(0, 300),
    kcal: clamp(p.kcal, 0, 4000, 0)!,
    protein_g: clamp(p.protein_g, 0, 300, 0)!,
    carbs_g: clamp(p.carbs_g, 0, 500, 0)!,
    fat_g: clamp(p.fat_g, 0, 300, 0)!,
  }));
  return { picks, tip: res.data.tip.slice(0, 300) };
}

const estimateInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  kcal: z.number().min(0).max(4000),
  protein_g: z.number().min(0).max(300),
  carbs_g: z.number().min(0).max(500),
  fat_g: z.number().min(0).max(300),
});

/** Log a restaurant dish as an estimate. */
export async function logRestaurantEstimate(input: z.input<typeof estimateInput>): Promise<{ error?: string }> {
  const { supabase, user } = await requireProfile();
  const parsed = estimateInput.safeParse(input);
  if (!parsed.success) return { error: "Couldn't log that." };
  const d = parsed.data;
  const { error } = await supabase.from("food_logs").insert({
    client_id: user.id,
    log_date: d.date,
    meal: d.meal,
    name: `${d.name} (restaurant estimate)`,
    grams: null,
    eating_out: true,
    kcal: d.kcal,
    protein_g: d.protein_g,
    carbs_g: d.carbs_g,
    fat_g: d.fat_g,
  });
  if (error) return { error: "Couldn't log that. Please try again." };
  revalidatePath("/app/food");
  return {};
}
