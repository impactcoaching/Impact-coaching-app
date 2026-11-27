"use client";

import { useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { saveWorkout } from "@/app/actions/training";
import { EQUIPMENT, type EquipmentKey } from "@/lib/options";
import {
  INTENSIFIERS,
  blankPlanExercise,
  effortText,
  groupName,
  intensifierText,
  repsText,
  setLabels,
  type Exercise,
  type Intensifier,
  type IntensifierType,
  type PlanExercise,
} from "@/lib/training";

const pick = (e: PlanExercise): PlanExercise => ({
  exercise_id: e.exercise_id,
  linked_to_previous: e.linked_to_previous,
  warmup_sets: e.warmup_sets,
  work_sets: e.work_sets,
  reps_type: e.reps_type,
  reps_min: e.reps_min,
  reps_max: e.reps_max,
  tempo: e.tempo,
  effort_type: e.effort_type,
  effort_value: e.effort_value,
  rest_seconds: e.rest_seconds,
  intensifier: e.intensifier,
  intensifier_on: e.intensifier_on,
  film_set: e.film_set,
  notes: e.notes,
});

const num = (v: string) => (v.trim() === "" ? null : Number(v));

export function Builder({
  workoutId,
  workoutName,
  initial,
  library,
  gymName,
  gymKit,
  clientFirst,
}: {
  workoutId: string;
  workoutName: string;
  initial: PlanExercise[];
  library: Exercise[];
  gymName: string | null;
  gymKit: string[] | null;
  clientFirst: string;
}) {
  const [name, setName] = useState(workoutName);
  const [list, setList] = useState<PlanExercise[]>(() => initial.map(pick));
  const [panel, setPanel] = useState<number | null>(null);
  const [picker, setPicker] = useState(false);
  const [q, setQ] = useState("");
  const [onlyKit, setOnlyKit] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [saving, start] = useTransition();

  const byId = useMemo(() => new Map(library.map((x) => [x.id, x])), [library]);
  const labels = setLabels(list);
  const missing = (ex: Exercise | undefined) => (ex && gymKit ? ex.equipment.filter((k) => !gymKit.includes(k)) : []);

  function update(i: number, patch: Partial<PlanExercise>) {
    setList((cur) => cur.map((e, j) => (j === i ? { ...e, ...patch } : e)));
    setDirty(true);
    setMsg(null);
  }
  function move(i: number, d: -1 | 1) {
    setList((cur) => {
      const j = i + d;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  }
  function remove(i: number) {
    setList((cur) => cur.filter((_, j) => j !== i));
    setDirty(true);
  }
  function add(id: string) {
    setList((cur) => [...cur, blankPlanExercise(id)]);
    setPicker(false);
    setQ("");
    setDirty(true);
  }
  function save() {
    start(async () => {
      const res = await saveWorkout({ workoutId, name, exercises: list });
      if (res.error) setMsg({ error: res.error });
      else {
        setMsg({ ok: "Saved." });
        setDirty(false);
      }
    });
  }

  const results = library.filter((x) => (!q || `${x.name} ${x.muscle}`.toLowerCase().includes(q.toLowerCase())) && (!onlyKit || missing(x).length === 0));
  const groupSize = (i: number) => {
    let s = i;
    while (s > 0 && list[s].linked_to_previous) s--;
    let n = 1;
    while (s + n < list.length && list[s + n].linked_to_previous) n++;
    return n;
  };
  const p = panel !== null ? list[panel] : null;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <label className="field" style={{ flex: 1, minWidth: 200 }}>
          Session name
          <input className="ctl" value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} />
        </label>
        <div className="row">
          {msg?.ok ? <span className="chip pink">{msg.ok}</span> : null}
          <button className="btn primary" onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving…" : dirty ? "Save session" : "Saved"}
          </button>
        </div>
      </div>
      {gymName ? (
        <p className="muted small" style={{ margin: 0 }}>
          {clientFirst} trains at <b style={{ color: "var(--fg)" }}>{gymName}</b>. Exercises that need kit they don&apos;t have are flagged.
        </p>
      ) : null}
      {msg?.error ? <p className="alert error">{msg.error}</p> : null}

      {list.length === 0 ? <p className="muted" style={{ margin: 0 }}>No exercises yet. Add the first one below.</p> : null}

      {list.map((e, i) => {
        const ex = byId.get(e.exercise_id);
        const miss = missing(ex);
        const linkedNext = i + 1 < list.length && list[i + 1].linked_to_previous;
        return (
          <div key={i} className={`bx${e.linked_to_previous && i > 0 ? " linked" : ""}`}>
            <div className="bx-head">
              <div className="row" style={{ gap: 10 }}>
                <span className="lbl">{labels[i]}</span>
                <div>
                  <b>{ex?.name ?? "Exercise"}</b>
                  <div className="muted small">
                    {ex?.muscle}
                    {e.linked_to_previous || linkedNext ? ` · ${groupName(groupSize(i))}` : ""}
                  </div>
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="iconbtn" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}>↑</button>
                <button className="iconbtn" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === list.length - 1}>↓</button>
                <button className="iconbtn" onClick={() => remove(i)} aria-label="Remove">✕</button>
              </div>
            </div>
            {miss.length ? (
              <span className="warnline">⚠ Needs {miss.map((k) => EQUIPMENT[k as EquipmentKey] ?? k).join(" and ")}, which {clientFirst}&apos;s gym doesn&apos;t have.</span>
            ) : null}

            <div className="bx-grid">
              <label>
                Warm-up sets
                <input className="ctl num" type="number" min={0} max={10} value={e.warmup_sets} onChange={(v) => update(i, { warmup_sets: Number(v.target.value) || 0 })} />
              </label>
              <label>
                Working sets
                <input className="ctl num" type="number" min={1} max={20} value={e.work_sets} onChange={(v) => update(i, { work_sets: Math.max(1, Number(v.target.value) || 1) })} />
              </label>
              <label>
                Reps
                <select className="ctl" value={e.reps_type} onChange={(v) => update(i, { reps_type: v.target.value as PlanExercise["reps_type"] })}>
                  <option value="range">Range</option>
                  <option value="fixed">Fixed</option>
                  <option value="amrap">As many as possible</option>
                  <option value="time">Time (seconds)</option>
                </select>
              </label>
              {e.reps_type !== "amrap" ? (
                <label>
                  {e.reps_type === "range" ? "From" : e.reps_type === "time" ? "Seconds" : "Reps"}
                  <input className="ctl num" type="number" min={1} value={e.reps_min ?? ""} onChange={(v) => update(i, { reps_min: num(v.target.value) })} />
                </label>
              ) : null}
              {e.reps_type === "range" ? (
                <label>
                  To
                  <input className="ctl num" type="number" min={1} value={e.reps_max ?? ""} onChange={(v) => update(i, { reps_max: num(v.target.value) })} />
                </label>
              ) : null}
              <label>
                Tempo
                <input className="ctl num" placeholder="3-1-1-0" value={e.tempo ?? ""} onChange={(v) => update(i, { tempo: v.target.value || null })} />
              </label>
              <label>
                Effort
                <select className="ctl" value={e.effort_type} onChange={(v) => update(i, { effort_type: v.target.value as PlanExercise["effort_type"] })}>
                  <option>RIR</option>
                  <option>RPE</option>
                  <option value="%1RM">% of 1RM</option>
                  <option>Weight</option>
                </select>
              </label>
              <label>
                {e.effort_type === "Weight" ? "kg" : "Value"}
                <input className="ctl num" placeholder={e.effort_type === "RIR" ? "1–2" : ""} value={e.effort_value ?? ""} onChange={(v) => update(i, { effort_value: v.target.value || null })} />
              </label>
              <label>
                Rest (seconds)
                <input className="ctl num" type="number" min={0} max={900} step={15} value={e.rest_seconds} onChange={(v) => update(i, { rest_seconds: Number(v.target.value) || 0 })} />
              </label>
              <label>
                Film set
                <select className="ctl" value={e.film_set ?? ""} onChange={(v) => update(i, { film_set: num(v.target.value) })}>
                  <option value="">No video</option>
                  {Array.from({ length: e.work_sets }, (_, n) => (
                    <option key={n} value={n + 1}>
                      Set {n + 1}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* The intensifier sits beside the set, opening a side panel. */}
            <div className="setrow">
              <div className="sum">
                <b>
                  {e.work_sets} × {repsText(e)}
                </b>
                {effortText(e) ? ` @ ${effortText(e)}` : ""}
                {e.tempo ? ` · tempo ${e.tempo}` : ""}
                {e.rest_seconds ? ` · ${e.rest_seconds} s rest` : ""}
              </div>
              <button className={`inttab${e.intensifier ? " on" : ""}`} onClick={() => setPanel(i)}>
                {e.intensifier ? `⚡ ${INTENSIFIERS[e.intensifier.type].label}` : "+ Intensifier"}
              </button>
            </div>

            <label className="field">
              <span>
                Notes for {clientFirst} <span className="hint">(optional)</span>
              </span>
              <input className="ctl" value={e.notes ?? ""} placeholder="e.g. Feet mid-platform, full depth you can control" onChange={(v) => update(i, { notes: v.target.value || null })} />
            </label>
            {i > 0 ? (
              <label className="check small">
                <input type="checkbox" checked={e.linked_to_previous} onChange={(v) => update(i, { linked_to_previous: v.target.checked })} />
                Superset with the exercise above (no rest between them)
              </label>
            ) : null}
          </div>
        );
      })}

      <button className="btn" onClick={() => setPicker(true)}>
        + Add exercise
      </button>

      {/* Intensifier side panel */}
      {/* Panels go straight into the page body: inside a frosted card, "fixed" would stick to the card, not the screen. */}
      {p && panel !== null ? createPortal(
        <>
          <div className="scrim" onClick={() => setPanel(null)} />
          <aside className="panel" role="dialog" aria-label="Intensifier">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Intensifier</span>
                <h2>{byId.get(p.exercise_id)?.name}</h2>
              </div>
              <button className="iconbtn" onClick={() => setPanel(null)} aria-label="Close">✕</button>
            </div>
            <div className="choices">
              <label className="choice">
                <input type="radio" checked={!p.intensifier} onChange={() => update(panel, { intensifier: null })} />
                None
              </label>
              {(Object.keys(INTENSIFIERS) as IntensifierType[]).map((t) => (
                <label key={t} className="choice">
                  <input type="radio" checked={p.intensifier?.type === t} onChange={() => update(panel, { intensifier: { ...INTENSIFIERS[t].blank } })} />
                  {INTENSIFIERS[t].label}
                </label>
              ))}
            </div>
            {p.intensifier ? (
              <>
                <div className="bx-grid">
                  {Object.entries(p.intensifier)
                    .filter(([k]) => k !== "type")
                    .map(([k, v]) => (
                      <label key={k}>
                        {{ drops: "Drops", pct: "% lighter each drop", mini: "Mini-sets", rest: "Rest (s)", clusters: "Clusters", reps: "Reps" }[k] ?? k}
                        <input
                          className="ctl num"
                          type="number"
                          min={1}
                          value={v as number}
                          onChange={(ev) => update(panel, { intensifier: { ...p.intensifier!, [k]: Number(ev.target.value) || 1 } as Intensifier })}
                        />
                      </label>
                    ))}
                </div>
                {p.intensifier.type !== "cluster" && p.intensifier.type !== "myo" ? (
                  <div className="choices" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
                    {(["last", "all"] as const).map((o) => (
                      <label key={o} className="choice">
                        <input type="radio" checked={p.intensifier_on === o} onChange={() => update(panel, { intensifier_on: o })} />
                        {o === "last" ? "Last set only" : "Every set"}
                      </label>
                    ))}
                  </div>
                ) : null}
                <p className="alert ok small" style={{ margin: 0 }}>
                  {clientFirst} sees: {intensifierText(p.intensifier, p.intensifier_on)}
                </p>
              </>
            ) : null}
            <button className="btn primary" onClick={() => setPanel(null)}>
              Done
            </button>
          </aside>
        </>,
        document.body,
      ) : null}

      {/* Exercise picker */}
      {picker ? createPortal(
        <>
          <div className="scrim" onClick={() => setPicker(false)} />
          <aside className="panel wide" role="dialog" aria-label="Add exercise">
            <div className="panel-head">
              <h2>Add exercise</h2>
              <button className="iconbtn" onClick={() => setPicker(false)} aria-label="Close">✕</button>
            </div>
            <input className="ctl" placeholder="Search, e.g. squat or glutes" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            {gymKit ? (
              <label className="check small">
                <input type="checkbox" checked={onlyKit} onChange={(e) => setOnlyKit(e.target.checked)} />
                Only show what {clientFirst}&apos;s gym has kit for
              </label>
            ) : null}
            <div className="picker-list">
              {results.map((x) => (
                <button key={x.id} className="pick" onClick={() => add(x.id)}>
                  <span>
                    <b>{x.name}</b>
                    <small>
                      {x.muscle}
                      {x.equipment.length ? ` · ${x.equipment.map((k) => EQUIPMENT[k as EquipmentKey] ?? k).join(", ")}` : " · No kit"}
                    </small>
                  </span>
                  <span className="chip pink">Add</span>
                </button>
              ))}
              {!results.length ? <p className="muted small">Nothing matches. Untick the gym filter to see everything.</p> : null}
            </div>
          </aside>
        </>,
        document.body,
      ) : null}
    </div>
  );
}
