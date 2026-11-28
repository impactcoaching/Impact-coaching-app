"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCoach } from "@/lib/auth";
import { parseCardioForm } from "@/lib/cardio-form";
import { dayTypeInput, planExercise } from "@/lib/schemas";
import {
  AUDIENCE,
  COMPETITOR,
  LEVELS,
  LOCATIONS,
  nutritionBody,
  resolveExercises,
  resolveFoods,
  templatePath,
  trainingBody,
  type NutritionBody,
  type TemplateKind,
  type TrainingBody,
} from "@/lib/templates";

type Supa = Awaited<ReturnType<typeof requireCoach>>["supabase"];
export type TemplateResult = { ok?: string; error?: string } | null;

const uuid = z.string().uuid();
const kind = z.enum(["training", "nutrition"]);
const listPath = (k: TemplateKind) => `/coach/library/${k === "training" ? "programmes" : "nutrition"}`;

async function load(supabase: Supa, id: string) {
  const { data } = await supabase.from("templates").select("id, kind, name, body").eq("id", id).maybeSingle<{ id: string; kind: TemplateKind; name: string; body: unknown }>();
  return data;
}

function refresh(t: { id: string; kind: TemplateKind }) {
  revalidatePath(listPath(t.kind));
  revalidatePath(templatePath(t));
}

/** A clearer message when the templates table isn't there yet. */
const tableError = (e: { code?: string } | null) =>
  e?.code === "42P01" || e?.code === "PGRST205" ? "Templates need a quick database update first: run 0017_templates.sql in Supabase." : "Couldn't save. Please try again.";

// ---------- templates: create, edit, copy, delete ----------

export async function createTemplate(form: FormData) {
  const { supabase } = await requireCoach();
  const k = kind.parse(form.get("kind"));
  const body: TrainingBody | NutritionBody =
    k === "training"
      ? { notes: null, workouts: [{ name: "Day 1", weekdays: [], exercises: [] }], cardio: null }
      : {
          style: "macros",
          notes: null,
          day_types: [
            { name: "Training day", weekdays: [1, 2, 4, 5], kcal: null, protein_g: null, carbs_g: null, fat_g: null, fibre_g: null, sodium_mg: null, water_ml: null, palms: null, fists: null, cupped: null, thumbs: null, notes: null, meals: [] },
            { name: "Rest day", weekdays: [3, 6, 7], kcal: null, protein_g: null, carbs_g: null, fat_g: null, fibre_g: null, sodium_mg: null, water_ml: null, palms: null, fists: null, cupped: null, thumbs: null, notes: null, meals: [] },
          ],
        };
  const { data, error } = await supabase
    .from("templates")
    .insert({ kind: k, name: k === "training" ? "New programme" : "New nutrition plan", body })
    .select("id")
    .single();
  if (error || !data) redirect(`${listPath(k)}?error=${encodeURIComponent(tableError(error))}`);
  redirect(templatePath({ id: data.id, kind: k }));
}

const optText = (max: number) => z.preprocess((v) => String(v ?? "").trim().slice(0, max) || null, z.string().nullable());
const metaInput = z.object({
  name: z.string().trim().min(1).max(80),
  summary: optText(300),
  goal: optText(40),
  level: z.preprocess((v) => v || null, z.enum(LEVELS).nullable()),
  location: z.preprocess((v) => v || null, z.enum(LOCATIONS).nullable()),
  audience: z.enum(Object.keys(AUDIENCE) as [keyof typeof AUDIENCE]),
  competitor: z.enum(Object.keys(COMPETITOR) as [keyof typeof COMPETITOR]),
  tags: z.preprocess(
    (v) => [...new Set(String(v ?? "").split(",").map((t) => t.trim().toLowerCase().slice(0, 30)).filter(Boolean))].slice(0, 12),
    z.array(z.string()),
  ),
  notes: optText(2000),
});

/** Name, tags, and (for programmes) the note the client sees at the top of Train. */
export async function updateTemplateMeta(_prev: TemplateResult, form: FormData): Promise<TemplateResult> {
  const { supabase } = await requireCoach();
  const id = uuid.safeParse(form.get("template_id"));
  if (!id.success) return { error: "Something went wrong. Please refresh and try again." };
  const p = metaInput.safeParse(Object.fromEntries(["name", "summary", "goal", "level", "location", "audience", "competitor", "tags", "notes"].map((k) => [k, form.get(k)])));
  if (!p.success) return { error: "Give the template a name (up to 80 characters)." };
  const t = await load(supabase, id.data);
  if (!t) return { error: "That template no longer exists." };
  const { notes, ...meta } = p.data;
  const body = t.kind === "training" ? { ...trainingBody(t.body), notes } : t.body;
  const { error } = await supabase
    .from("templates")
    .update({ ...meta, location: t.kind === "training" ? meta.location : null, self_guided: form.get("self_guided") === "on", body })
    .eq("id", t.id);
  if (error) return { error: "Couldn't save. Please try again." };
  refresh(t);
  return { ok: "Saved." };
}

