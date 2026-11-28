import { clientNote } from "@/lib/notes";
import Link from "next/link";
import { requireClientView } from "@/lib/auth";
import { needsGpCheck } from "@/lib/trial-server";
import { confirmGp } from "@/app/actions/intake";
import { todayIn } from "@/lib/nutrition";
import { weekOf, type CardioLog, type CardioPlan, type CardioSession } from "@/lib/cardio";
import { CardioCard } from "./CardioCard";

export default async function TrainPage({ searchParams }: { searchParams: Promise<{ done?: string; gp?: string }> }) {
  const { supabase, user, profile } = await requireClientView();
  const sp = await searchParams;
  if (await needsGpCheck(supabase, profile)) {
    return (
      <>
        <span className="eyebrow">Train</span>
        <h1>
          Train<span>one quick check</span>
        </h1>
        <form action={confirmGp} className="card">
          <h2>Check with your GP first</h2>
          <p className="muted" style={{ margin: 0 }}>
            You answered yes to one of the health questions, so please check with your GP that exercise is OK for you before you start. Your workouts unlock once you&apos;ve ticked the box. Food logging and messages work as normal in the meantime.
          </p>
          {sp.gp ? <p className="alert error" role="alert">Please tick the box first.</p> : null}
          <label className="check">
            <input type="checkbox" name="gp" required />
            <span>I&apos;ve checked with my GP and they&apos;re happy for me to exercise.</span>
          </label>
          <button className="btn primary">Unlock my workouts</button>
        </form>
      </>
    );
  }
  const { data: prog } = await supabase.from("programmes").select("id, name, notes").eq("client_id", user.id).eq("is_live", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: workouts } = prog
    ? await supabase.from("workouts").select("id, name, workout_exercises(count)").eq("programme_id", prog.id).order("position")
    : { data: null };
  const { data: logs } = await supabase.from("workout_logs").select("workout_id, started_at").eq("client_id", user.id).order("started_at", { ascending: false }).limit(50);
  const today = todayIn(profile.time_zone);
  const week = weekOf(today);
  const [{ data: cPlan }, { data: cSessions }, { data: cLogs }, { data: steps }] = await Promise.all([
    supabase.from("cardio_plans").select("*").eq("client_id", user.id).maybeSingle<CardioPlan>(),
    supabase.from("cardio_sessions").select("*").eq("client_id", user.id).order("position"),
    supabase.from("cardio_logs").select("*").eq("client_id", user.id).gte("log_date", week.start).lte("log_date", week.end).order("log_date"),
    supabase.from("step_logs").select("steps").eq("client_id", user.id).eq("log_date", today).maybeSingle(),
  ]);
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
            {profile.status === "trial" ? "Adam is writing your trial workouts around your answers and your gym. They'll show here as soon as they're ready." : "Adam is building your programme. It'll show here as soon as it's ready."}
          </p>
        </div>
      ) : (
        <div className="stack">
          {clientNote(prog.notes) ? <p className="alert">{clientNote(prog.notes)}</p> : null}
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
      <CardioCard today={today} plan={cPlan ?? null} sessions={(cSessions ?? []) as CardioSession[]} logs={(cLogs ?? []) as CardioLog[]} stepsToday={steps?.steps ?? null} />
    </>
  );
}
