import Link from "next/link";
import { requireProfile } from "@/lib/auth";

export default async function TrainPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const { supabase, user } = await requireProfile();
  const sp = await searchParams;
  const { data: prog } = await supabase.from("programmes").select("id, name, notes").eq("client_id", user.id).eq("is_live", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: workouts } = prog
    ? await supabase.from("workouts").select("id, name, workout_exercises(count)").eq("programme_id", prog.id).order("position")
    : { data: null };
  const { data: logs } = await supabase.from("workout_logs").select("workout_id, started_at").eq("client_id", user.id).order("started_at", { ascending: false }).limit(50);
  const last = new Map<string, string>();
  (logs ?? []).forEach((l) => l.workout_id && !last.has(l.workout_id) && last.set(l.workout_id, l.started_at));

  return (
    <>
      <span className="eyebrow">Train</span>
      <h1>
        Train<span>{prog?.name ?? "your sessions"}</span>
      </h1>
      {sp.done ? <p className="alert ok">Nice work. {sp.done} is saved and Adam can see it.</p> : null}
      {!prog ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Adam is building your programme. It&apos;ll show here as soon as it&apos;s ready.
          </p>
        </div>
      ) : (
        <div className="stack">
          {prog.notes ? <p className="alert">{prog.notes}</p> : null}
          {(workouts ?? []).map((w) => {
            const n = (w.workout_exercises as unknown as { count: number }[])[0]?.count ?? 0;
            const when = last.get(w.id);
            return (
              <Link key={w.id} href={`/app/train/${w.id}`} className="card" data-tour="workout" style={{ textDecoration: "none", color: "var(--fg)" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <h2>{w.name}</h2>
                    <span className="muted small">
                      {n} exercise{n === 1 ? "" : "s"}
                      {when ? ` · last done ${new Date(when).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}` : " · not done yet"}
                    </span>
                  </div>
                  <span className="chip pink">Start ›</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
