import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { ClientTabs } from "@/components/ClientTabs";
import { addWorkout, createProgramme, deleteWorkout, markLogSeen, setProgrammeLive } from "@/app/actions/training";
import type { Exercise, PlanExercise } from "@/lib/training";
import { Builder } from "./Builder";
import { ProgrammeEdit } from "./ProgrammeEdit";
import { WorkoutDays } from "./WorkoutDays";
import { workoutDays } from "@/lib/training";
import { WEEKDAYS } from "@/lib/cardio";
import { AiDraft } from "@/components/AiDraft";
import { aiEnabled } from "@/lib/ai";
import { CopiedNote, TemplateTools } from "@/components/TemplateTools";
import { templateChoices } from "@/lib/templates-server";

export default async function TrainingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ w?: string; drafted?: string; copied?: string; missing?: string; cardio?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile: me } = await requireCoach();
  const self = id === me.id;
  const { data: c } = await supabase.from("profiles").select("id, full_name").eq("id", id).or(`role.eq.client,id.eq.${me.id}`).maybeSingle();
  if (!c) notFound();
  const first = (c.full_name ?? "").split(" ")[0] || "this client";

  const [{ data: prog }, { data: gym }, { data: library }, { data: logs }, templates, { count: earlierLive }] = await Promise.all([
    supabase.from("programmes").select("*").eq("client_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("gyms").select("name, equipment").eq("client_id", id).eq("is_main", true).maybeSingle(),
    supabase.from("exercises").select("id, name, muscle, equipment, demo_url, cues").order("muscle").order("name"),
    supabase
      .from("workout_logs")
      .select("id, workout_name, started_at, finished_at, client_note, coach_seen_at, set_logs(exercise_name, set_kind, set_number, weight_kg, reps, intensifier_done, video_path)")
      .eq("client_id", id)
      .order("started_at", { ascending: false })
      .limit(5),
    templateChoices(supabase, "training"),
    supabase.from("programmes").select("id", { count: "exact", head: true }).eq("client_id", id).eq("is_live", true),
  ]);

  const { data: workouts } = prog
    ? await supabase.from("workouts").select("*").eq("programme_id", prog.id).order("position")
    : { data: null };
  // The week at a glance, once any session has set days.
  const week = WEEKDAYS.map((_, i) => (workouts ?? []).filter((w) => workoutDays(w).includes(i + 1)).map((w) => w.name));
  const anyDays = week.some((d) => d.length);
  const allSet = (workouts ?? []).every((w) => workoutDays(w).length);
  const current = workouts?.find((w) => w.id === sp.w) ?? workouts?.[0];
  const { data: plan } = current
    ? await supabase.from("workout_exercises").select("*").eq("workout_id", current.id).order("position")
    : { data: null };

  // Signed links for any set videos in the recent logs (valid for an hour).
  const paths = (logs ?? []).flatMap((l) => l.set_logs.map((s) => s.video_path).filter((p): p is string => !!p));
  const signed: Record<string, string> = {};
  if (paths.length) {
    const { data } = await supabase.storage.from("set-videos").createSignedUrls(paths, 3600);
    data?.forEach((d) => {
      if (d.path && d.signedUrl) signed[d.path] = d.signedUrl;
    });
  }

  return (
    <>
      <Link href="/coach/clients" className="small">
        ← All clients
      </Link>
      <h1>{c.full_name || "Client"}</h1>
      <ClientTabs id={c.id} active="training" self={self} />
      {sp.drafted ? <p className="alert ok small" style={{ margin: 0 }}>AI draft ready below. Check every session, then make it live when you&apos;re happy.</p> : null}

      <CopiedNote name={sp.copied} missing={sp.missing} cardio={sp.cardio} what="programme" />

      <AiDraft kind="training" clientId={c.id} first={first} aiOn={aiEnabled()} />
      <TemplateTools kind="training" clientId={c.id} planId={prog?.id ?? null} first={first} templates={templates} open={!prog && !!templates?.length} />

      {!prog ? (
        <div className="card">
          <h2>No programme yet</h2>
          <p className="muted" style={{ margin: 0 }}>
            Start one and add {first}&apos;s sessions. They won&apos;t see anything until you make it live.
          </p>
          <form action={createProgramme}>
            <input type="hidden" name="client_id" value={c.id} />
            <button className="btn primary">Start a programme</button>
          </form>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <span className="eyebrow">{prog.is_live ? `Live: ${first} can see this` : `Draft: ${first} can't see this yet`}</span>
                <h2>{prog.name}</h2>
                {!prog.is_live && earlierLive ? <p className="muted small" style={{ margin: "4px 0 0" }}>{first} keeps their earlier programme until you make this one live.</p> : null}
                {prog.notes ? <p className="muted small" style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{prog.notes}</p> : null}
              </div>
              <form action={setProgrammeLive}>
                <input type="hidden" name="programme_id" value={prog.id} />
                <input type="hidden" name="live" value={prog.is_live ? "false" : "true"} />
                <button className={`btn${prog.is_live ? "" : " primary"}`}>{prog.is_live ? "Hide from client" : `Make live for ${first}`}</button>
              </form>
            </div>
            <ProgrammeEdit id={prog.id} name={prog.name} notes={prog.notes} first={first} />
            <div className="wtabs">
              {(workouts ?? []).map((w) => (
                <Link key={w.id} href={`/coach/clients/${c.id}/training?w=${w.id}`} aria-current={w.id === current?.id ? "page" : undefined}>
                  {w.name}
                </Link>
              ))}
              <form action={addWorkout}>
                <input type="hidden" name="programme_id" value={prog.id} />
                <button className="link">+ Add a session</button>
              </form>
            </div>
            {anyDays ? (
              <div className="week-plan" aria-label={`${first}'s week`}>
                {WEEKDAYS.map((d, i) => (
                  <div key={d} className={week[i].length ? "on" : undefined}>
                    <b>{d}</b>
                    <span>{week[i].length ? week[i].join(", ") : allSet ? "Rest" : "–"}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {current ? <WorkoutDays key={current.id} workoutId={current.id} initial={workoutDays(current)} first={first} /> : null}
          </div>

          {current ? (
            <>
              <Builder
                key={current.id}
                workoutId={current.id}
                workoutName={current.name}
                initial={(plan ?? []) as unknown as PlanExercise[]}
                library={(library ?? []) as Exercise[]}
                gymName={gym?.name ?? null}
                gymKit={gym?.equipment ?? null}
                clientFirst={first}
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

      <div className="card">
        <h2>Recent workouts</h2>
        {!logs?.length ? (
          <p className="muted" style={{ margin: 0 }}>
            Nothing logged yet.
          </p>
        ) : (
          logs.map((l) => {
            const byEx = new Map<string, typeof l.set_logs>();
            l.set_logs
              .filter((s) => s.set_kind === "work")
              .sort((a, b) => a.set_number - b.set_number)
              .forEach((s) => byEx.set(s.exercise_name, [...(byEx.get(s.exercise_name) ?? []), s]));
            const mins = l.finished_at ? Math.round((+new Date(l.finished_at) - +new Date(l.started_at)) / 60000) : null;
            return (
              <div key={l.id} className="bx">
                <div className="bx-head">
                  <div>
                    <b>{l.workout_name}</b>
                    <div className="muted small">
                      {new Date(l.started_at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                      {mins ? ` · ${mins} min` : ""}
                    </div>
                  </div>
                  {l.coach_seen_at ? (
                    <span className="chip">Seen</span>
                  ) : (
                    <form action={markLogSeen}>
                      <input type="hidden" name="log_id" value={l.id} />
                      <button className="mini pink">Mark as seen</button>
                    </form>
                  )}
                </div>
                {l.client_note ? <p className="small" style={{ margin: 0 }}>“{l.client_note}”</p> : null}
                <div className="tbl-wrap">
                  <table className="table">
                    <tbody>
                      {[...byEx.entries()].map(([name, sets]) => (
                        <tr key={name}>
                          <td>{name}</td>
                          <td className="num muted">
                            {sets.map((s) => `${s.weight_kg ?? "BW"}×${s.reps ?? "–"}${s.intensifier_done ? "+" : ""}`).join(", ")}
                          </td>
                          <td>
                            {sets
                              .filter((s) => s.video_path && signed[s.video_path])
                              .map((s) => (
                                <a key={s.set_number} className="mini pink" href={signed[s.video_path!]} target="_blank" rel="noopener">
                                  ▶ Set {s.set_number}
                                </a>
                              ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
        <p className="muted small" style={{ margin: 0 }}>
          A + after a set means they did the intensifier.
        </p>
      </div>
    </>
  );
}
