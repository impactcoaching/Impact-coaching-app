import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { LibraryTabs } from "@/components/LibraryTabs";
import { deleteTemplate, duplicateTemplate } from "@/app/actions/templates";
import { kcalRange, nutritionBody, resolveFoods, type Template } from "@/lib/templates";
import { copyTargets } from "@/lib/templates-server";
import type { DayType, Food } from "@/lib/nutrition";
import { TemplateMeta } from "../../TemplateMeta";
import { CopyToClient } from "../../CopyToClient";
import { TemplatePlan } from "./TemplatePlan";

export default async function NutritionTemplatePage({ params, searchParams }: { params: Promise<{ tid: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { tid } = await params;
  const sp = await searchParams;
  const { supabase, profile: me } = await requireCoach();
  const { data: t } = await supabase.from("templates").select("*").eq("id", tid).eq("kind", "nutrition").maybeSingle<Template>();
  if (!t) notFound();
  // Shared foods only: a client's own foods stay with that client.
  const [{ data: foods }, clients] = await Promise.all([supabase.from("foods").select("*").is("owner_id", null).order("name"), copyTargets(supabase, me)]);
  const body = nutritionBody(t.body);
  // Seed SQL can name foods rather than give ids: match them to the food library here.
  const { day_types, missing } = resolveFoods(body, (foods ?? []) as Food[]);
  const days: DayType[] = day_types.map((d) => ({ ...d, meals: d.meals.map((m) => ({ name: m.name, notes: m.notes, items: m.items.map((i) => ({ food_id: i.food_id, grams: i.grams })) })) }));
  const range = kcalRange(body);

  return (
    <>
      <Link href="/coach/library/nutrition" className="small">
        ← All nutrition plans
      </Link>
      <h1>
        {t.name}
        <span>Nutrition template{range ? ` · ${range}` : ""}</span>
      </h1>
      <LibraryTabs active="nutrition" />
      {sp.saved ? (
        <p className="alert ok small" role="status" style={{ margin: 0 }}>
          Saved as a template. Give it a name and tags so it&apos;s easy to find. The client&apos;s own plan hasn&apos;t changed.
        </p>
      ) : null}
      {missing.length ? (
        <p className="alert error small" role="alert" style={{ margin: 0 }}>
          Not in your food library, so left out: {missing.join(", ")}. Add them as foods (same name), or pick another food here.
        </p>
      ) : null}

      <div className="card">
        <span className="eyebrow">Copy onto a client</span>
        <CopyToClient kind="nutrition" templateId={t.id} clients={clients} />
      </div>

      <TemplateMeta t={t} notes={null} />

      <TemplatePlan templateId={t.id} style={body.style} notes={body.notes} days={days} foods={(foods ?? []) as Food[]} />
      <p className="muted small" style={{ margin: 0 }}>
        Energy shows in kcal here. Clients in countries that use kJ see both once it&apos;s copied onto them.
      </p>

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
