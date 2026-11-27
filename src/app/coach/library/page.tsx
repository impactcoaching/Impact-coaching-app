import { requireCoach } from "@/lib/auth";
import { demoSource, type DemoFields } from "@/lib/demos";
import { workoutxReady } from "@/lib/workoutx";
import { LibraryList, type LibraryExercise } from "./LibraryList";

export const maxDuration = 60;

export default async function LibraryPage() {
  const { supabase } = await requireCoach();
  const { data } = await supabase.from("exercises").select("id, name, muscle, equipment, demo_path, wx_female, wx_male, wx_auto, demo_url").order("muscle").order("name");
  const list: LibraryExercise[] = (data ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    muscle: e.muscle,
    equipment: e.equipment ?? [],
    source: demoSource(e as DemoFields),
    auto: Boolean(e.wx_auto) && !e.demo_path,
  }));
  const muscles = [...new Set([...MUSCLES, ...list.map((e) => e.muscle)])];
  return (
    <>
      <span className="eyebrow">Library</span>
      <h1>
        Exercises
        <span>and their demos</span>
      </h1>
      <LibraryList exercises={list} muscles={muscles} stockReady={workoutxReady()} />
    </>
  );
}

const MUSCLES = ["Quads", "Hamstrings", "Glutes", "Chest", "Back", "Shoulders", "Arms", "Core", "Calves", "Cardio", "Full body"];
