import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { workoutxReady } from "@/lib/workoutx";
import { ExerciseEditor } from "./ExerciseEditor";

export default async function ExercisePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase } = await requireCoach();
  const { data: e } = await supabase
    .from("exercises")
    .select("id, name, muscle, equipment, cues, demo_url, demo_path, wx_female, wx_male, wx_auto")
    .eq("id", id)
    .maybeSingle();
  if (!e) notFound();
  const [{ data: muscles }, { count: used }] = await Promise.all([
    supabase.from("exercises").select("muscle"),
    supabase.from("workout_exercises").select("id", { count: "exact", head: true }).eq("exercise_id", id),
  ]);
  const muscleList = [...new Set(["Quads", "Hamstrings", "Glutes", "Chest", "Back", "Shoulders", "Arms", "Core", "Calves", "Cardio", "Full body", ...(muscles ?? []).map((m) => m.muscle)])];
  return (
    <>
      <Link href="/coach/library" className="small muted">
        ← Library
      </Link>
      <span className="eyebrow">{e.muscle}</span>
      <h1>{e.name}</h1>
      {error === "in-use" ? (
        <p className="alert error" role="alert">
          This exercise is in a client&apos;s programme, so it can&apos;t be deleted. Swap it out of their programme first.
        </p>
      ) : null}
      <ExerciseEditor
        exercise={{ ...e, equipment: e.equipment ?? [], wx_auto: Boolean(e.wx_auto) }}
        muscles={muscleList}
        stockReady={workoutxReady()}
        usedCount={used ?? 0}
      />
    </>
  );
}
