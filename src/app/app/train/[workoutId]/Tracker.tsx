"use client";

import { createPortal } from "react-dom";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { finishWorkout } from "@/app/actions/training";
import { createClient } from "@/lib/supabase/client";
import { DemoPlayer } from "@/components/DemoPlayer";
import { effortText, groupName, intensifierSteps, intensifierText, repsText, setLabels, INTENSIFIERS, type PlanExercise } from "@/lib/training";

export type TrackerExercise = PlanExercise & {
  id: string;
  name: string;
  exercise_id: string;
  has_demo: boolean;
  cues: string | null;
  last: Record<string, string>; // "work1" -> "90 × 10"
};

type Row = { weight: string; reps: string; done: boolean; int: boolean; video: string | null; uploading?: boolean };
const key = (exId: string, kind: "warmup" | "work", n: number) => `${exId}:${kind}:${n}`;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function Tracker({ workoutId, name, notes, exercises, userId }: { workoutId: string; name: string; notes: string | null; exercises: TrackerExercise[]; userId: string }) {
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [panel, setPanel] = useState<{ ex: TrackerExercise; set: number } | null>(null);
  const [demoFor, setDemoFor] = useState<TrackerExercise | null>(null);
  const [rest, setRest] = useState<{ end: number; total: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const startedAt = useRef(new Date().toISOString());
  const fileFor = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const labels = setLabels(exercises);

  useEffect(() => {
    if (!rest) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [rest]);
  const restLeft = rest ? Math.max(0, Math.ceil((rest.end - now) / 1000)) : 0;
  useEffect(() => {
    if (rest && restLeft === 0) {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setRest(null);
    }
  }, [rest, restLeft]);

  const row = (k: string): Row => rows[k] ?? { weight: "", reps: "", done: false, int: false, video: null };
  const set = (k: string, patch: Partial<Row>) => setRows((cur) => ({ ...cur, [k]: { ...row(k), ...patch } }));

  const total = useMemo(() => exercises.reduce((a, e) => a + e.warmup_sets + e.work_sets, 0), [exercises]);
  const done = Object.values(rows).filter((r) => r.done).length;

  function tick(e: TrackerExercise, i: number, kind: "warmup" | "work", n: number) {
    const k = key(e.id, kind, n);
    const r = row(k);
    const prevNums = e.last[`${kind}${n}`]?.split(" × ");
    // Ticking an empty row copies last time's numbers, so a repeat set is one tap.
    const patch: Partial<Row> = { done: !r.done };
    if (!r.done && !r.weight && !r.reps && prevNums) {
      patch.weight = prevNums[0] === "BW" ? "" : prevNums[0];
      patch.reps = prevNums[1] === "–" ? "" : prevNums[1];
    }
    set(k, patch);
    // Rest after a working set, unless the next exercise is part of the same superset.
    const nextLinked = i + 1 < exercises.length && exercises[i + 1].linked_to_previous;
    if (!r.done && kind === "work" && e.rest_seconds > 0 && !nextLinked) setRest({ end: Date.now() + e.rest_seconds * 1000, total: e.rest_seconds });
  }

  function chooseVideo(k: string) {
    fileFor.current = k;
    fileInput.current?.click();
  }

  async function upload(file: File) {
    const k = fileFor.current;
    if (!k) return;
    if (file.size > 50 * 1024 * 1024) {
      setError("That video is over 50 MB. Trim it to the one set and try again.");
      return;
    }
    set(k, { uploading: true });
    const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await createClient().storage.from("set-videos").upload(path, file, { contentType: file.type || "video/mp4" });
    if (upErr) {
      set(k, { uploading: false });
      setError("The video didn't upload. Check your signal and try again.");
      return;
    }
    set(k, { uploading: false, video: path });
  }

  function finish() {
    setError(null);
    const sets = exercises.flatMap((e) =>
      (["warmup", "work"] as const).flatMap((kind) =>
        Array.from({ length: kind === "warmup" ? e.warmup_sets : e.work_sets }, (_, j) => {
          const r = row(key(e.id, kind, j + 1));
          if (!r.done && !r.weight && !r.reps) return [];
          return [
            {
              workout_exercise_id: e.id,
              exercise_name: e.name,
              set_kind: kind,
              set_number: j + 1,
              weight_kg: r.weight === "" ? null : Number(r.weight),
              reps: r.reps === "" ? null : Math.round(Number(r.reps)),
              intensifier_done: r.int,
              video_path: r.video,
            },
          ];
        }).flat(),
      ),
    );
    if (!sets.length) {
      setError("Tick off at least one set before you finish.");
      return;
    }
    start(async () => {
      const res = await finishWorkout({ workoutId, startedAt: startedAt.current, note: note.trim() || null, sets });
      if (res?.error) setError(res.error);
    });
  }

  const groupSizeFrom = (i: number) => {
    let n = 1;
    while (i + n < exercises.length && exercises[i + n].linked_to_previous) n++;
    return n;
  };
  const intOn = (e: TrackerExercise, n: number) => !!e.intensifier && (e.intensifier_on === "all" || e.intensifier.type === "cluster" || n === e.work_sets);

  return (
    <>
      <Link href="/app/train" className="small">
        ← All sessions
      </Link>
      <div className="stack" style={{ gap: 8 }}>
        <h1>{name}</h1>
        <span className="muted small num">
          {done} of {total} sets done
        </span>
        <div className="steps" aria-hidden="true" data-tour="progress">
          <i className="on" style={{ flex: `0 0 ${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </div>
      {notes ? <p className="alert">{notes}</p> : null}

      {exercises.map((e, i) => {
        const linked = e.linked_to_previous || (i + 1 < exercises.length && exercises[i + 1].linked_to_previous);
        return (
          <section key={e.id} className={`card ex${e.linked_to_previous ? " linked" : ""}`} style={e.linked_to_previous ? { marginTop: -8, borderLeft: "2px solid var(--pink)" } : linked ? { borderLeft: "2px solid var(--pink)" } : undefined}>
            <div className="ex-head" data-tour="ex-head">
              <div>
                <span className="eyebrow">
                  {labels[i]}
                  {linked && !e.linked_to_previous ? ` · ${groupName(groupSizeFrom(i))}, no rest between` : ""}
                </span>
                <h2>{e.name}</h2>
                <div className="ex-meta" data-tour="ex-meta">
                  {e.work_sets} × {repsText(e)}
                  {effortText(e) ? ` @ ${effortText(e)}` : ""}
                  {e.tempo ? ` · tempo ${e.tempo}` : ""}
                  {e.rest_seconds ? ` · rest ${mmss(e.rest_seconds)}` : ""}
                </div>
              </div>
              {e.has_demo ? (
                <button className="mini pink" onClick={() => setDemoFor(e)} data-tour="demo">
                  ▶ Demo
                </button>
              ) : null}
            </div>
            {e.notes ? <p className="small" style={{ margin: 0 }}><b>Adam:</b> {e.notes}</p> : null}

            <div className="srow small muted" aria-hidden="true">
              <span className="n">Set</span>
              <span style={{ textAlign: "center" }}>kg</span>
              <span style={{ textAlign: "center" }}>Reps</span>
              <span />
            </div>
            {(["warmup", "work"] as const).map((kind) =>
              Array.from({ length: kind === "warmup" ? e.warmup_sets : e.work_sets }, (_, j) => {
                const n = j + 1;
                const k = key(e.id, kind, n);
                const r = row(k);
                const prev = e.last[`${kind}${n}`];
                const film = kind === "work" && e.film_set === n;
                const hasInt = kind === "work" && intOn(e, n);
                return (
                  <div key={k} className="srow" data-tour="set">
                    <span className={`n${kind === "warmup" ? " w" : ""}`}>{kind === "warmup" ? `W${n}` : n}</span>
                    <input className="ctl num" inputMode="decimal" placeholder={prev?.split(" × ")[0] ?? "kg"} value={r.weight} onChange={(v) => set(k, { weight: v.target.value })} aria-label={`Set ${n} weight`} />
                    <input className="ctl num" inputMode="numeric" placeholder={prev?.split(" × ")[1] ?? "reps"} value={r.reps} onChange={(v) => set(k, { reps: v.target.value })} aria-label={`Set ${n} reps`} />
                    <button className="tick" data-tour="tick" aria-pressed={r.done} onClick={() => tick(e, i, kind, n)} aria-label={`Set ${n} done`}>
                      ✓
                    </button>
                    {prev ? <span className="prev">Last time {prev}</span> : null}
                    {hasInt || film ? (
                      <div className="srow-extra">
                        {/* Intensifier sits beside its set and opens a side panel */}
                        {hasInt ? (
                          <button data-tour="int" className={`mini ${r.int ? "done" : "pink"}`} onClick={() => setPanel({ ex: e, set: n })}>
                            ⚡ {INTENSIFIERS[e.intensifier!.type].label}
                            {r.int ? " ✓" : ""}
                          </button>
                        ) : null}
                        {film ? (
                          <button data-tour="film" className={`mini ${r.video ? "done" : "pink"}`} onClick={() => chooseVideo(k)} disabled={r.uploading}>
                            {r.uploading ? "Uploading…" : r.video ? "Video added ✓" : "🎥 Film this set for Adam"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              }),
            )}
          </section>
        );
      })}

      <section className="card">
        <label className="field">
          <span>
            Anything to tell Adam? <span className="hint">(optional)</span>
          </span>
          <textarea className="ctl" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Left knee felt a bit sore on the hack squat" />
        </label>
        {error ? <p className="alert error" role="alert">{error}</p> : null}
        <button className="btn primary block" data-tour="finish" onClick={finish} disabled={saving}>
          {saving ? "Saving…" : "Finish workout"}
        </button>
      </section>

      <input
        ref={fileInput}
        type="file"
        accept="video/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />

      {rest ? (
        <div className="restbar" role="timer" aria-live="polite">
          <span className="muted small">Rest</span>
          <b className="num">{mmss(restLeft)}</b>
          <span className="row" style={{ gap: 6 }}>
            <button className="mini" onClick={() => setRest({ ...rest, end: rest.end + 30000 })}>+30 s</button>
            <button className="mini pink" onClick={() => setRest(null)}>Skip</button>
          </span>
        </div>
      ) : null}

      {demoFor ? <DemoPlayer exerciseId={demoFor.exercise_id} name={demoFor.name} cues={demoFor.cues} onClose={() => setDemoFor(null)} /> : null}

      {panel && panel.ex.intensifier ? createPortal(
        <>
          <div className="scrim" onClick={() => setPanel(null)} />
          <aside className="panel" role="dialog" aria-label="Intensifier">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Set {panel.set} · {panel.ex.name}</span>
                <h2>{INTENSIFIERS[panel.ex.intensifier.type].label}</h2>
              </div>
              <button className="iconbtn" onClick={() => setPanel(null)} aria-label="Close">✕</button>
            </div>
            <p className="muted" style={{ margin: 0 }}>{intensifierText(panel.ex.intensifier, panel.ex.intensifier_on)}</p>
            <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {intensifierSteps(panel.ex.intensifier).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <button
              className="btn primary"
              onClick={() => {
                const k = key(panel.ex.id, "work", panel.set);
                set(k, { int: !row(k).int });
                setPanel(null);
              }}
            >
              {row(key(panel.ex.id, "work", panel.set)).int ? "Mark as not done" : "Done it"}
            </button>
          </aside>
        </>,
        document.body,
      ) : null}
    </>
  );
}
