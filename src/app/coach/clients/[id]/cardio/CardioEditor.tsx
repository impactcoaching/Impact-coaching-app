"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveCardioPlan, type CardioResult } from "@/app/actions/cardio";
import { saveTemplateCardio } from "@/app/actions/templates";
import { CARDIO_KINDS, CARDIO_MODES, CARDIO_TIMING, HR_ZONES, RPE_VALUES, WEEKDAYS, sessionMinutes, type CardioMode, type CardioPlan, type CardioSession } from "@/lib/cardio";

type Row = {
  key: string;
  id?: string;
  day: string;
  kind: string;
  minutes: string;
  mode: CardioMode;
  target: string;
  iv_work: string;
  iv_rest: string;
  iv_rounds: string;
  timing: string;
  notes: string;
};

const s = (v: number | string | null | undefined) => (v == null ? "" : String(v));
const toRow = (x: Omit<CardioSession, "client_id">): Row => ({
  key: x.id,
  id: x.id,
  day: s(x.day),
  kind: x.kind,
  minutes: s(x.minutes),
  mode: x.mode,
  target: s(x.target),
  iv_work: s(x.iv_work),
  iv_rest: s(x.iv_rest),
  iv_rounds: s(x.iv_rounds),
  timing: s(x.timing) || "Any time",
  notes: s(x.notes),
});
let n = 0;
const blank = (): Row => ({ key: `new${++n}`, day: "", kind: "Incline walk", minutes: "30", mode: "hr", target: "Zone 2", iv_work: "30", iv_rest: "90", iv_rounds: "8", timing: "Any time", notes: "" });
const rowMinutes = (r: Row) =>
  sessionMinutes({ mode: r.mode, minutes: Number(r.minutes) || 0, iv_work: Number(r.iv_work) || null, iv_rest: Number(r.iv_rest) || 0, iv_rounds: Number(r.iv_rounds) || null });

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn primary" disabled={pending} aria-busy={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

