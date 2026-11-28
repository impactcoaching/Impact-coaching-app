"use client";

import { useActionState, useEffect, useState } from "react";
import { updateTemplateMeta } from "@/app/actions/templates";
import { AUDIENCE, COMPETITOR, GOALS, LEVELS, LOCATIONS, type Template } from "@/lib/templates";

/** Name, tags and filters for a template. Programmes also have the note the client sees. */
export function TemplateMeta({ t, notes }: { t: Template; notes: string | null }) {
  const [state, action, pending] = useActionState(updateTemplateMeta, null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (state?.ok) setDirty(false);
  }, [state]);
  const goals = [...new Set([...GOALS[t.kind], ...(t.goal ? [t.goal] : [])])];

  return (
    <form action={action} onChange={() => setDirty(true)} className="card stack" style={{ gap: 12 }}>
      <input type="hidden" name="template_id" value={t.id} />
      <label className="field">
        <span>Template name</span>
        <input className="ctl" name="name" defaultValue={t.name} maxLength={80} required />
      </label>
      <label className="field">
        <span>
          Summary <span className="hint">(for you, shown on the card)</span>
        </span>
        <input className="ctl" name="summary" defaultValue={t.summary ?? ""} maxLength={300} placeholder={t.kind === "training" ? "e.g. Upper/lower, glute bias, 60 min sessions" : "e.g. Carb cycling, higher on leg days"} />
      </label>
      <div className="tfilters">
        <label className="field">
          <span>Goal</span>
          <select className="ctl" name="goal" defaultValue={t.goal ?? ""}>
            <option value="">None</option>
            {goals.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Level</span>
          <select className="ctl" name="level" defaultValue={t.level ?? ""}>
            <option value="">Any</option>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        {t.kind === "training" ? (
          <label className="field">
            <span>Where</span>
            <select className="ctl" name="location" defaultValue={t.location ?? ""}>
              <option value="">Not set</option>
              {LOCATIONS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="field">
          <span>For</span>
          <select className="ctl" name="audience" defaultValue={t.audience}>
            {Object.entries(AUDIENCE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Competing</span>
          <select className="ctl" name="competitor" defaultValue={t.competitor}>
            {Object.entries(COMPETITOR).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>
          Other tags <span className="hint">(commas between, e.g. bikini, wellness, vegetarian)</span>
        </span>
        <input className="ctl" name="tags" defaultValue={t.tags.join(", ")} />
      </label>
      {t.kind === "training" ? (
        <label className="field">
          <span>
            Note for the client <span className="hint">(copied to the top of their Train page; leave empty for none)</span>
          </span>
          <textarea className="ctl" name="notes" rows={3} defaultValue={notes ?? ""} maxLength={2000} />
        </label>
      ) : (
        <input type="hidden" name="notes" value="" />
      )}
      <label className="check small">
        <input type="checkbox" name="self_guided" defaultChecked={t.self_guided} />
        Could be offered in a self-guided tier later
      </label>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn primary" disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : "Save details"}
        </button>
        {state?.ok && !dirty && !pending ? <span className="chip pink">Saved</span> : null}
      </div>
      {state?.error ? <p className="alert error small" style={{ margin: 0 }}>{state.error}</p> : null}
    </form>
  );
}
