"use client";

import { useMemo, useState, useTransition } from "react";
import { saveNutritionPlan } from "@/app/actions/nutrition";
import { FoodPicker } from "@/components/FoodPicker";
import {
  PORTIONS,
  STYLES,
  WEEKDAYS,
  blankDayType,
  energyText,
  forGrams,
  kcalFromMacros,
  sum,
  type DayType,
  type Food,
  type Style,
} from "@/lib/nutrition";

const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const intOrNull = (v: string) => {
  const n = num(v);
  return n == null || Number.isNaN(n) ? null : Math.round(n);
};

export function PlanBuilder({
  planId,
  initialStyle,
  initialNotes,
  initialDays,
  foods: initialFoods,
  clientFirst,
  country,
  kj,
  onSave,
}: {
  planId?: string;
  /** Saves the plan. Defaults to the client's plan; templates pass their own. */
  onSave?: (plan: Omit<Parameters<typeof saveNutritionPlan>[0], "planId">) => Promise<{ error?: string }>;
  initialStyle: Style;
  initialNotes: string | null;
  initialDays: DayType[];
  foods: Food[];
  clientFirst: string;
  country: string | null;
  kj: boolean;
}) {
  const [style, setStyle] = useState<Style>(initialStyle);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [days, setDays] = useState<DayType[]>(initialDays.length ? initialDays : [blankDayType("Every day", [1, 2, 3, 4, 5, 6, 7])]);
  const [active, setActive] = useState(0);
  const [foods, setFoods] = useState(initialFoods);
  const [picker, setPicker] = useState<number | null>(null); // meal index
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [saving, start] = useTransition();

  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const d = days[Math.min(active, days.length - 1)];

  function patch(p: Partial<DayType>) {
    setDays((cur) => cur.map((x, i) => (i === active ? { ...x, ...p } : x)));
    setDirty(true);
    setMsg(null);
  }
  function toggleDay(n: number) {
    // A weekday belongs to one day type only.
    setDays((cur) =>
      cur.map((x, i) =>
        i === active ? { ...x, weekdays: x.weekdays.includes(n) ? x.weekdays.filter((w) => w !== n) : [...x.weekdays, n].sort() } : { ...x, weekdays: x.weekdays.filter((w) => w !== n) },
      ),
    );
    setDirty(true);
  }
  function addDay(copy: boolean) {
    if (days.length >= 7) return;
    const base = copy ? { ...d, id: undefined, name: `${d.name} copy`, weekdays: [], meals: d.meals.map((m) => ({ ...m, id: undefined, items: [...m.items] })) } : blankDayType(`Day ${days.length + 1}`);
    setDays((cur) => [...cur, base]);
    setActive(days.length);
    setDirty(true);
  }
  function removeDay() {
    if (days.length <= 1) return;
    setDays((cur) => cur.filter((_, i) => i !== active));
    setActive(0);
    setDirty(true);
  }
  const setMeals = (meals: DayType["meals"]) => patch({ meals });

  const macroKcal = kcalFromMacros(d.protein_g, d.carbs_g, d.fat_g);
  const kcalGap = d.kcal && macroKcal ? Math.abs(macroKcal - d.kcal) / d.kcal : 0;
  const planTotals = sum(d.meals.flatMap((m) => m.items.map((it) => (byId.get(it.food_id) ? forGrams(byId.get(it.food_id)!, it.grams) : {}))));

  function save() {
    start(async () => {
      const plan = {
        style,
        notes: notes.trim() || null,
        dayTypes: days.map((x) => ({ ...x, notes: x.notes?.trim() || null, meals: x.meals.map((m) => ({ name: m.name, notes: m.notes, items: m.items })) })),
      };
      const r = onSave ? await onSave(plan) : await saveNutritionPlan({ ...plan, planId: planId ?? "" });
      if (r.error) setMsg({ error: r.error });
      else {
        setMsg({ ok: "Saved." });
        setDirty(false);
      }
    });
  }

  const field = (label: string, key: keyof DayType, unit?: string, hint?: string) => (
    <label>
      {label}
      {unit ? ` (${unit})` : ""}
      <input
        className="ctl num"
        inputMode="numeric"
        value={(d[key] as number | null) ?? ""}
        placeholder={hint}
        onChange={(e) => patch({ [key]: key === "palms" || key === "fists" || key === "cupped" || key === "thumbs" ? num(e.target.value) : intOrNull(e.target.value) } as Partial<DayType>)}
      />
    </label>
  );

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <h2>The plan</h2>
        <button className="btn primary" onClick={save} disabled={saving || !dirty}>
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </button>
      </div>
      {msg?.error ? <p className="alert error">{msg.error}</p> : null}

      <div className="choices" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {(Object.keys(STYLES) as Style[]).map((s) => (
          <label key={s} className="choice">
            <input
              type="radio"
              checked={style === s}
              onChange={() => {
                setStyle(s);
                setDirty(true);
              }}
            />
            <span>
              <b>{STYLES[s].label}</b>
              <br />
              <span className="muted small">{STYLES[s].sub}</span>
            </span>
          </label>
        ))}
      </div>

      <label className="field">
        <span>
          Notes for {clientFirst} <span className="hint">(optional)</span>
        </span>
        <textarea className="ctl" rows={2} value={notes} placeholder="e.g. Hit protein first. Keep veg high on rest days." onChange={(e) => (setNotes(e.target.value), setDirty(true))} />
      </label>

      <div className="wtabs">
        {days.map((x, i) => (
          <a key={i} href="#" aria-current={i === active ? "page" : undefined} onClick={(e) => (e.preventDefault(), setActive(i))}>
            {x.name || "Untitled"}
          </a>
        ))}
        {days.length < 7 ? (
          <>
            <button className="link" onClick={() => addDay(false)}>
              + Day type
            </button>
            <button className="link" onClick={() => addDay(true)}>
              Copy this one
            </button>
          </>
        ) : null}
      </div>

      <div className="bx">
        <div className="bx-head">
          <label className="field" style={{ flex: 1, minWidth: 200 }}>
            <span>Day type name</span>
            <input className="ctl" value={d.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Training day" />
          </label>
          {days.length > 1 ? (
            <button className="link small" style={{ color: "var(--muted)" }} onClick={removeDay}>
              Remove this day type
            </button>
          ) : null}
        </div>
        <div>
          <span className="muted small">Used on</span>
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {WEEKDAYS.map((w, i) => (
              <button key={w} className={`mini${d.weekdays.includes(i + 1) ? " done" : ""}`} aria-pressed={d.weekdays.includes(i + 1)} onClick={() => toggleDay(i + 1)}>
                {w}
              </button>
            ))}
          </div>
          <span className="muted small">{clientFirst} can switch the day type in their diary if their week changes.</span>
        </div>

        <div className="bx-grid">
          {field("Calories", "kcal", "kcal")}
          {field("Protein", "protein_g", "g")}
          {field("Carbs", "carbs_g", "g")}
          {field("Fat", "fat_g", "g")}
          {field("Fibre", "fibre_g", "g")}
          {field("Sodium", "sodium_mg", "mg")}
          <label>
            Water (litres)
            <input
              className="ctl num"
              inputMode="decimal"
              value={d.water_ml != null ? d.water_ml / 1000 : ""}
              onChange={(e) => {
                const l = num(e.target.value);
                patch({ water_ml: l == null || Number.isNaN(l) ? null : Math.round(l * 1000) });
              }}
            />
          </label>
        </div>
        {macroKcal ? (
          <span className={kcalGap > 0.05 ? "warnline" : "muted small"}>
            Macros add up to {energyText(macroKcal, kj)}.
            {kcalGap > 0.05 ? (
              <>
                {" "}
                That&apos;s {Math.round(kcalGap * 100)}% off the calorie target.{" "}
                <button className="link small" onClick={() => patch({ kcal: macroKcal })}>
                  Use {macroKcal}
                </button>
              </>
            ) : null}
          </span>
        ) : null}
        {kj && d.kcal ? <span className="muted small">{clientFirst} sees this as {energyText(d.kcal, true)}.</span> : null}

        {style === "portions" ? (
          <>
            <span className="eyebrow">Hand portions per day</span>
            <div className="bx-grid">
              {PORTIONS.map((p) => (
                <span key={p.key}>{field(`${p.icon} ${p.label} (${p.what})`, p.key)}</span>
              ))}
            </div>
          </>
        ) : null}

        <label className="field">
          <span>
            Notes for this day <span className="hint">(optional)</span>
          </span>
          <input className="ctl" value={d.notes ?? ""} onChange={(e) => patch({ notes: e.target.value || null })} />
        </label>
      </div>

      {style === "plan" ? (
        <div className="stack" style={{ gap: 12 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>Meals for {d.name || "this day"}</h2>
            <span className="muted small">
              {energyText(planTotals.kcal, kj)} · P {planTotals.protein_g} · C {planTotals.carbs_g} · F {planTotals.fat_g} · sodium {planTotals.sodium_mg} mg
            </span>
          </div>
          {d.kcal ? (
            <span className={Math.abs(planTotals.kcal - d.kcal) > d.kcal * 0.05 ? "warnline" : "muted small"}>
              The meals come to {Math.round(planTotals.kcal)} of {d.kcal} kcal
              {d.protein_g ? `, ${planTotals.protein_g} of ${d.protein_g} g protein` : ""}.
            </span>
          ) : null}
          {d.meals.map((m, mi) => {
            const t = sum(m.items.map((it) => (byId.get(it.food_id) ? forGrams(byId.get(it.food_id)!, it.grams) : {})));
            return (
              <div key={mi} className="bx">
                <div className="bx-head">
                  <input
                    className="ctl"
                    style={{ flex: 1, minWidth: 160 }}
                    value={m.name}
                    onChange={(e) => setMeals(d.meals.map((x, j) => (j === mi ? { ...x, name: e.target.value } : x)))}
                    aria-label="Meal name"
                  />
                  <span className="muted small">
                    {energyText(t.kcal, kj)} · P {t.protein_g} · C {t.carbs_g} · F {t.fat_g}
                  </span>
                  <button className="iconbtn" aria-label="Remove meal" onClick={() => setMeals(d.meals.filter((_, j) => j !== mi))}>
                    ✕
                  </button>
                </div>
                {m.items.map((it, ii) => {
                  const f = byId.get(it.food_id);
                  return (
                    <div key={ii} className="frow">
                      <span>
                        <b>{f ? f.name : "Food"}</b>
                        {f?.brand ? <span className="muted small"> · {f.brand}</span> : null}
                      </span>
                      <input
                        className="ctl num"
                        inputMode="decimal"
                        aria-label="Grams"
                        value={it.grams}
                        onChange={(e) =>
                          setMeals(d.meals.map((x, j) => (j === mi ? { ...x, items: x.items.map((y, k) => (k === ii ? { ...y, grams: num(e.target.value) ?? 0 } : y)) } : x)))
                        }
                      />
                      <span className="muted small">g</span>
                      <button className="iconbtn" aria-label="Remove food" onClick={() => setMeals(d.meals.map((x, j) => (j === mi ? { ...x, items: x.items.filter((_, k) => k !== ii) } : x)))}>
                        ✕
                      </button>
                    </div>
                  );
                })}
                <button className="link small" style={{ alignSelf: "flex-start" }} onClick={() => setPicker(mi)}>
                  + Add food
                </button>
              </div>
            );
          })}
          {d.meals.length < 10 ? (
            <button className="btn" onClick={() => setMeals([...d.meals, { name: `Meal ${d.meals.length + 1}`, notes: null, items: [] }])}>
              + Add a meal
            </button>
          ) : null}
          <span className="muted small">{clientFirst} can swap any food for another and the app works out the grams to match its protein, carbs or fat.</span>
        </div>
      ) : null}

      {msg?.ok && !dirty ? <p className="alert ok small">{msg.ok}</p> : null}

      {picker !== null ? (
        <FoodPicker
          title="Add food to the meal"
          foods={foods}
          country={country}
          kj={kj}
          onSaved={(f) => setFoods((cur) => (cur.some((x) => x.id === f.id) ? cur : [...cur, f]))}
          onClose={() => setPicker(null)}
          onPick={(f, g) => {
            setFoods((cur) => (cur.some((x) => x.id === f.id) ? cur : [...cur, f]));
            setMeals(d.meals.map((x, j) => (j === picker ? { ...x, items: [...x.items, { food_id: f.id, grams: g }] } : x)));
            setPicker(null);
          }}
        />
      ) : null}
    </div>
  );
}
