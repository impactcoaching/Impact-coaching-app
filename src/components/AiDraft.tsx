"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { draftNutrition, draftProgramme, type AiFormResult } from "@/app/actions/ai";

function Go({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn primary" disabled={pending} aria-busy={pending} style={{ alignSelf: "flex-start" }}>
      {pending ? "Drafting… this takes up to a minute" : label}
    </button>
  );
}

/** "Draft with AI" for the coach. Saves a new draft that the client can't see until Adam makes it live. */
export function AiDraft({ kind, clientId, first, style, aiOn }: { kind: "training" | "nutrition"; clientId: string; first: string; style?: string; aiOn: boolean }) {
  const [state, action] = useActionState<AiFormResult, FormData>(kind === "training" ? draftProgramme : draftNutrition, null);
  return (
    <details className="card aidraft">
      <summary className="row" style={{ justifyContent: "space-between", cursor: "pointer" }}>
        <span>
          <span className="eyebrow">✨ Draft with AI</span>
          <br />
          <span className="small muted">{kind === "training" ? "A first go at a programme, from their sign-up answers and gym kit." : "A first go at targets, from their sign-up answers."}</span>
        </span>
      </summary>
      {!aiOn ? (
        <p className="muted small" style={{ margin: 0 }}>
          Not switched on yet. Add ANTHROPIC_API_KEY in Vercel to turn it on.
        </p>
      ) : (
        <form action={action} className="stack" style={{ gap: 10 }}>
          <input type="hidden" name="client_id" value={clientId} />
          {style ? <input type="hidden" name="style" value={style} /> : null}
          <label className="field">
            <span>
              Your brief <span className="hint">(optional)</span>
            </span>
            <textarea
              className="ctl"
              name="brief"
              rows={2}
              placeholder={kind === "training" ? "e.g. 4-day upper/lower, glute focus, keep it under an hour" : "e.g. 300 kcal deficit, higher carbs on leg days"}
            />
          </label>
          <p className="muted small" style={{ margin: 0 }}>
            It saves as a new draft. {first} keeps seeing their current {kind === "training" ? "programme" : "plan"} until you check this one and make it live.
            {kind === "nutrition" ? " Sodium and water are left blank for you to set." : ""} The AI sees {first}&apos;s goal, stats, injuries and health notes, but not their name or contact details.
          </p>
          <Go label={kind === "training" ? "Draft a programme" : "Draft targets"} />
          {state?.error ? (
            <p className="alert error small" role="alert" style={{ margin: 0 }}>
              {state.error}
            </p>
          ) : null}
        </form>
      )}
    </details>
  );
}
