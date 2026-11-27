"use server";

import { inFolder } from "@/lib/paths";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCoach, requireProfile } from "@/lib/auth";

const uuid = z.string().uuid();

/** The coach's own account holds the starter workouts for free trials, edited at /coach/starter. */
function trainingPath(clientId: string, coachId: string) {
  return clientId === coachId ? "/coach/starter" : `/coach/clients/${clientId}/training`;
}

// ---------- coach ----------

export async function createProgramme(form: FormData) {
  const { supabase, user } = await requireCoach();
  const clientId = uuid.parse(form.get("client_id"));
  const starter = clientId === user.id;
  const { data: prog, error } = await supabase
    .from("programmes")
    .insert({ client_id: clientId, name: starter ? "Starter workouts" : "Training programme", is_starter: starter })
    .select("id")
    .single();
  if (error || !prog) throw new Error("Couldn't create the programme");
  await supabase.from("workouts").insert({ programme_id: prog.id, client_id: clientId, name: starter ? "Full body A" : "Day 1", position: 0 });
  revalidatePath(trainingPath(clientId, user.id));
}

export async function addWorkout(form: FormData) {
  const { supabase, user } = await requireCoach();
  const programmeId = uuid.parse(form.get("programme_id"));
  const { data: prog } = await supabase.from("programmes").select("client_id").eq("id", programmeId).single();
  if (!prog) return;
  const { count } = await supabase.from("workouts").select("id", { count: "exact", head: true }).eq("programme_id", programmeId);
  const { data: w } = await supabase
    .from("workouts")
    .insert({ programme_id: programmeId, client_id: prog.client_id, name: `Day ${(count ?? 0) + 1}`, position: count ?? 0 })
    .select("id")
    .single();
  redirect(`${trainingPath(prog.client_id, user.id)}?w=${w?.id ?? ""}`);
}

export async function deleteWorkout(form: FormData) {
  const { supabase, user } = await requireCoach();
  const id = uuid.parse(form.get("workout_id"));
  const { data: w } = await supabase.from("workouts").select("client_id").eq("id", id).single();
  await supabase.from("workouts").delete().eq("id", id);
  if (w) redirect(trainingPath(w.client_id, user.id));
}

export async function setProgrammeLive(form: FormData) {
  const { supabase, user } = await requireCoach();
  const id = uuid.parse(form.get("programme_id"));
  const live = form.get("live") === "true";
  const { data } = await supabase.from("programmes").update({ is_live: live }).eq("id", id).select("client_id").single();
  if (data) revalidatePath(trainingPath(data.client_id, user.id));
}

const intensifier = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("drop"), drops: z.number().int().min(1).max(5), pct: z.number().int().min(5).max(60) }),
    z.object({ type: z.literal("rp"), mini: z.number().int().min(1).max(6), rest: z.number().int().min(5).max(60) }),
    z.object({ type: z.literal("cluster"), clusters: z.number().int().min(2).max(8), reps: z.number().int().min(1).max(10), rest: z.number().int().min(5).max(90) }),
    z.object({ type: z.literal("myo"), mini: z.number().int().min(1).max(8), reps: z.number().int().min(1).max(10), rest: z.number().int().min(3).max(30) }),
    z.object({ type: z.literal("partials"), reps: z.number().int().min(1).max(20) }),
  ])
  .nullable();

const planExercise = z.object({
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

const saveSchema = z.object({ workoutId: uuid, name: z.string().trim().min(1).max(60), exercises: z.array(planExercise).max(40) });

export async function saveWorkout(input: z.input<typeof saveSchema>): Promise<{ error?: string }> {
  const { supabase, user } = await requireCoach();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: "Some of the numbers aren't valid. Check the highlighted exercise." };
  const { workoutId, name, exercises } = parsed.data;
  const { data: w } = await supabase.from("workouts").select("client_id").eq("id", workoutId).single();
  if (!w) return { error: "That session no longer exists." };
  await supabase.from("workouts").update({ name }).eq("id", workoutId);
  // Replace the session's exercises. Past logs keep their own copy of names and numbers.
  const { error: delError } = await supabase.from("workout_exercises").delete().eq("workout_id", workoutId);
  if (delError) return { error: "Couldn't save. Please try again." };
  if (exercises.length) {
    const rows = exercises.map((e, i) => ({
      ...e,
      linked_to_previous: i === 0 ? false : e.linked_to_previous,
      film_set: e.film_set && e.film_set <= e.work_sets ? e.film_set : null,
      workout_id: workoutId,
      client_id: w.client_id,
      position: i,
    }));
    const { error } = await supabase.from("workout_exercises").insert(rows);
    if (error) return { error: "Couldn't save. Please try again." };
  }
  revalidatePath(trainingPath(w.client_id, user.id));
  return {};
}

export async function markLogSeen(form: FormData) {
  const { supabase } = await requireCoach();
  const id = uuid.parse(form.get("log_id"));
  const { data } = await supabase.from("workout_logs").update({ coach_seen_at: new Date().toISOString() }).eq("id", id).select("client_id").single();
  if (data) revalidatePath(`/coach/clients/${data.client_id}/training`);
}

// ---------- client ----------

const setLog = z.object({
  workout_exercise_id: uuid,
  exercise_name: z.string().max(120),
  set_kind: z.enum(["warmup", "work"]),
  set_number: z.number().int().min(1).max(30),
  weight_kg: z.number().min(0).max(1000).nullable(),
  reps: z.number().int().min(0).max(1000).nullable(),
  intensifier_done: z.boolean(),
  video_path: z.string().max(300).nullable(),
});

const finishSchema = z.object({
  workoutId: uuid,
  startedAt: z.string().datetime(),
  note: z.string().max(2000).nullable(),
  sets: z.array(setLog).max(300),
});

export async function finishWorkout(input: z.input<typeof finishSchema>): Promise<{ error?: string }> {
  const { supabase, user } = await requireProfile();
  const parsed = finishSchema.safeParse(input);
  if (!parsed.success) return { error: "Something in this workout couldn't be saved. Check the numbers and try again." };
  const { workoutId, startedAt, note, sets } = parsed.data;
  const { data: w } = await supabase.from("workouts").select("name").eq("id", workoutId).single();
  if (!w) return { error: "This session isn't in your programme any more." };
  // Videos must be in the client's own folder.
  if (sets.some((s) => s.video_path && !inFolder(s.video_path, user.id))) return { error: "That video couldn't be attached." };
  const { data: log, error } = await supabase
    .from("workout_logs")
    .insert({ client_id: user.id, workout_id: workoutId, workout_name: w.name, started_at: startedAt, finished_at: new Date().toISOString(), client_note: note })
    .select("id")
    .single();
  if (error?.code === "42501") return { error: "Your free trial has finished, so new workouts can't be saved. See coaching options on your home screen." };
  if (error || !log) return { error: "Couldn't save your workout. Please try again." };
  if (sets.length) {
    const { error: setError } = await supabase.from("set_logs").insert(sets.map((s) => ({ ...s, log_id: log.id, client_id: user.id })));
    if (setError) {
      await supabase.from("workout_logs").delete().eq("id", log.id);
      return { error: "Couldn't save your sets. Please try again." };
    }
  }
  revalidatePath("/app/train");
  redirect(`/app/train?done=${encodeURIComponent(w.name)}`);
}
