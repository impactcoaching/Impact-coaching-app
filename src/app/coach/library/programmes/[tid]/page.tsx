import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { LibraryTabs } from "@/components/LibraryTabs";
import { addTemplateSession, deleteTemplate, deleteTemplateSession, duplicateTemplate } from "@/app/actions/templates";
import { daysPerWeek, resolveExercises, trainingBody, type Template } from "@/lib/templates";
import { copyTargets } from "@/lib/templates-server";
import { WEEKDAYS } from "@/lib/cardio";
import type { Exercise, PlanExercise } from "@/lib/training";
import { TemplateMeta } from "../../TemplateMeta";
import { CopyToClient } from "../../CopyToClient";
import { TemplateSession } from "./TemplateSession";
import { CardioEditor } from "@/app/coach/clients/[id]/cardio/CardioEditor";

export default async function ProgrammeTemplatePage({ params, searchParams }: { params: Promise<{ tid: string }>; searchParams: Promise<{ w?: string; saved?: string }> }) {
  const { tid } = await params;
  const sp = await searchParams;
  const { supabase, profile: me } = await requireCoach();
  const { data: t } = await supabase.from("templates").select("*").eq("id", tid).eq("kind", "training").maybeSingle<Template>();
  if (!t) notFound();
  const [{ data: library }, clients] = await Promise.all([
    supabase.from("exercises").select("id, name, muscle, equipment, demo_url, cues").order("muscle").order("name"),
    copyTargets(supabase, me),
  ]);
  const body = trainingBody(t.body);
  // Seed SQL can name exercises rather than give ids: match them to the library here.
  const { workouts, missing } = resolveExercises(body, (library ?? []) as Exercise[]);
  const index = Math.min(Math.max(0, Number(sp.w) || 0), workouts.length - 1);
  const current = workouts[index];
  const week = WEEKDAYS.map((_, i) => workouts.filter((w) => w.weekdays.includes(i + 1)).map((w) => w.name));
  const anyDays = week.some((d) => d.length);
  const allSet = workouts.every((w) => w.weekdays.length);
  const days = daysPerWeek(body);

  return (
    <>
      <Link href="/coach/library/programmes" className="small">
        ← All programmes
      </Link>
      <h1>
        {t.name}
        <span>Programme template</span>
      </h1>
      <LibraryTabs active="programmes" />
      {sp.saved ? (
        <p className="alert ok small" role="status" style={{ margin: 0 }}>
          Saved as a template. Give it a name and tags so it&apos;s easy to find. The client&apos;s own programme hasn&apos;t changed.
        </p>
      ) : null}
      {missing.length ? (
        <p className="alert error small" role="alert" style={{ margin: 0 }}>
          Not in your exercise library, so left out: {missing.join(", ")}. Add them in Library, Exercises (same name), or swap them here.
        </p>
      ) : null}

      <div className="card">
        <span className="eyebrow">Copy onto a client</span>
        <CopyToClient kind="training" templateId={t.id} clients={clients} hasCardio={!!body.cardio} />
      </div>

      <TemplateMeta t={t} notes={body.notes} />

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Sessions</h2>
          <span className="muted small">
            {days} {days === 1 ? "day" : "days"} a week
          </span>
        </div>
        <div className="wtabs">
          {workouts.map((w, i) => (
            <Link key={i} href={`?w=${i}`} aria-current={i === index ? "page" : undefined}>
              {w.name}
            </Link>
          ))}
          {workouts.length < 14 ? (
            <form action={addTemplateSession}>
              <input type="hidden" name="template_id" value={t.id} />
              <button className="link">+ Add a session</button>
            </form>
          ) : null}
        </div>
        {anyDays ? (
          <div className="week-plan" aria-label="The week">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={week[i].length ? "on" : undefined}>
                <b>{d}</b>
                <span>{week[i].length ? week[i].join(", ") : allSet ? "Rest" : "–"}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {current ? (
        <>
          <TemplateSession
            key={index}
            templateId={t.id}
            index={index}
            name={current.name}
            weekdays={current.weekdays}
            exercises={current.exercises as PlanExercise[]}
            library={(library ?? []) as Exercise[]}
          />
          {workouts.length > 1 ? (
            <form action={deleteTemplateSession}>
              <input type="hidden" name="template_id" value={t.id} />
              <input type="hidden" name="index" value={index} />
              <button className="link small" style={{ color: "var(--muted)" }}>
                Delete this session
              </button>
            </form>
          ) : null}
        </>
      ) : null}

      <h2 style={{ marginBottom: 0 }}>Cardio with this programme</h2>
      <p className="muted small" style={{ margin: 0 }}>
        Optional. Leave minutes empty and no sessions for none.
      </p>
      <CardioEditor
        templateId={t.id}
        first="the client"
        plan={body.cardio}
        sessions={(body.cardio?.sessions ?? []).map((s, i) => ({ ...s, id: `t${i}`, position: i }))}
      />

      <div className="tactions">
        <form action={duplicateTemplate}>
          <input type="hidden" name="template_id" value={t.id} />
          <button className="btn">Duplicate template</button>
        </form>
        <details className="danger-zone">
          <summary>Delete template</summary>
          <form action={deleteTemplate} style={{ marginTop: 8 }}>
            <input type="hidden" name="template_id" value={t.id} />
            <button className="btn">Yes, delete it</button>
            <p className="muted small">Clients you copied it onto keep their own copy.</p>
          </form>
        </details>
      </div>
    </>
  );
}
