import { clientNote } from "@/lib/notes";
import Link from "next/link";
import { requireClientView } from "@/lib/auth";
import { needsGpCheck } from "@/lib/trial-server";
import { confirmGp } from "@/app/actions/intake";
import { isoWeekday, todayIn } from "@/lib/nutrition";
import { dateIn, daysText, workoutDays } from "@/lib/training";
import { WEEKDAYS, weekOf, type CardioLog, type CardioPlan, type CardioSession } from "@/lib/cardio";
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
    ? await supabase.from("workouts").select("*, workout_exercises(count)").eq("programme_id", prog.id).order("position")
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

  // Set days. Each log this week ticks off the earliest set day of that workout, so a
  // session done a day late still counts.
  const list = workouts ?? [];
  const todayN = isoWeekday(today);
  const hasDays = list.some((w) => workoutDays(w).length);
  const allSet = list.length > 0 && list.every((w) => workoutDays(w).length);
  const doneThisWeek = new Map<string, number>();
  (logs ?? []).forEach((l) => {
    const d = dateIn(l.started_at, profile.time_zone);
    if (l.workout_id && d >= week.start && d <= week.end) doneThisWeek.set(l.workout_id, (doneThisWeek.get(l.workout_id) ?? 0) + 1);
  });
  const ticked = new Set<string>(); // `${workoutId}:${day}`
  list.forEach((w) => workoutDays(w).slice(0, doneThisWeek.get(w.id) ?? 0).forEach((d) => ticked.add(`${w.id}:${d}`)));
  const weekPlan = WEEKDAYS.map((_, i) => list.filter((w) => workoutDays(w).includes(i + 1)));
  const todays = weekPlan[todayN - 1];

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
          {hasDays ? (
            <div className="card">
              <span className="eyebrow">Today, {WEEKDAYS[todayN - 1]}</span>
              {todays.length ? (
                todays.map((w) => {
                  const done = ticked.has(`${w.id}:${todayN}`);
                  return (
                    <div key={w.id} className="row" style={{ justifyContent: "space-between" }}>
                      <div>
                        <h2 style={{ margin: 0 }}>{w.name}</h2>
                        <span className="muted small">{done ? "Done. Nice work." : "This is today's session."}</span>
                      </div>
                      {done ? (
                        <span className="chip">Done ✓</span>
                      ) : (
                        <Link href={`/app/train/${w.id}`} className="btn primary">
                          Start
                        </Link>
                      )}
                    </div>
                  );
                })
              ) : (
                <>
                  <h2 style={{ margin: 0 }}>{allSet ? "Rest day" : "No set session today"}</h2>
                  <p className="muted small" style={{ margin: 0 }}>
                    {allSet
                      ? "Recovery is where the training pays off, so enjoy it. If you missed a session this week, you can catch up on it below."
                      : "If you're training today, pick a session below."}
                  </p>
                </>
              )}
              <div className="week-plan" aria-label="Your week">
                {WEEKDAYS.map((d, i) => {
                  const ws = weekPlan[i];
                  const allDone = ws.length > 0 && ws.every((w) => ticked.has(`${w.id}:${i + 1}`));
                  return (
                    <div key={d} className={[ws.length ? "on" : "", i + 1 === todayN ? "today" : ""].join(" ").trim() || undefined}>
                      <b>{d}</b>
                      <span>{ws.length ? ws.map((w) => w.name).join(", ") : allSet ? "Rest" : "–"}</span>
                      {allDone ? <span className="wp-tick" aria-label="done">✓</span> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {hasDays ? <h2 style={{ margin: "8px 0 0" }}>All sessions</h2> : null}
          {list.map((w) => {
            const n = (w.workout_exercises as unknown as { count: number }[])[0]?.count ?? 0;
            const when = last.get(w.id);
            return (
              <Link key={w.id} href={`/app/train/${w.id}`} className="card" data-tour="workout" style={{ textDecoration: "none", color: "var(--fg)" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <h2>{w.name}</h2>
                    <span className="muted small">
                      {hasDays ? `${daysText(workoutDays(w))} · ` : ""}
                      {n} exercise{n === 1 ? "" : "s"}
                      {when ? ` · last done ${new Date(when).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: profile.time_zone || "Europe/London" })}` : " · not done yet"}
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
