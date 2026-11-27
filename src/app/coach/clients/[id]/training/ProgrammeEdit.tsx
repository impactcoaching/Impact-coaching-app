"use client";

import { useActionState, useEffect, useState } from "react";
import { updateProgramme } from "@/app/actions/training";

/** Programme name and the note the client sees. Shows Saving… then Saved. */
export function ProgrammeEdit({ id, name, notes, first }: { id: string; name: string; notes: string | null; first: string }) {
  const [state, action, pending] = useActionState(updateProgramme, {});
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (state.ok) setDirty(false);
  }, [state]);

  return (
    <details className="edit-prog" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="small">Edit name and note</summary>
      <form action={action} onChange={() => setDirty(true)} className="stack" style={{ gap: 10, marginTop: 10 }}>
        <input type="hidden" name="programme_id" value={id} />
        <label className="field">
          <span>Programme name</span>
          <input className="ctl" name="name" defaultValue={name} maxLength={80} />
        </label>
        <label className="field">
          <span>
            Note for {first} <span className="hint">(shown at the top of their Train page; leave empty for none)</span>
          </span>
          <textarea className="ctl" name="notes" rows={4} defaultValue={notes ?? ""} maxLength={2000} />
          <span className="hint">A note starting &quot;AI draft.&quot; is the AI&apos;s reasoning for you. {first} never sees it until you rewrite it.</span>
        </label>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn primary" disabled={pending} aria-busy={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
          {state.ok && !dirty && !pending ? <span className="chip pink">Saved</span> : null}
        </div>
        {state.error ? <p className="alert error small" style={{ margin: 0 }}>{state.error}</p> : null}
      </form>
    </details>
  );
}
