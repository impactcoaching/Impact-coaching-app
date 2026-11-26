"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { savePeakWeek, startPeakWeek, type PeakResult } from "@/app/actions/peak";
import { litres, peakDate, peakLabel, shortDate, type PeakDay, type PeakWeek } from "@/lib/peak";

function Submit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn primary" disabled={pending} aria-busy={pending} style={{ alignSelf: "flex-start" }}>
      {pending ? busy : label}
    </button>
  );
}

function Result({ state }: { state: PeakResult }) {
  if (state?.error)
    return (
      <p className="alert error small" role="alert" style={{ margin: 0 }}>
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p className="alert ok small" role="status" style={{ margin: 0 }}>
        {state.ok}
      </p>
    );
  return null;
}

export function StartPeak({ clientId, defaultDate }: { clientId: string; defaultDate: string }) {
  const [state, action] = useActionState<PeakResult, FormData>(startPeakWeek, null);
  return (
    <form action={action} className="stack" style={{ gap: 12 }}>
      <input type="hidden" name="client_id" value={clientId} />
      <label className="field" style={{ maxWidth: 260 }}>
        <span>Show date</span>
        <input className="ctl" type="date" name="show_date" defaultValue={defaultDate} required />
      </label>
      <Submit label="Start peak week" busy="Starting…" />
      <Result state={state} />
    </form>
  );
}

const num = (v: number | null) => (v == null ? "" : String(v));

export function PeakEditor({ week, days, first }: { week: PeakWeek; days: PeakDay[]; first: string }) {
  const [state, action] = useActionState<PeakResult, FormData>(savePeakWeek, null);
  return (
    <form action={action} className="stack" style={{ gap: 14 }}>
      <input type="hidden" name="week_id" value={week.id} />
      <div className="grid2">
        <label className="field">
          <span>Show date</span>
          <input className="ctl" type="date" name="show_date" defaultValue={week.show_date} required />
        </label>
        <label className="check" style={{ alignSelf: "end", paddingBottom: 10 }}>
          <input type="checkbox" name="is_live" defaultChecked={week.is_live} />
          Show this to {first}
        </label>
      </div>
      <label className="field">
        <span>
          Notes for the whole week <span className="hint">(optional)</span>
        </span>
        <textarea className="ctl" name="notes" rows={2} defaultValue={week.notes ?? ""} placeholder="Weigh-in times, what to pack, who to call if anything feels off" />
      </label>

      <div className="peakdays">
        {days.map((d) => {
          const o = d.day_offset;
          return (
            <fieldset key={o} className={`peakday${o === 0 ? " show" : ""}`}>
              <input type="hidden" name="day_offset" value={o} />
              <legend>
                <b>{peakLabel(o)}</b> <span className="muted small">{shortDate(peakDate(week.show_date, o))}</span>
              </legend>
              <div className="peakgrid">
                <label>
                  Carbs (g)
                  <input className="ctl num" inputMode="numeric" name={`carbs_g_${o}`} defaultValue={num(d.carbs_g)} />
                </label>
                <label>
                  Protein (g)
                  <input className="ctl num" inputMode="numeric" name={`protein_g_${o}`} defaultValue={num(d.protein_g)} />
                </label>
                <label>
                  Fat (g)
                  <input className="ctl num" inputMode="numeric" name={`fat_g_${o}`} defaultValue={num(d.fat_g)} />
                </label>
                <label>
                  Water (litres)
                  <input className="ctl num" inputMode="decimal" name={`water_l_${o}`} defaultValue={num(litres(d.water_ml))} />
                </label>
                <label>
                  Sodium (mg)
                  <input className="ctl num" inputMode="numeric" name={`sodium_mg_${o}`} defaultValue={num(d.sodium_mg)} />
                </label>
              </div>
              <label className="field">
                <span>Training and cardio</span>
                <input className="ctl" name={`training_${o}`} defaultValue={d.training ?? ""} placeholder="e.g. Full-body depletion, 20 min walk" />
              </label>
              <label className="field">
                <span>Note</span>
                <textarea className="ctl" rows={2} name={`note_${o}`} defaultValue={d.note ?? ""} />
              </label>
            </fieldset>
          );
        })}
      </div>
      <Result state={state} />
      <Submit label="Save peak week" busy="Saving…" />
    </form>
  );
}