/** A client's cardio, or with templateId, the cardio that comes with a programme template. */
export function CardioEditor({
  clientId,
  templateId,
  first,
  plan,
  sessions,
}: {
  clientId?: string;
  templateId?: string;
  first: string;
  plan: Pick<CardioPlan, "weekly_minutes" | "daily_steps" | "extra_counts"> | null;
  sessions: Omit<CardioSession, "client_id">[];
}) {
  const [state, action] = useActionState<CardioResult, FormData>(templateId ? saveTemplateCardio : saveCardioPlan, null);
  const [rows, setRows] = useState<Row[]>(sessions.map(toRow));
  const [target, setTarget] = useState(s(plan?.weekly_minutes ?? ""));
  const set = (key: string, patch: Partial<Row>) => setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const planned = rows.reduce((a, r) => a + rowMinutes(r), 0);
  const goal = Number(target) || 0;
  const perDay = WEEKDAYS.map((_, i) => rows.filter((r) => Number(r.day) === i + 1).reduce((a, r) => a + rowMinutes(r), 0));
  const anyDay = rows.filter((r) => !r.day).reduce((a, r) => a + rowMinutes(r), 0);

  return (
    <form action={action} className="stack">
      {templateId ? <input type="hidden" name="template_id" value={templateId} /> : <input type="hidden" name="client_id" value={clientId} />}
      <section className="card stack" style={{ gap: 14 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Weekly targets</h2>
          <span className="muted small">Shows in the Train tab of {first}&apos;s app</span>
        </div>
        <div className="grid2">
          <label className="field">
            <span>Cardio minutes a week</span>
            <input className="ctl" name="weekly_minutes" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 150" />
          </label>
          <label className="field">
            <span>
              Daily steps <span className="hint">(optional)</span>
            </span>
            <input className="ctl" name="daily_steps" inputMode="numeric" defaultValue={s(plan?.daily_steps)} placeholder="e.g. 10000" />
          </label>
        </div>
        {goal ? (
          <div className="cardio-tot">
            <span>
              <b>{planned}</b> <span className="muted">of {goal} min planned</span>
            </span>
            <div className="cbar">
              <i style={{ width: `${Math.min(100, (planned / goal) * 100)}%` }} />
            </div>
            <span className={`chip ${planned >= goal ? "pink" : "warn"}`}>{planned >= goal ? "Target covered" : `${goal - planned} min their choice`}</span>
          </div>
        ) : null}
        <div className="wkmins">
          {WEEKDAYS.map((d, i) => (
            <div key={d} className={perDay[i] ? "on" : ""}>
              {d}
              <b>{perDay[i] || "–"}</b>
            </div>
          ))}
        </div>
        {anyDay ? <span className="muted small">Plus {anyDay} min on any day they choose.</span> : null}
        <label className="check">
          <input type="checkbox" name="extra_counts" defaultChecked={plan?.extra_counts ?? true} />
          <span>Extra cardio {first} logs counts toward the target</span>
        </label>
      </section>

      <section className="card stack" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Sessions</h2>
          <span className="muted small">Type, length, intensity and timing</span>
        </div>
        {rows.length ? null : <span className="muted">No sessions yet. {goal ? `${first} can fill the ${goal} minutes however they like.` : "Add one below."}</span>}
        {rows.map((r, i) => (
          <div key={r.key} className="crow">
            <input type="hidden" name="row" value={r.key} />
            {r.id ? <input type="hidden" name={`id_${r.key}`} value={r.id} /> : null}
            <label className="field">
              <span>Day</span>
              <select className="ctl" name={`day_${r.key}`} value={r.day} onChange={(e) => set(r.key, { day: e.target.value })}>
                <option value="">Any day</option>
                {WEEKDAYS.map((d, j) => (
                  <option key={d} value={j + 1}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Type</span>
              <select className="ctl" name={`kind_${r.key}`} value={r.kind} onChange={(e) => set(r.key, { kind: e.target.value })}>
                {[...new Set([...CARDIO_KINDS, r.kind])].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Minutes</span>
              {r.mode === "intervals" ? (
                <>
                  <input type="hidden" name={`minutes_${r.key}`} value={rowMinutes(r)} />
                  <span className="ctl static" title="Worked out from the intervals, plus 5 minutes to warm up and cool down">{rowMinutes(r)}</span>
                </>
              ) : (
                <input className="ctl" name={`minutes_${r.key}`} inputMode="numeric" value={r.minutes} onChange={(e) => set(r.key, { minutes: e.target.value })} />
              )}
            </label>
            <label className="field">
              <span>Intensity by</span>
              <select
                className="ctl"
                name={`mode_${r.key}`}
                value={r.mode}
                onChange={(e) => {
                  const mode = e.target.value as CardioMode;
                  set(r.key, { mode, target: mode === "hr" ? "Zone 2" : mode === "rpe" ? "6" : mode === "intervals" ? "RPE 9 on the hard parts" : "" });
                }}
              >
                {CARDIO_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Target</span>
              {r.mode === "hr" ? (
                <select className="ctl" name={`target_${r.key}`} value={r.target} onChange={(e) => set(r.key, { target: e.target.value })}>
                  {HR_ZONES.map((z) => (
                    <option key={z}>{z}</option>
                  ))}
                </select>
              ) : r.mode === "rpe" ? (
                <select className="ctl" name={`target_${r.key}`} value={r.target} onChange={(e) => set(r.key, { target: e.target.value })}>
                  {RPE_VALUES.map((z) => (
                    <option key={z} value={z}>
                      {z} out of 10
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="ctl"
                  name={`target_${r.key}`}
                  value={r.target}
                  onChange={(e) => set(r.key, { target: e.target.value })}
                  placeholder={r.mode === "speed" ? "5.5 km/h, 10% incline" : "Optional, e.g. RPE 9"}
                />
              )}
            </label>
            <label className="field">
              <span>Timing</span>
              <select className="ctl" name={`timing_${r.key}`} value={r.timing} onChange={(e) => set(r.key, { timing: e.target.value })}>
                {[...new Set([...CARDIO_TIMING, r.timing])].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <button type="button" className="xbtn" onClick={() => setRows((cur) => cur.filter((x) => x.key !== r.key))} aria-label={`Remove session ${i + 1}`}>
              ✕
            </button>
            {r.mode === "intervals" ? (
              <div className="crow-iv">
                <input className="ctl" name={`iv_work_${r.key}`} inputMode="numeric" value={r.iv_work} onChange={(e) => set(r.key, { iv_work: e.target.value })} aria-label="Seconds on" />
                <span>s on</span>
                <input className="ctl" name={`iv_rest_${r.key}`} inputMode="numeric" value={r.iv_rest} onChange={(e) => set(r.key, { iv_rest: e.target.value })} aria-label="Seconds off" />
                <span>s off ×</span>
                <input className="ctl" name={`iv_rounds_${r.key}`} inputMode="numeric" value={r.iv_rounds} onChange={(e) => set(r.key, { iv_rounds: e.target.value })} aria-label="Rounds" />
                <span>rounds</span>
              </div>
            ) : null}
            <input className="ctl crow-note" name={`notes_${r.key}`} value={r.notes} onChange={(e) => set(r.key, { notes: e.target.value })} placeholder={`Note for ${first}, optional`} aria-label="Note" />
          </div>
        ))}
        <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={() => setRows((cur) => [...cur, blank()])}>
            + Add session
          </button>
          <Save label={templateId ? "Save cardio" : `Save and send to ${first}`} />
        </div>
        {state?.error ? (
          <p className="alert error small" role="alert" style={{ margin: 0 }}>
            {state.error}
          </p>
        ) : state?.ok ? (
          <p className="alert ok small" role="status" style={{ margin: 0 }}>
            {state.ok}
          </p>
        ) : null}
        <span className="muted small">Heart rate zones are explained to {first} in plain words. HIIT minutes are worked out from the intervals.</span>
      </section>
    </form>
  );
}
