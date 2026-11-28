import Link from "next/link";
import { saveAsTemplate } from "@/app/actions/templates";
import { CopyToClient } from "@/app/coach/library/CopyToClient";

/** On a client's Training or Nutrition tab: copy a template on, or save theirs as a template. */
export function TemplateTools({
  kind,
  clientId,
  planId,
  first,
  templates,
  open,
}: {
  kind: "training" | "nutrition";
  clientId: string;
  planId: string | null;
  first: string;
  templates: { id: string; label: string; cardio?: boolean }[] | null;
  open?: boolean;
}) {
  const what = kind === "training" ? "programme" : "nutrition plan";
  const lib = `/coach/library/${kind === "training" ? "programmes" : "nutrition"}`;
  return (
    <details className="card ttools" open={open}>
      <summary>
        <b>Templates</b> <span className="muted small">Copy one on, or save this {what} as a template</span>
      </summary>
      <div className="stack" style={{ gap: 14, marginTop: 12 }}>
        {templates === null ? (
          <p className="muted small" style={{ margin: 0 }}>
            Templates need a quick database update first: run 0017_templates.sql in Supabase.
          </p>
        ) : templates.length ? (
          <CopyToClient kind={kind} clientId={clientId} templates={templates} hasCurrent={!!planId} first={first} />
        ) : (
          <p className="muted small" style={{ margin: 0 }}>
            No {what} templates yet. <Link href={lib}>Make one in the Library</Link>, or save this one.
          </p>
        )}
        {planId && templates !== null ? (
          <form action={saveAsTemplate} className="stack" style={{ gap: 8, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="client_id" value={clientId} />
            <input type="hidden" name="plan_id" value={planId} />
            {kind === "training" ? (
              <label className="check small">
                <input type="checkbox" name="with_cardio" defaultChecked />
                Include {first}&apos;s cardio
              </label>
            ) : null}
            <button className="btn" style={{ alignSelf: "flex-start" }}>
              Save this {what} as a template
            </button>
            <span className="muted small">Makes a copy in the Library. {first}&apos;s own {what} doesn&apos;t change.</span>
          </form>
        ) : null}
      </div>
    </details>
  );
}

/** The note after copying a template onto a client. */
export function CopiedNote({ name, missing, cardio, what }: { name?: string; missing?: string; cardio?: string; what: string }) {
  if (!name) return null;
  return (
    <>
      <p className="alert ok small" role="status" style={{ margin: 0 }}>
        Copied &quot;{name}&quot; as a draft {what}. Tweak it, then make it live when you&apos;re happy.
        {cardio ? " The cardio has been updated on the Cardio tab." : ""}
      </p>
      {missing ? (
        <p className="alert error small" role="alert" style={{ margin: 0 }}>
          Left out because they aren&apos;t in the library: {missing}.
        </p>
      ) : null}
    </>
  );
}