export async function duplicateTemplate(form: FormData) {
  const { supabase } = await requireCoach();
  const id = uuid.parse(form.get("template_id"));
  const { data: t } = await supabase.from("templates").select("*").eq("id", id).single();
  if (!t) return;
  const { id: _old, created_at: _c, updated_at: _u, ...rest } = t;
  void _old;
  void _c;
  void _u;
  const { data } = await supabase.from("templates").insert({ ...rest, name: `${t.name} copy`.slice(0, 80) }).select("id").single();
  revalidatePath(listPath(t.kind));
  if (data) redirect(templatePath({ id: data.id, kind: t.kind }));
}

export async function deleteTemplate(form: FormData) {
  const { supabase } = await requireCoach();
  const id = uuid.parse(form.get("template_id"));
  const { data } = await supabase.from("templates").delete().eq("id", id).select("kind").single();
  const k = (data?.kind as TemplateKind) ?? "training";
  revalidatePath(listPath(k));
  redirect(`${listPath(k)}?deleted=1`);
}

// ---------- programme templates: sessions and cardio ----------

async function saveTraining(supabase: Supa, t: { id: string; kind: TemplateKind }, body: TrainingBody) {
  const { error } = await supabase.from("templates").update({ body }).eq("id", t.id);
  if (error) return { error: "Couldn't save. Please try again." };
  refresh(t);
  return {};
}

const sessionInput = z.object({ templateId: uuid, index: z.number().int().min(0).max(13), name: z.string().trim().min(1).max(60), exercises: z.array(planExercise).max(40) });

export async function saveTemplateSession(input: z.input<typeof sessionInput>): Promise<{ error?: string }> {
  const { supabase } = await requireCoach();
  const p = sessionInput.safeParse(input);
  if (!p.success) return { error: "Some of the numbers aren't valid. Check the highlighted exercise." };
  const t = await load(supabase, p.data.templateId);
  if (!t || t.kind !== "training") return { error: "That template no longer exists." };
  const body = trainingBody(t.body);
  const w = body.workouts[p.data.index];
  if (!w) return { error: "That session no longer exists. Please refresh." };
  // Keep names alongside ids, so the template still reads well (and copies) if ids ever change.
  const ids = [...new Set(p.data.exercises.map((e) => e.exercise_id))];
  const { data: ex } = ids.length ? await supabase.from("exercises").select("id, name").in("id", ids) : { data: [] };
  const names = new Map((ex ?? []).map((e) => [e.id as string, e.name as string]));
  body.workouts[p.data.index] = {
    ...w,
    name: p.data.name,
    exercises: p.data.exercises.map((e, i) => ({
      ...e,
      exercise: names.get(e.exercise_id),
      linked_to_previous: i === 0 ? false : e.linked_to_previous,
      film_set: e.film_set && e.film_set <= e.work_sets ? e.film_set : null,
    })),
  };
  return saveTraining(supabase, t, body);
}

export async function setTemplateSessionDays(templateId: string, index: number, days: number[]): Promise<{ error?: string }> {
  const { supabase } = await requireCoach();
  const id = uuid.safeParse(templateId);
  const list = z.array(z.number().int().min(1).max(7)).max(7).safeParse(days);
  if (!id.success || !list.success) return { error: "Something went wrong. Please refresh and try again." };
  const t = await load(supabase, id.data);
  if (!t || t.kind !== "training") return { error: "That template no longer exists." };
  const body = trainingBody(t.body);
  if (!body.workouts[index]) return { error: "That session no longer exists. Please refresh." };
  body.workouts[index].weekdays = [...new Set(list.data)].sort();
  return saveTraining(supabase, t, body);
}

export async function addTemplateSession(form: FormData) {
  const { supabase } = await requireCoach();
  const t = await load(supabase, uuid.parse(form.get("template_id")));
  if (!t || t.kind !== "training") return;
  const body = trainingBody(t.body);
  if (body.workouts.length >= 14) return;
  body.workouts.push({ name: `Day ${body.workouts.length + 1}`, weekdays: [], exercises: [] });
  await saveTraining(supabase, t, body);
  redirect(`${templatePath(t)}?w=${body.workouts.length - 1}`);
}

