"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

type Field = { name: string; label: string; type?: string; autoComplete?: string; hint?: string };

export function AuthForm({
  action,
  fields,
  submit,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  fields: Field[];
  submit: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="stack">
      {fields.map((f) => (
        <label key={f.name} className="field">
          {f.label}
          <input className="ctl" name={f.name} type={f.type ?? "text"} autoComplete={f.autoComplete} required />
          {f.hint ? <span className="hint small">{f.hint}</span> : null}
        </label>
      ))}
      {state?.error ? <p className="alert error" role="alert">{state.error}</p> : null}
      {state?.ok ? <p className="alert ok" role="status">{state.ok}</p> : null}
      <button className="btn primary block" disabled={pending}>
        {pending ? "One moment…" : submit}
      </button>
    </form>
  );
}
