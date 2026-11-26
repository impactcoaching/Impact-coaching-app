"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setClientStatus, type StatusResult } from "@/app/actions/coach";

const NEXT: Record<string, { to: string; label: string; primary: boolean } | undefined> = {
  pending: { to: "active", label: "Accept as a client", primary: true },
  active: { to: "paused", label: "Pause", primary: false },
  paused: { to: "active", label: "Restart", primary: true },
};

function Btn({ label, primary }: { label: string; primary: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn${primary ? " primary" : ""}`} disabled={pending} aria-busy={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export function StatusControl({ id, status }: { id: string; status: string }) {
  const [state, action] = useActionState<StatusResult, FormData>(setClientStatus, {});
  const next = NEXT[status];
  if (!next) return null;
  return (
    <form action={action} className="stack" style={{ gap: 6, alignItems: "flex-end" }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next.to} />
      <Btn label={next.label} primary={next.primary} />
      {state.error ? (
        <span className="small" role="alert" style={{ color: "var(--pink)" }}>
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