export async function deleteTemplateSession(form: FormData) {
  const { supabase } = await requireCoach();
  const t = await load(supabase, uuid.parse(form.get("template_id")));
  const index = Number(form.get("index"));
  if (!t || t.kind !== "training") return;
  const body = trainingBody(t.body);
  if (body.workouts.length <= 1 || !body.workouts[index]) return;
  body.workouts.splice(index, 1);
  await saveTraining(supabase, t, body);
  redirect(templatePath(t));
}

/** Cardio that comes with a programme template. No minutes and no sessions means no cardio. */
export async function saveTemplateCardio(_prev: TemplateResult, form: FormData): Promise<TemplateResult> {
  const { supabase } = await requireCoach();
  const id = uuid.safeParse(form.get("template_id"));
  if (!id.success) return { error: "Something went wrong. Please refresh and try again." };
  const parsed = parseCardioForm(form);
  if ("error" in parsed) return { error: parsed.error };
  const t = await load(supabase, id.data);
  if (!t || t.kind !== "training") return { error: "That template no longer exists." };
  const { weekly_minutes, daily_steps, extra_counts, sessions } = parsed.data;
  const body = trainingBody(t.body);
  body.cardio =
    weekly_minutes || daily_steps || sessions.length
      ? { weekly_minutes, daily_steps, extra_counts, sessions: sessions.map(({ id: _id, position: _p, ...s }) => (void _id, void _p, s)) }
      : null;
  const r = await saveTraining(supabase, t, body);
  return r.error ? r : { ok: body.cardio ? "Saved. It's copied with the programme when you tick cardio." : "Saved. This template has no cardio." };
}

// ---------- nutrition templates ----------

const nutritionInput = z.object({
  templateId: uuid,
  style: z.enum(["macros", "plan", "portions"]),
  notes: z.string().max(2000).nullable(),
  dayTypes: z.array(dayTypeInput).min(1).max(7),
});

export async function saveTemplateNutrition(input: z.input<typeof nutritionInput>): Promise<{ error?: string }> {
  const { supabase } = await requireCoach();
  const p = nutritionInput.safeParse(input);
  if (!p.success) return { error: "Some of the numbers aren't valid. Check each day type." };
  const t = await load(supabase, p.data.templateId);
  if (!t || t.kind !== "nutrition") return { error: "That template no longer exists." };
  const ids = [...new Set(p.data.dayTypes.flatMap((d) => d.meals.flatMap((m) => m.items.map((i) => i.food_id))))];
  const { data: foods } = ids.length ? await supabase.from("foods").select("id, name").in("id", ids) : { data: [] };
  const names = new Map((foods ?? []).map((f) => [f.id as string, f.name as string]));
  const body: NutritionBody = {
    style: p.data.style,
    notes: p.data.notes,
    day_types: p.data.dayTypes.map(({ id: _id, ...d }) => {
      void _id;
      return { ...d, meals: d.meals.map((m) => ({ ...m, items: m.items.map((i) => ({ food_id: i.food_id, food: names.get(i.food_id), grams: i.grams })) })) };
    }),
  };
  const { error } = await supabase.from("templates").update({ body }).eq("id", t.id);
  if (error) return { error: "Couldn't save. Please try again." };
  refresh(t);
  return {};
}

// ---------- copy a template onto a client ----------

/** Make a new draft programme (or nutrition plan) for the client from a template. Their current one stays live until Adam makes this one live. */
export async function applyTemplate(_prev: TemplateResult, form: FormData): Promise<TemplateResult> {
  const { supabase, profile: me } = await requireCoach();
  const id = uuid.safeParse(form.get("template_id"));
  const clientId = uuid.safeParse(form.get("client_id"));
  if (!id.success) return { error: "Pick a template first." };
  if (!clientId.success) return { error: "Pick who to copy it to." };
  const { data: c } = await supabase.from("profiles").select("id").eq("id", clientId.data).or(`role.eq.client,id.eq.${me.id}`).maybeSingle();
  if (!c) return { error: "That client couldn't be found." };
  const { data: t } = await supabase.from("templates").select("id, kind, name, body").eq("id", id.data).maybeSingle<{ id: string; kind: TemplateKind; name: string; body: unknown }>();
  if (!t) return { error: "That template no longer exists." };

  const r = t.kind === "training" ? await copyTraining(supabase, t.name, trainingBody(t.body), clientId.data, form.get("with_cardio") === "on") : await copyNutrition(supabase, nutritionBody(t.body), clientId.data);
  if (r.error) return { error: r.error };
  const page = t.kind === "training" ? "training" : "nutrition";
  revalidatePath(`/coach/clients/${clientId.data}/${page}`);
  if (r.cardio) revalidatePath(`/coach/clients/${clientId.data}/cardio`);
  const q = new URLSearchParams({ copied: t.name });
  if (r.missing.length) q.set("missing", r.missing.join(", ").slice(0, 600));
  if (r.cardio) q.set("cardio", "1");
  redirect(`/coach/clients/${clientId.data}/${page}?${q}`);
}

