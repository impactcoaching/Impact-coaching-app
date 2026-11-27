"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { deleteFoodLog, logFoods, saveDay, sendEatingOut } from "@/app/actions/nutrition";
import { logRestaurantEstimate, suggestFromMenu, type MenuPick } from "@/app/actions/ai";
import { FoodPicker } from "@/components/FoodPicker";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_MEALS,
  PORTIONS,
  addDays,
  dayLabel,
  energyText,
  forGrams,
  sum,
  swapGrams,
  type DayType,
  type Food,
  type PortionKey,
  type Style,
  type Totals,
} from "@/lib/nutrition";

export type LogRow = Totals & { id: string; meal: string; name: string; grams: number | null; eating_out: boolean };
type Out = { id: string; note: string | null; coach_reply: string | null; replied_at: string | null; created_at: string };

const EATING_OUT = "Eating out";

function Bar({ label, value, target, unit, note }: { label: string; value: number; target: number | null; unit: string; note?: string }) {
  const p = target ? Math.min(100, (value / target) * 100) : 0;
  const over = !!target && value > target * 1.05;
  return (
    <div className="mbar">
      <div className="mbar-top">
        <span>
          {label}
          {note ? <span className="muted"> · {note}</span> : null}
        </span>
        <span className="num">
          <b>{Math.round(value)}</b>
          {target ? ` / ${target}` : ""} {unit}
        </span>
      </div>
      {target ? (
        <div className={`mbar-track${over ? " over" : ""}`}>
          <i style={{ width: `${p}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export function Diary({
  userId,
  date,
  today,
  country,
  kj,
  style,
  planNotes,
  dayTypes,
  current,
  logs,
  water: initialWater,
  portions: initialPortions,
  foods: initialFoods,
  recent,
  outs,
  aiOn,
  trial = false,
}: {
  userId: string;
  date: string;
  today: string;
  country: string | null;
  kj: boolean;
  style: Style | null;
  planNotes: string | null;
  dayTypes: DayType[];
  current: DayType | null;
  logs: LogRow[];
  water: number;
  portions: Record<string, number>;
  foods: Food[];
  recent: Food[];
  outs: Out[];
  aiOn: boolean;
  trial?: boolean;
}) {
  const [foods, setFoods] = useState(initialFoods);
  const [water, setWater] = useState(initialWater);
  const [portions, setPortions] = useState(initialPortions);
  const [picker, setPicker] = useState<{ meal: string; eatingOut?: boolean } | null>(null);
  const [swap, setSwap] = useState<{ meal: number; item: number } | null>(null);
  const [swaps, setSwaps] = useState<Record<string, { food_id: string; grams: number }>>({});
  const [outPanel, setOutPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const totals = sum(logs);
  const t = current;
  const left = t?.kcal ? t.kcal - totals.kcal : null;
  const sections = style === "plan" && t?.meals.length ? t.meals.map((m) => m.name) : DEFAULT_MEALS;
  const extra = [...new Set(logs.map((l) => l.meal))].filter((m) => !sections.includes(m));

  function run(fn: () => Promise<{ error?: string } | void>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r && r.error) setError(r.error);
    });
  }
  const remember = (f: Food) => setFoods((cur) => (cur.some((x) => x.id === f.id) ? cur : [...cur, f]));

  function addWater(ml: number) {
    const next = Math.max(0, water + ml);
    setWater(next);
    run(() => saveDay({ date, water_ml: next }));
  }
  function bump(k: PortionKey, d: number) {
    const next = { ...portions, [k]: Math.max(0, (portions[k] ?? 0) + d) };
    setPortions(next);
    run(() => saveDay({ date, portions: next }));
  }

  const itemFor = (mi: number, ii: number) => {
    const base = t!.meals[mi].items[ii];
    return swaps[`${mi}:${ii}`] ?? base;
  };
  const loggedMeal = (name: string) => logs.some((l) => l.meal === name);

  return (
    <>
      <span className="eyebrow">Nutrition</span>
      <h1>
        Food<span>{dayLabel(date, today)}</span>
      </h1>

      <div className="daybar" data-tour="daybar">
        <Link className="iconbtn" href={`/app/food?d=${addDays(date, -1)}`} aria-label="Previous day">
          ‹
        </Link>
        <span>{dayLabel(date, today)}</span>
        {date < today ? (
          <Link className="iconbtn" href={`/app/food?d=${addDays(date, 1)}`} aria-label="Next day">
            ›
          </Link>
        ) : (
          <span className="iconbtn" aria-hidden style={{ opacity: 0.3 }}>
            ›
          </span>
        )}
      </div>

      {outs.filter((o) => o.coach_reply).slice(0, 1).map((o) => (
        <p key={o.id} className="alert ok">
          <b>Adam on eating out:</b> {o.coach_reply}
        </p>
      ))}

      {!style && trial ? (
        <Link href="/app/join-coaching" className="card locked">
          <span className="eyebrow">Comes with coaching</span>
          <b>Calorie and macro targets</b>
          <span className="muted small">
            I set your targets from your answers, your training and how your body responds, then adjust them each week. A calculator can&apos;t do that bit, so I&apos;d rather not guess. Keep logging for now, it all carries over if you join.
          </span>
        </Link>
      ) : !style ? (
        <p className="alert">Adam is putting your nutrition plan together. You can log food in the meantime.</p>
      ) : planNotes ? (
        <p className="alert">{planNotes}</p>
      ) : null}

      <div className="card" data-tour="targets">
        {dayTypes.length > 1 ? (
          <label className="field">
            <span>Today is a</span>
            <select className="ctl" value={t?.id ?? ""} onChange={(e) => run(() => saveDay({ date, day_type_id: e.target.value || null }))}>
              {dayTypes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        ) : t ? (
          <span className="eyebrow">{t.name}</span>
        ) : null}

        <div className="kleft">
          <b>{left != null ? Math.abs(Math.round(left)).toLocaleString("en-GB") : Math.round(totals.kcal).toLocaleString("en-GB")}</b>
          <span>{left != null ? (left >= 0 ? "kcal left" : "kcal over") : "kcal so far"}</span>
          {kj ? <span className="muted small">{left != null ? `${Math.abs(Math.round(left * 4.184)).toLocaleString("en-GB")} kJ` : `${Math.round(totals.kcal * 4.184)} kJ`}</span> : null}
        </div>
        <Bar label="Energy" value={totals.kcal} target={t?.kcal ?? null} unit="kcal" />
        <Bar label="Protein" value={totals.protein_g} target={t?.protein_g ?? null} unit="g" />
        <Bar label="Carbs" value={totals.carbs_g} target={t?.carbs_g ?? null} unit="g" />
        <Bar label="Fat" value={totals.fat_g} target={t?.fat_g ?? null} unit="g" />
        {t?.fibre_g ? <Bar label="Fibre" value={totals.fibre_g} target={t.fibre_g} unit="g" /> : null}
        {t?.sodium_mg ? <Bar label="Sodium" value={totals.sodium_mg} target={t.sodium_mg} unit="mg" note="set by Adam" /> : null}
        {t?.notes ? <p className="muted small" style={{ margin: 0 }}>{t.notes}</p> : null}
      </div>

      <div className="card" data-tour="water">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Water</h2>
          <span className="num">
            <b>{(water / 1000).toFixed(2).replace(/0$/, "")} L</b>
            {t?.water_ml ? ` / ${t.water_ml / 1000} L` : ""}
          </span>
        </div>
        {t?.water_ml ? (
          <div className="mbar-track">
            <i style={{ width: `${Math.min(100, (water / t.water_ml) * 100)}%` }} />
          </div>
        ) : null}
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="mini" onClick={() => addWater(-250)} disabled={water <= 0}>
            − 250 ml
          </button>
          <button className="mini pink" onClick={() => addWater(250)}>
            + 250 ml
          </button>
          <button className="mini pink" onClick={() => addWater(500)}>
            + 500 ml
          </button>
          <button className="mini pink" onClick={() => addWater(750)}>
            + 750 ml
          </button>
        </div>
      </div>

      {style === "portions" && t ? (
        <div className="card" data-tour="portions">
          <h2>Hand portions</h2>
          {PORTIONS.map((p) => {
            const target = t[p.key];
            const done = portions[p.key] ?? 0;
            return (
              <div key={p.key} className="prow">
                <span>
                  <span aria-hidden>{p.icon}</span> <b>{p.label}</b> <span className="muted small">{p.what}</span>
                </span>
                <span className="row" style={{ gap: 6 }}>
                  <button className="iconbtn" onClick={() => bump(p.key, -1)} disabled={!done} aria-label={`One less ${p.label}`}>
                    −
                  </button>
                  <span className="num" style={{ minWidth: 54, textAlign: "center" }}>
                    <b>{done}</b>
                    {target ? ` / ${target}` : ""}
                  </span>
                  <button className="iconbtn" onClick={() => bump(p.key, 1)} aria-label={`One more ${p.label}`}>
                    +
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {style === "plan" && t?.meals.length ? (
        <div className="card" data-tour="meals">
          <h2>Your meals</h2>
          {t.meals.map((m, mi) => {
            const items = m.items.map((_, ii) => itemFor(mi, ii));
            const mt = sum(items.map((it) => (byId.get(it.food_id) ? forGrams(byId.get(it.food_id)!, it.grams) : {})));
            const done = loggedMeal(m.name);
            return (
              <div key={mi} className="bx">
                <div className="bx-head">
                  <div>
                    <b>{m.name}</b>
                    <div className="muted small">
                      {energyText(mt.kcal, kj)} · P {mt.protein_g} · C {mt.carbs_g} · F {mt.fat_g}
                    </div>
                  </div>
                  <button
                    className={`mini ${done ? "done" : "pink"}`}
                    data-tour="ate-this"
                    disabled={busy || done || !items.length}
                    onClick={() => run(() => logFoods({ date, meal: m.name, entries: items.map((it) => ({ food_id: it.food_id, grams: it.grams })) }))}
                  >
                    {done ? "Logged ✓" : "Ate this"}
                  </button>
                </div>
                {m.notes ? <span className="muted small">{m.notes}</span> : null}
                {items.map((it, ii) => {
                  const f = byId.get(it.food_id);
                  const swapped = !!swaps[`${mi}:${ii}`];
                  return (
                    <div key={ii} className="frow">
                      <span>
                        {f?.name ?? "Food"}
                        {swapped ? <span className="chip pink" style={{ marginLeft: 6 }}>swapped</span> : null}
                      </span>
                      <span className="num muted small">{Math.round(it.grams)} g</span>
                      <button className="mini" data-tour="swap" onClick={() => setSwap({ meal: mi, item: ii })} disabled={done}>
                        Swap
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
          <span className="muted small">Ate something different? Add it below instead.</span>
        </div>
      ) : null}

      <div className="card" data-tour="diary">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Diary</h2>
          <button className="mini pink" data-tour="eat-out" onClick={() => setOutPanel(true)}>
            🍽 Eating out?
          </button>
        </div>
        {[...sections, ...extra].map((meal) => {
          const rows = logs.filter((l) => l.meal === meal);
          const mt = sum(rows);
          return (
            <div key={meal} className="dsec">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <b>{meal}</b>
                <span className="muted small">{rows.length ? energyText(mt.kcal, kj) : ""}</span>
              </div>
              {rows.map((l) => (
                <div key={l.id} className="frow">
                  <span>
                    {l.name}
                    <span className="muted small">
                      {" "}
                      {l.grams != null ? `${Math.round(Number(l.grams))} g · ` : ""}P {Number(l.protein_g)} · C {Number(l.carbs_g)} · F {Number(l.fat_g)}
                    </span>
                  </span>
                  <span className="num small">{Math.round(Number(l.kcal))}</span>
                  <button className="iconbtn" aria-label={`Remove ${l.name}`} onClick={() => run(() => deleteFoodLog(l.id))} disabled={busy}>
                    ✕
                  </button>
                </div>
              ))}
              <button className="link small" data-tour="add-food" style={{ alignSelf: "flex-start" }} onClick={() => setPicker({ meal })}>
                + Add food
              </button>
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="alert error" role="alert">
          {error}
        </p>
      ) : null}

      {picker ? (
        <FoodPicker
          title={`Add to ${picker.meal}`}
          foods={foods}
          recent={recent}
          country={country}
          kj={kj}
          onSaved={remember}
          onClose={() => setPicker(null)}
          onPick={async (f, g) => {
            remember(f);
            const r = await logFoods({ date, meal: picker.meal, eatingOut: !!picker.eatingOut, entries: [{ food_id: f.id, grams: g }] });
            if (!r.error) setPicker(null);
            return r;
          }}
        />
      ) : null}

      {swap && t ? (
        <FoodPicker
          title={`Swap ${byId.get(itemFor(swap.meal, swap.item).food_id)?.name ?? "food"}`}
          foods={foods}
          recent={recent}
          country={country}
          kj={kj}
          confirmLabel="Swap"
          startGrams={(to) => {
            const it = itemFor(swap.meal, swap.item);
            const from = byId.get(it.food_id);
            return from ? swapGrams(from, it.grams, to) : 100;
          }}
          onSaved={remember}
          onClose={() => setSwap(null)}
          onPick={(f, g) => {
            remember(f);
            setSwaps((cur) => ({ ...cur, [`${swap.meal}:${swap.item}`]: { food_id: f.id, grams: g } }));
            setSwap(null);
          }}
        />
      ) : null}

      {outPanel ? (
        <EatingOut
          userId={userId}
          date={date}
          aiOn={aiOn}
          left={t ? { kcal: Math.round((t.kcal ?? 0) - totals.kcal), protein_g: Math.round((t.protein_g ?? 0) - totals.protein_g), carbs_g: Math.round((t.carbs_g ?? 0) - totals.carbs_g), fat_g: Math.round((t.fat_g ?? 0) - totals.fat_g) } : null}
          kj={kj}
          outs={outs}
          onLog={() => {
            setOutPanel(false);
            setPicker({ meal: EATING_OUT, eatingOut: true });
          }}
          onClose={() => setOutPanel(false)}
        />
      ) : null}
    </>
  );
}

function EatingOut({
  userId,
  date,
  aiOn,
  left,
  kj,
  outs,
  onLog,
  onClose,
}: {
  userId: string;
  date: string;
  aiOn: boolean;
  left: { kcal: number; protein_g: number; carbs_g: number; fat_g: number } | null;
  kj: boolean;
  outs: Out[];
  onLog: () => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [busy, start] = useTransition();
  const waiting = outs.find((o) => !o.coach_reply);
  const [uploaded, setUploaded] = useState<{ file: File; path: string } | null>(null);
  const [picks, setPicks] = useState<{ picks: MenuPick[]; tip?: string } | null>(null);
  const [logged, setLogged] = useState<string[]>([]);

  /** Upload the photo once, and reuse it for suggestions and for Adam. */
  async function upload(): Promise<string | null | { error: string }> {
    if (!file) return null;
    if (uploaded?.file === file) return uploaded.path;
    if (file.size > 15 * 1024 * 1024) return { error: "That photo is too big. Try a screenshot instead." };
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("menu-photos").upload(path, file, { contentType: file.type || "image/jpeg" });
    if (error) return { error: "The photo didn't upload. Check your signal and try again." };
    setUploaded({ file, path });
    return path;
  }

  function suggest() {
    setMsg(null);
    setPicks(null);
    start(async () => {
      const up = await upload();
      if (up && typeof up === "object") return setMsg({ error: up.error });
      if (!up) return setMsg({ error: "Add a photo of the menu first." });
      const r = await suggestFromMenu({ photo_path: up, remaining: left ?? {} });
      if (r.error || !r.picks) return setMsg({ error: r.error ?? "No suggestions came back." });
      setPicks({ picks: r.picks, tip: r.tip });
    });
  }

  function logPick(p: MenuPick) {
    setMsg(null);
    start(async () => {
      const r = await logRestaurantEstimate({ date, meal: EATING_OUT, name: p.name, kcal: p.kcal, protein_g: p.protein_g, carbs_g: p.carbs_g, fat_g: p.fat_g });
      if (r.error) setMsg({ error: r.error });
      else setLogged((l) => [...l, p.name]);
    });
  }

  function send() {
    setMsg(null);
    start(async () => {
      const up = await upload();
      if (up && typeof up === "object") return setMsg({ error: up.error });
      const path = up;
      const r = await sendEatingOut({ photo_path: path, note: note.trim() || null, remaining: left ?? {} });
      if (r.error) setMsg({ error: r.error });
      else {
        setMsg({ ok: "Sent to Adam. His reply will show at the top of this page." });
        setFile(null);
        setUploaded(null);
        setNote("");
      }
    });
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="panel" role="dialog" aria-label="Eating out">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Eating out</span>
            <h2>Send Adam the menu</h2>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          {aiOn ? "Snap the menu for instant suggestions, or send it to Adam for his pick." : "Snap the menu and Adam will tell you what fits your day best."}
        </p>
        {left ? (
          <p className="alert ok small" style={{ margin: 0 }}>
            You&apos;ve got <b>{energyText(Math.max(0, left.kcal), kj)}</b> left today · P {Math.max(0, left.protein_g)} g · C {Math.max(0, left.carbs_g)} g · F {Math.max(0, left.fat_g)} g. Adam will see this too.
          </p>
        ) : null}
        {waiting ? <p className="alert small" style={{ margin: 0 }}>Adam hasn&apos;t replied to your last one yet.</p> : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPicks(null);
          }}
        />
        <button className="btn" onClick={() => fileRef.current?.click()}>
          {file ? `📷 ${file.name.slice(0, 30)}` : "📷 Take or choose a photo"}
        </button>
        <label className="field">
          <span>
            Anything Adam should know? <span className="hint">(optional)</span>
          </span>
          <textarea className="ctl" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Italian place, I fancy pasta" />
        </label>
        {aiOn ? (
          <button className="btn primary" onClick={suggest} disabled={busy || !file}>
            {busy && !picks ? "Reading the menu…" : "✨ Suggest what fits my day"}
          </button>
        ) : null}
        {picks ? (
          <div className="stack" style={{ gap: 8 }}>
            <span className="muted small">Best fit first. Numbers are estimates for a normal portion, so treat them as a guide.</span>
            {picks.picks.map((p, i) => (
              <div key={i} className="menupick">
                <div className="row" style={{ justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                  <b>
                    {i + 1}. {p.name}
                  </b>
                  <span className="num small">{energyText(p.kcal, kj)}</span>
                </div>
                <span className="small">{p.why}</span>
                {p.ask_for ? <span className="small muted">Ask for: {p.ask_for}</span> : null}
                <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <span className="muted small">
                    P {p.protein_g} · C {p.carbs_g} · F {p.fat_g}
                  </span>
                  <button className="mini" onClick={() => logPick(p)} disabled={busy || logged.includes(p.name)}>
                    {logged.includes(p.name) ? "Logged ✓" : "I had this"}
                  </button>
                </div>
              </div>
            ))}
            {picks.tip ? <p className="small" style={{ margin: 0 }}>{picks.tip}</p> : null}
          </div>
        ) : null}
        {msg?.error ? <p className="alert error small">{msg.error}</p> : null}
        {msg?.ok ? <p className="alert ok small">{msg.ok}</p> : null}
        <button className={`btn${aiOn ? "" : " primary"}`} onClick={send} disabled={busy || (!file && !note.trim())}>
          {busy && !aiOn ? "Sending…" : "Send to Adam"}
        </button>
        <hr className="sep" />
        <button className="btn" onClick={onLog}>
          + Log what you had
        </button>
      </aside>
    </>
  );
}
