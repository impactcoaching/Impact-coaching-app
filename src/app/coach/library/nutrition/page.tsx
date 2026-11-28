import { requireCoach } from "@/lib/auth";
import { LibraryTabs } from "@/components/LibraryTabs";
import { createTemplate } from "@/app/actions/templates";
import { templateCards } from "@/lib/templates-server";
import { TemplateList } from "../TemplateList";

export default async function Page({ searchParams }: { searchParams: Promise<{ deleted?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireCoach();
  const { cards, ready } = await templateCards(supabase, "nutrition");
  return (
    <>
      <span className="eyebrow">Library</span>
      <h1>
        Nutrition plans
        <span>ready to copy</span>
      </h1>
      <LibraryTabs active="nutrition" />
      {sp.deleted ? <p className="alert ok small" role="status" style={{ margin: 0 }}>Template deleted. Clients you copied it onto keep their own copy.</p> : null}
      {sp.error ? <p className="alert error small" role="alert" style={{ margin: 0 }}>{sp.error}</p> : null}
      {!ready ? (
        <div className="card">
          <h2>One quick database update first</h2>
          <p className="muted" style={{ margin: 0 }}>
            Run <b>0017_templates.sql</b> in the Supabase SQL Editor, then refresh this page.
          </p>
        </div>
      ) : (
        <>
          <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <p className="muted small" style={{ margin: 0, flex: 1, minWidth: 220 }}>
              Copy one onto a client in one tap, then tweak it for them. Changing a template never changes a client&apos;s plan.
            </p>
            <form action={createTemplate}>
              <input type="hidden" name="kind" value="nutrition" />
              <button className="btn primary">+ New nutrition template</button>
            </form>
          </div>
          <TemplateList kind="nutrition" items={cards} />
        </>
      )}
    </>
  );
}