async function copyTraining(supabase: Supa, name: string, body: TrainingBody, clientId: string, withCardio: boolean) {
  const { data: library } = await supabase.from("exercises").select("id, name");
  const resolved = resolveExercises(body, library ?? []);
  const missing = resolved.missing;
  // Check the numbers too (a template loaded with SQL skips the editor's checks).
  const workouts = resolved.workouts.map((w) => ({
    ...w,
    exercises: w.exercises.filter((e) => {
      const ok = planExercise.safeParse(e).success;
      if (!ok) missing.push(`${e.exercise} (check its numbers in the template)`);
      return ok;
    }),
  }));
  if (!workouts.length) return { error: "This template has no sessions yet.", missing };

  const { data: prog, error } = await supabase.from("programmes").insert({ client_id: clientId, name, notes: body.notes }).select("id").single();
  if (error || !prog) return { error: "Couldn't copy the programme. Please try again.", missing };
  for (const [wi, w] of workouts.entries()) {
    const base = { programme_id: prog.id, client_id: clientId, name: w.name, position: wi };
    let { data: row, error: wErr } = await supabase.from("workouts").insert({ ...base, weekdays: w.weekdays }).select("id").single();
    // Before 0016_workout_days.sql there's no weekdays column: copy the session without its days.
    if (wErr?.code === "42703" || wErr?.code === "PGRST204") ({ data: row, error: wErr } = await supabase.from("workouts").insert(base).select("id").single());
    if (wErr || !row) {
      await supabase.from("programmes").delete().eq("id", prog.id);
      return { error: "Couldn't copy the sessions. Please try again.", missing };
    }
    if (!w.exercises.length) continue;
    const rows = w.exercises.map(({ exercise: _n, ...e }, i) => {
      void _n;
      return { ...e, linked_to_previous: i === 0 ? false : e.linked_to_previous, workout_id: row.id, client_id: clientId, position: i };
    });
    const { error: eErr } = await supabase.from("workout_exercises").insert(rows);
    if (eErr) {
      await supabase.from("programmes").delete().eq("id", prog.id);
      return { error: "Couldn't copy the exercises. Please try again.", missing };
    }
  }

  let cardio = false;
  if (withCardio && body.cardio) {
    const { weekly_minutes, daily_steps, extra_counts, sessions } = body.cardio;
    const { error: pErr } = await supabase.from("cardio_plans").upsert({ client_id: clientId, weekly_minutes, daily_steps, extra_counts });
    if (pErr) return { error: "The programme was copied, but the cardio couldn't be. Set it on the Cardio tab.", missing };
    await supabase.from("cardio_sessions").delete().eq("client_id", clientId);
    if (sessions.length) await supabase.from("cardio_sessions").insert(sessions.map((s, i) => ({ ...s, client_id: clientId, position: i })));
    cardio = true;
  }
  return { missing, cardio };
}

