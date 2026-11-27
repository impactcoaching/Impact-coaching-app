import { notFound, redirect } from "next/navigation";
import { needsGpCheck } from "@/lib/trial-server";
import { requireProfile } from "@/lib/auth";
import type { PlanExercise } from "@/lib/training";
import { demoSource, type DemoFields } from "@/lib/demos";
import { Tracker, type TrackerExercise } from "./Tracker";

export default async function WorkoutPage({ params }: { params: Promise<{ workoutId: string }> }) {
  const { workoutId } = await params;
  const { supabase, user, profile } = await requireProfile();
  if (await needsGpCheck(supabase, profile)) redirect("/app/train");
  const { data: w } = await supabase.from("workouts").select("id, name, notes").eq("id", workoutId).maybeSingle();
  if (!w) notFound();
  const { data: plan } = await supabase
    .from("workout_exercises")
    .select("*, exercise:exercises!workout_exercises_exercise_id_fkey(name, demo_url, demo_path, wx_female, wx_male, cues)")
    .eq("workout_id", workoutId)
    .order("position");
  const names = (plan ?? []).map((p) => (p.exercise as { name: string }).name);
  // Last time's numbers for each exercise, from the most recent log that has it.
  const { data: prev } = names.length
    ? await supabase
        .from("set_logs")
        .select("exercise_name, set_kind, set_number, weight_kg, reps, created_at, log_id")
        .eq("client_id", user.id)
        .in("exercise_name", names)
        .order("created_at", { ascending: false })
        .limit(400)
    : { data: [] };
  const lastLog = new Map<string, string>();
  (prev ?? []).forEach((s) => !lastLog.has(s.exercise_name) && lastLog.set(s.exercise_name, s.log_id));
  const lastSets: Record<string, Record<string, string>> = {};
  (prev ?? []).forEach((s) => {
    if (lastLog.get(s.exercise_name) !== s.log_id) return;
    (lastSets[s.exercise_name] ??= {})[`${s.set_kind}${s.set_number}`] = `${s.weight_kg ?? "BW"} × ${s.reps ?? "–"}`;
  });

  const exercises: TrackerExercise[] = (plan ?? []).map((p) => {
    const ex = p.exercise as DemoFields & { name: string; cues: string | null };
    return { ...(p as unknown as PlanExercise), id: p.id as string, name: ex.name, has_demo: demoSource(ex) !== "none", cues: ex.cues, last: lastSets[ex.name] ?? {} };
  });

  return <Tracker workoutId={w.id} name={w.name} notes={w.notes} exercises={exercises} userId={user.id} />;
}
