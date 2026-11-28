import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { ClientTabs } from "@/components/ClientTabs";
import { createNutritionPlan, replyEatingOut, setNutritionLive } from "@/app/actions/nutrition";
import { NUTRITION_STYLES } from "@/lib/options";
import { STYLES, addDays, dayLabel, energyText, pickDayType, showsKj, sum, todayIn, type DayType, type Food, type Style } from "@/lib/nutrition";
import { PlanBuilder } from "./PlanBuilder";
import { AiDraft } from "@/components/AiDraft";
import { aiEnabled } from "@/lib/ai";
import { CopiedNote, TemplateTools } from "@/components/TemplateTools";
import { templateChoices } from "@/lib/templates-server";

type DayRow = Omit<DayType, "meals"> & {
  id: string;
  position: number;
  plan_meals: { id: string; name: string; notes: string | null; position: number; plan_meal_items: { food_id: string; grams: number; position: number }[] }[];
};

const pct = (a: number, b: number | null) => (b ? Math.round((a / b) * 100) : null);

export default async function NutritionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ drafted?: string; copied?: string; missing?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile: me } = await requireCoach();
  const self = id === me.id;
  const { data: c } = await supabase.from("profiles").select("id, full_name, country, time_zone").eq("id", id).or(`role.eq.client,id.eq.${me.id}`).maybeSingle();
  if (!c) notFound();
  const first = (c.full_name ?? "").split(" ")[0] || "this client";
  const kj = showsKj(c.country);
  const today = todayIn(c.time_zone);
  const from = addDays(today, -6);

  const [{ data: intake }, { data: plan }, { data: foods }, { data: logs }, { data: dayRows }, { data: outs }, templates, { count: earlierLive }] = await Promise.all([
    supabase.from("client_intake").select("nutrition_style, dietary_needs").eq("client_id", id).maybeSingle(),
    supabase.from("nutrition_plans").select("*").eq("client_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("foods").select("*").or(`owner_id.is.null,owner_id.eq.${id}`).order("name"),
    supabase.from("food_logs").select("log_date, kcal, protein_g, carbs_g, fat_g, fibre_g, sodium_mg, eating_out").eq("client_id", id).gte("log_date", from).lte("log_date", today),
    supabase.from("nutrition_days").select("log_date, day_type_id, water_ml").eq("client_id", id).gte("log_date", from).lte("log_date", today),
    supabase.from("eating_out").select("*").eq("client_id", id).order("created_at", { ascending: false }).limit(5),
    templateChoices(supabase, "nutrition"),
    supabase.from("nutrition_plans").select("id", { count: "exact", head: true }).eq("client_id", id).eq("is_live", true),
  ]);

  const { data: days } = plan
    ? await supabase
        .from("day_types")
        .select("*, plan_meals(id, name, notes, position, plan_meal_items(food_id, grams, position))")
        .eq("plan_id", plan.id)
        .order("position")
    : { data: null };

  const dayTypes: DayType[] = ((days ?? []) as unknown as DayRow[]).map(({ plan_meals, position: _p, ...d }) => {
    void _p;
    return {
      ...d,
      meals: [...plan_meals]
        .sort((a, b) => a.position - b.position)
        .map((m) => ({
          id: m.id,
          name: m.name,
          notes: m.notes,
          items: [...m.plan_meal_items].sort((a, b) => a.position - b.position).map((it) => ({ food_id: it.food_id, grams: Number(it.grams) })),
        })),
    };
  });

  // Signed links for menu photos (valid for an hour).
  const paths = (outs ?? []).map((o) => o.photo_path).filter((p): p is string => !!p);
  const signed: Record<string, string> = {};
  if (paths.length) {
    const { data } = await supabase.storage.from("menu-photos").createSignedUrls(paths, 3600);
    data?.forEach((d) => {
      if (d.path && d.signedUrl) signed[d.path] = d.signedUrl;
    });
  }

  const week = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  const intakeStyle = NUTRITION_STYLES.find((s) => s.value === intake?.nutrition_style);
  const defaultStyle: Style = intake?.nutrition_style === "plan" ? "plan" : intake?.nutrition_style === "portions" ? "portions" : "macros";

  return (
    <>
      <Link href="/coach/clients" className="small">
        ← All clients
      </Link>
      <h1>{c.full_name || "Client"}</h1>
      <ClientTabs id={c.id} active="nutrition" self={self} />

      {intake ? (
        <p className="muted small" style={{ margin: 0 }}>
          At sign-up {first} asked for: <b>{intakeStyle?.label ?? "no preference"}</b>
          {intake.dietary_needs ? (
            <>
              {" "}
              · Dietary needs: <b>{intake.dietary_needs}</b>
            </>
          ) : null}
        </p>
      ) : null}

      {sp.drafted ? <p className="alert ok small" style={{ margin: 0 }}>AI draft ready below. Check the targets, set sodium and water if you use them, then make it live.</p> : null}
      <CopiedNote name={sp.copied} missing={sp.missing} what="nutrition plan" />
      <AiDraft kind="nutrition" clientId={c.id} first={first} style={(plan?.style as string | undefined) ?? defaultStyle} aiOn={aiEnabled()} />
      <TemplateTools kind="nutrition" clientId={c.id} planId={plan?.id ?? null} first={first} templates={templates} open={!plan && !!templates?.length} />

      {!plan ? (
        <div className="card">
          <h2>No nutrition plan yet</h2>
          <p className="muted" style={{ margin: 0 }}>
            Start one with a training day and a rest day. {first} won&apos;t see it until you make it live. They can still log food in the meantime.
          </p>
          <form action={createNutritionPlan} className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <input type="hidden" name="client_id" value={c.id} />
            <select name="style" className="ctl" defaultValue={defaultStyle} style={{ maxWidth: 260 }} aria-label="Plan style">
              {(Object.keys(STYLES) as Style[]).map((s) => (
                <option key={s} value={s}>
                  {STYLES[s].label}
                </option>
              ))}
            </select>
            <button className="btn primary">Start a nutrition plan</button>
          </form>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <span className="eyebrow">{plan.is_live ? `Live: ${first} can see this` : `Draft: ${first} can't see this yet`}</span>
                <h2>{STYLES[plan.style as Style].label}</h2>
                {!plan.is_live && earlierLive ? <p className="muted small" style={{ margin: "4px 0 0" }}>{first} keeps their earlier plan until you make this one live.</p> : null}
              </div>
              <form action={setNutritionLive}>
                <input type="hidden" name="plan_id" value={plan.id} />
                <input type="hidden" name="live" value={plan.is_live ? "false" : "true"} />
                <button className={`btn${plan.is_live ? "" : " primary"}`}>{plan.is_live ? "Hide from client" : `Make live for ${first}`}</button>
              </form>
            </div>
            <p className="muted small" style={{ margin: 0 }}>
              Sodium and water targets are yours to set. The app never suggests changes to them.
            </p>
          </div>
          <PlanBuilder
            key={plan.updated_at}
            planId={plan.id}
            initialStyle={plan.style as Style}
            initialNotes={plan.notes}
            initialDays={dayTypes}
            foods={(foods ?? []) as Food[]}
            clientFirst={first}
            country={c.country}
            kj={kj}
          />
        </>
      )}

      <div className="card">
        <h2>Eating out</h2>
        {!outs?.length ? (
          <p className="muted" style={{ margin: 0 }}>
            When {first} sends a menu photo, it shows here with what was left of their day.
          </p>
        ) : (
          outs.map((o) => {
            const r = o.remaining as { kcal?: number; protein_g?: number; carbs_g?: number; fat_g?: number };
            return (
              <div key={o.id} className="bx">
                <div className="bx-head">
                  <span className="muted small">
                    {new Date(o.created_at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: c.time_zone || "Europe/London" })}
                    {` (${first}'s time)`}
                  </span>
                  {o.coach_reply ? <span className="chip">Replied</span> : <span className="chip pink">Waiting for you</span>}
                </div>
                {r.kcal != null ? (
                  <span className="small">
                    Left for the day: <b>{energyText(r.kcal, kj)}</b> · P {r.protein_g ?? "?"} g · C {r.carbs_g ?? "?"} g · F {r.fat_g ?? "?"} g
                  </span>
                ) : null}
                {o.note ? <p className="small" style={{ margin: 0 }}>“{o.note}”</p> : null}
                {o.photo_path && signed[o.photo_path] ? (
                  <a href={signed[o.photo_path]} target="_blank" rel="noopener">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={signed[o.photo_path]} alt="Menu photo" className="menuimg" />
                  </a>
                ) : null}
                {o.coach_reply ? (
                  <p className="alert ok small" style={{ margin: 0 }}>
                    You said: {o.coach_reply}
                  </p>
                ) : (
                  <form action={replyEatingOut} className="stack" style={{ gap: 8 }}>
                    <input type="hidden" name="id" value={o.id} />
                    <textarea name="reply" className="ctl" rows={2} required placeholder="e.g. Go for the steak with salad, swap chips for extra veg, skip the sauce." />
                    <button className="btn primary" style={{ alignSelf: "flex-start" }}>
                      Send reply
                    </button>
                  </form>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="card">
        <h2>Last 7 days</h2>
        <div className="tbl-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Energy</th>
                <th>Protein</th>
                <th>Carbs</th>
                <th>Fat</th>
                <th>Sodium</th>
                <th>Water</th>
              </tr>
            </thead>
            <tbody>
              {week.map((dte) => {
                const rows = (logs ?? []).filter((l) => l.log_date === dte);
                const t = sum(rows);
                const nd = (dayRows ?? []).find((x) => x.log_date === dte);
                const dt = pickDayType(dayTypes, dte, nd?.day_type_id);
                const cell = (v: number, target: number | null | undefined, unit: string) => (
                  <td className="num">
                    {rows.length || unit === "L" ? `${v}${unit === "L" ? "" : ` ${unit}`}` : "–"}
                    {target && (rows.length || unit === "L") ? <span className="muted small"> / {target}{unit === "L" ? " L" : ""} ({pct(v, target)}%)</span> : null}
                  </td>
                );
                return (
                  <tr key={dte}>
                    <td>
                      {dayLabel(dte, today)}
                      {dt ? <div className="muted small">{dt.name}</div> : null}
                      {rows.some((r) => r.eating_out) ? <div className="muted small">Ate out</div> : null}
                    </td>
                    {cell(t.kcal, dt?.kcal, "kcal")}
                    {cell(t.protein_g, dt?.protein_g, "g")}
                    {cell(t.carbs_g, dt?.carbs_g, "g")}
                    {cell(t.fat_g, dt?.fat_g, "g")}
                    {cell(t.sodium_mg, dt?.sodium_mg, "mg")}
                    {cell((nd?.water_ml ?? 0) / 1000, dt?.water_ml ? dt.water_ml / 1000 : null, "L")}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
