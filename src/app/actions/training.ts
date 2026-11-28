"use server";

import { inFolder } from "@/lib/paths";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCoach, requireProfile } from "@/lib/auth";
import { planExercise } from "@/lib/schemas";

const uuid = z.string().uuid();

function trainingPath(clientId: string) {
  return `/coach/clients/${clientId}/training`;
}

// ---------- coach ----------

export async function createProgramme(form: FormData) {
  const { supabase } = await requireCoach();
  const clientId = uuid.parse(form.get("client_id"));
  const { data: prog, error } = await supabase.from("programmes").insert({ client_id: clientId, name: "Training programme" }).select("id").single();
  if (error || !prog) throw new Error("Couldn't create the programme");
  await supabase.from("workouts").insert({ programme_id: prog.id, client_id: clientId, name: "Day 1", position: 0 });
  revalidatePath(trainingPath(clientId));
}

export async function addWorkout(form: FormData) {
  const { supabase } = await requireCoach();
  const programmeId = uuid.parse(form.get("programme_id"));
  const { data: prog } = await supabase.from("programmes").select("client_id").eq("id", programmeId).single();
  if (!prog) return;
  const { count } = await supabase.from("workouts").select("id", { count: "exact", head: true }).eq("programme_id", programmeId);
  const { data: w } = await supabase
    .from("workouts")
    .insert({ programme_id: programmeId, client_id: prog.client_id, name: `Day ${(count ?? 0) + 1}`, position: count ?? 0 })
    .select("id")
    .single();
  redirect(`${trainingPath(prog.client_id)}?w=${w?.id ?? ""}`);
}

export async function deleteWorkout(form: FormData) {
  const { supabase } = await requireCoach();
  const id = uuid.parse(form.get("workout_id"));
  const { data: w } = await supabase.from("workouts").select("client_id").eq("id", id).single();
  await supabase.from("workouts").delete().eq("id", id);
  if (w) redirect(trainingPath(w.client_id));
}

export async function setProgrammeLive(form: FormData) {
  const { supabase } = await requireCoach();
  const id = uuid.parse(form.get("programme_id"));
  const live = form.get("live") === "true";
  const { data } = await supabase.from("programmes").update({ is_live: live }).eq("id", id).select("client_id").single();
  if (data) revalidatePath(trainingPath(data.client_id));
}

/** Put a workout on set weekdays (1 Monday .. 7 Sunday). Empty means any day. */
export async function setWorkoutDays(workoutId: string, days: number[]): Promise<{ error?: string }> {
  const { supabase } = await requireCoach();
  const id = uuid.safeParse(workoutId);
  const list = z.array(z.number().int().min(1).max(7)).max(7).safeParse(days);
  if (!id.success || !list.success) return { error: "Something went wrong. Please refresh and try again." };
  const weekdays = [...new Set(list.data)].sort();
  const { data, error } = await supabase.from("workouts").update({ weekdays }).eq("id", id.data).select("client_id").single();
  if (error?.code === "42703" || error?.code === "PGRST204") return { error: "Days need a quick database update first: run 0016_workout_days.sql in Supabase." };
  if (error || !data) return { error: "Couldn't save the days. Please try again." };
  revalidatePath(trainingPath(data.client_id));
  revalidatePath("/app/train");
  return {};
}

/** Edit the programme's name and the note the client sees at the top of Train. */
export async function updateProgramme(_prev: { ok?: boolean; error?: string }, form: FormData): Promise<{ ok?: boolean; error?: string }> {
  const { supabase } = await requireCoach();
  const id = uuid.safeParse(form.get("programme_id"));
  if (!id.success) return { error: "Something went wrong. Please refresh and try again." };
  const name = String(form.get("name") ?? "").trim().slice(0, 80) || "Training programme";
  const notes = String(form.get("notes") ?? "").trim().slice(0, 2000) || null;
  const { data, error } = await supabase.from("programmes").update({ name, notes }).eq("id", id.data).select("client_id").single();
  if (error || !data) {
    console.error("updateProgramme", error);
    return { error: "Couldn't save. Please refresh and try again." };
  }
  revalidatePath(trainingPath(data.client_id));
  return { ok: true };
}

const saveSchema = z.object({ workoutId: uuid, name: z.string().trim().min(1).max(60), exercises: z.array(planExercise).max(40) });

export async function saveWorkout(input: z.input<typeof saveSchema>): Promise<{ error?: string }> {
  const { supabase } = await requireCoach();
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
  revalidatePath(trainingPath(w.client_id));
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
