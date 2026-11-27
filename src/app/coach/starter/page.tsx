import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { addWorkout, createProgramme, deleteWorkout } from "@/app/actions/training";
import type { Exercise, PlanExercise } from "@/lib/training";
import { Builder } from "../clients/[id]/training/Builder";

/** Adam's starter workouts. Each new free trial gets its own copy, so changes here only reach trials started afterwards. */
export default async function StarterPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireCoach();

  const [{ data: prog }, { data: library }] = await Promise.all([
    supabase.from("programmes").select("*").eq("client_id", user.id).eq("is_starter", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("exercises").select("id, name, muscle, equipment, demo_url, cues").order("muscle").order("name"),
  ]);
  const { data: workouts } = prog ? await supabase.from("workouts").select("id, name, position").eq("programme_id", prog.id).order("position") : { data: null };
  const current = workouts?.find((w) => w.id === sp.w) ?? workouts?.[0];
  const { data: plan } = current ? await supabase.from("workout_exercises").select("*").eq("workout_id", current.id).order("position") : { data: null };

  return (
    <>
      <Link href="/coach/trials" className="small">
        ← Trials
      </Link>
      <span className="eyebrow">Free trial</span>
      <h1>
        Starter workouts<span>for every trial</span>
      </h1>
      <p className="muted small" style={{ margin: 0 }}>
        Write these once. Every new trial client gets their own copy on day 1, so they can use the full tracker and everything they log carries over if they join. Aim for 2 or 3 sessions, and name them so people know which suit the gym and which suit home (for example &quot;Full body A · Gym&quot; and &quot;Full body · Home&quot;). Changes here only reach trials that start afterwards.
      </p>

      {!prog ? (
        <div className="card">
          <h2>No starter workouts yet</h2>
          <p className="muted" style={{ margin: 0 }}>
            Until you add some, trial clients see a note that their workouts are on the way.
          </p>
          <form action={createProgramme}>
            <input type="hidden" name="client_id" value={user.id} />
            <button className="btn primary">Write the starter workouts</button>
          </form>
        </div>
      ) : (
        <>
          <div className="card">
            <h2>{prog.name}</h2>
            <div className="wtabs">
              {(workouts ?? []).map((w) => (
                <Link key={w.id} href={`/coach/starter?w=${w.id}`} aria-current={w.id === current?.id ? "page" : undefined}>
                  {w.name}
                </Link>
              ))}
              <form action={addWorkout}>
                <input type="hidden" name="programme_id" value={prog.id} />
                <button className="link">+ Add a session</button>
              </form>
            </div>
          </div>
          {current ? (
            <>
              <Builder
                key={current.id}
                workoutId={current.id}
                workoutName={current.name}
                initial={(plan ?? []) as unknown as PlanExercise[]}
                library={(library ?? []) as Exercise[]}
                gymName={null}
                gymKit={null}
                clientFirst="your trial clients"
              />
              {(workouts ?? []).length > 1 ? (
                <form action={deleteWorkout}>
                  <input type="hidden" name="workout_id" value={current.id} />
                  <button className="link small" style={{ color: "var(--muted)" }}>
                    Delete this session
                  </button>
                </form>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </>
  );
}
