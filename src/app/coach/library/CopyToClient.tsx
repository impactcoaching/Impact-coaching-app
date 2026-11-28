"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { applyTemplate } from "@/app/actions/templates";

export type Choice = { id: string; label: string };

function Go({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn primary" disabled={pending} aria-busy={pending}>
      {pending ? "Copying…" : label}
    </button>
  );
}

/**
 * Copy a template onto a client. Used two ways: on a template (pick the client)
 * and on a client's page (pick the template). It's a copy, so tweaking it later never touches the template.
 */
export function CopyToClient({
  kind,
  templateId,
  clientId,
  clients,
  templates,
  hasCardio,
  hasCurrent,
  first,
}: {
  kind: "training" | "nutrition";
  templateId?: string;
  clientId?: string;
  clients?: Choice[];
  templates?: (Choice & { cardio?: boolean })[];
  hasCardio?: boolean;
  /** The client already has a programme or plan (only known on a client's page). */
  hasCurrent?: boolean;
  first?: string;
}) {
  const [state, action] = useActionState(applyTemplate, null);
  const what = kind === "training" ? "programme" : "nutrition plan";
  const who = first ?? "they";
  const anyCardio = hasCardio || templates?.some((t) => t.cardio);

  return (
    <form action={action} className="stack" style={{ gap: 10 }}>
      {templateId ? <input type="hidden" name="template_id" value={templateId} /> : null}
      {clientId ? <input type="hidden" name="client_id" value={clientId} /> : null}
      {clients ? (
        <label className="field">
          <span>Copy onto</span>
          <select className="ctl" name="client_id" defaultValue="" required>
            <option value="" disabled>
              Pick a client
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {templates ? (
        <label className="field">
          <span>Template</span>
          <select className="ctl" name="template_id" defaultValue="" required>
            <option value="" disabled>
              Pick a template
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {kind === "training" && anyCardio ? (
        <label className="check small">
          <input type="checkbox" name="with_cardio" defaultChecked />
          <span>Copy its cardio too. This replaces {first ? `${first}'s` : "their"} cardio targets and sessions straight away.</span>
        </label>
      ) : null}
      <div className="row" style={{ gap: 10, alignItems: "center" }}>
        <Go label={templates ? "Copy template" : "Copy onto client"} />
      </div>
      <span className="muted small">
        It arrives as a draft {what} you can tweak.{" "}
        {hasCurrent === false ? `${who === "they" ? "They" : first} won't see it until you make it live.` : `${who === "they" ? "Their" : `${first}'s`} current ${what} stays as it is until you make the new one live.`}
      </span>
      {state?.error ? (
        <p className="alert error small" role="alert" style={{ margin: 0 }}>
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