async function copyNutrition(supabase: Supa, body: NutritionBody, clientId: string) {
  const { data: foods } = await supabase.from("foods").select("id, name, brand").or(`owner_id.is.null,owner_id.eq.${clientId}`);
  const { day_types, missing } = resolveFoods(body, foods ?? []);
  if (!day_types.length) return { error: "This template has no day types yet.", missing };

  const { data: plan, error } = await supabase.from("nutrition_plans").insert({ client_id: clientId, style: body.style, notes: body.notes }).select("id").single();
  if (error || !plan) return { error: "Couldn't copy the plan. Please try again.", missing };
  const fail = async (msg: string) => {
    await supabase.from("nutrition_plans").delete().eq("id", plan.id);
    return { error: msg, missing };
  };
  for (const [i, d] of day_types.entries()) {
    const { meals, ...fields } = d;
    const { data: day, error: dErr } = await supabase.from("day_types").insert({ ...fields, plan_id: plan.id, client_id: clientId, position: i }).select("id").single();
    if (dErr || !day) return fail("Couldn't copy the day types. Please try again.");
    for (const [mi, m] of meals.entries()) {
      const { data: meal, error: mErr } = await supabase.from("plan_meals").insert({ day_type_id: day.id, client_id: clientId, name: m.name, notes: m.notes, position: mi }).select("id").single();
      if (mErr || !meal) return fail("Couldn't copy the meals. Please try again.");
      if (!m.items.length) continue;
      const { error: iErr } = await supabase
        .from("plan_meal_items")
        .insert(m.items.map((it, ii) => ({ meal_id: meal.id, client_id: clientId, food_id: it.food_id, grams: it.grams, position: ii })));
      if (iErr) return fail("Couldn't copy the meals. Please try again.");
    }
  }
  return { missing, cardio: false };
}

// ---------- save a client's plan as a template ----------

export async function saveAsTemplate(form: FormData) {
  const { supabase } = await requireCoach();
  const k = kind.parse(form.get("kind"));
  const clientId = uuid.parse(form.get("client_id"));
  const planId = uuid.parse(form.get("plan_id"));
  let name = "";
  let body: TrainingBody | NutritionBody;

  if (k === "training") {
    const { data: prog } = await supabase.from("programmes").select("id, name, notes").eq("id", planId).single();
    if (!prog) return;
    const { data: ws } = await supabase.from("workouts").select("*, workout_exercises(*, exercises(name))").eq("programme_id", prog.id).order("position");
    name = prog.name;
    const [{ data: cp }, { data: cs }] = await Promise.all([
      supabase.from("cardio_plans").select("weekly_minutes, daily_steps, extra_counts").eq("client_id", clientId).maybeSingle(),
      supabase.from("cardio_sessions").select("day, kind, minutes, mode, target, iv_work, iv_rest, iv_rounds, timing, notes").eq("client_id", clientId).order("position"),
    ]);
    const withCardio = form.get("with_cardio") === "on" && (cp || cs?.length);
    body = trainingBody({
      notes: prog.notes && !prog.notes.startsWith("AI draft.") ? prog.notes : null,
      workouts: (ws ?? []).map((w) => ({
        name: w.name,
        weekdays: w.weekdays ?? [],
        exercises: [...(w.workout_exercises ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((e) => ({ ...e, exercise: (e.exercises as { name: string } | null)?.name, id: undefined, workout_id: undefined, client_id: undefined, position: undefined, exercises: undefined })),
      })),
      cardio: withCardio ? { ...(cp ?? { weekly_minutes: 0, daily_steps: null, extra_counts: true }), sessions: cs ?? [] } : null,
    });
  } else {
    const { data: plan } = await supabase.from("nutrition_plans").select("id, style, notes").eq("id", planId).single();
    if (!plan) return;
    const { data: days } = await supabase
      .from("day_types")
      .select("*, plan_meals(name, notes, position, plan_meal_items(food_id, grams, position, foods(name)))")
      .eq("plan_id", plan.id)
      .order("position");
    name = "Nutrition plan";
    body = nutritionBody({
      style: plan.style,
      notes: plan.notes && !plan.notes.startsWith("AI draft.") ? plan.notes : null,
      day_types: (days ?? []).map((d) => ({
        ...d,
        meals: [...(d.plan_meals ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((m) => ({
            name: m.name,
            notes: m.notes,
            items: [...(m.plan_meal_items ?? [])]
              .sort((a, b) => a.position - b.position)
              .map((it) => ({ food_id: it.food_id, food: (it.foods as { name: string } | null)?.name, grams: Number(it.grams) })),
          })),
      })),
    });
  }

  const { data: c } = await supabase.from("profiles").select("full_name").eq("id", clientId).maybeSingle();
  const first = (c?.full_name ?? "").split(" ")[0];
  const { data, error } = await supabase
    .from("templates")
    .insert({ kind: k, name: (k === "nutrition" && first ? `${first}'s nutrition plan` : name || "Programme").slice(0, 80), body })
    .select("id")
    .single();
  if (error || !data) redirect(`${listPath(k)}?error=${encodeURIComponent(tableError(error))}`);
  revalidatePath(listPath(k));
  redirect(`${templatePath({ id: data.id, kind: k })}?saved=1`);
}
