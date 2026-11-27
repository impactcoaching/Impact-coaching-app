"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteClient, setClientStatus, type DeleteResult, type StatusResult } from "@/app/actions/coach";

function Submit({ label, busy, danger, disabled }: { label: string; busy: string; danger?: boolean; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn${danger ? " danger" : ""}`} disabled={pending || disabled} aria-busy={pending}>
      {pending ? busy : label}
    </button>
  );
}

/** End coaching (reversible) and permanent delete, kept together at the bottom of a client's page. */
export function ManageClient({ id, name, status }: { id: string; name: string; status: string }) {
  const [endState, endAction] = useActionState<StatusResult, FormData>(setClientStatus, {});
  const [delState, delAction] = useActionState<DeleteResult, FormData>(deleteClient, {});
  const [typed, setTyped] = useState("");
  const matches = !!name.trim() && typed.trim().toLowerCase() === name.trim().toLowerCase();

  return (
    <section className="card stack manage">
      <h2 style={{ margin: 0 }}>Manage client</h2>

      {status !== "ended" ? (
        <div className="stack" style={{ gap: 8 }}>
          <h3 style={{ margin: 0 }}>End coaching</h3>
          <p className="muted small" style={{ margin: 0 }}>
            Locks their app and moves them to Ended in your client list. Everything is kept, so you can restart them any time. Their data is deleted after 12 months, as the
            privacy policy says.
          </p>
          <form action={endAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value="ended" />
            <Submit label="End coaching" busy="Ending…" />
          </form>
          {endState.error ? (
            <span className="small" role="alert" style={{ color: "var(--pink)" }}>
              {endState.error}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="muted small" style={{ margin: 0 }}>
          Coaching has ended. Their app is locked. Use Restart coaching at the top to switch it back on.
        </p>
      )}

      <details className="danger-zone">
        <summary>Delete permanently</summary>
        <div className="stack" style={{ gap: 8, marginTop: 10 }}>
          <p className="small" style={{ margin: 0 }}>
            <b>This can&apos;t be undone.</b> It deletes their account, sign-up answers, plans, logs, check-ins, messages, photos and videos. Use it when someone asks for their
            data to be deleted, or 12 months after they leave.
          </p>
          <form action={delAction} className="stack" style={{ gap: 8 }}>
            <input type="hidden" name="id" value={id} />
            <label className="small" htmlFor="confirm-name">
              Type <b>{name || "their name"}</b> to confirm
            </label>
            <input id="confirm-name" name="confirm" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
            <div>
              <Submit label="Delete everything" busy="Deleting…" danger disabled={!matches} />
            </div>
          </form>
          {delState.error ? (
            <div className="alert error" role="alert">
              {delState.error}
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}
