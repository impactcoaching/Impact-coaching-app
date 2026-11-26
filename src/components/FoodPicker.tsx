"use client";

import { useMemo, useState, useTransition } from "react";
import { saveFood, searchSupermarket } from "@/app/actions/nutrition";
import { energyText, forGrams, type Food, type FoundFood } from "@/lib/nutrition";
import { searchOff } from "@/lib/openfoodfacts";

type Picked = Food | FoundFood;

const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const label = (f: Picked) => (f.brand ? `${f.name} · ${f.brand}` : f.name);

/**
 * Side panel to find a food and choose how much. Searches the app's own foods as you type,
 * and the supermarket database (Open Food Facts) when you press the button.
 */
export function FoodPicker({
  title,
  foods,
  recent = [],
  country,
  kj,
  confirmLabel = "Add",
  startGrams,
  onPick,
  onClose,
  onSaved,
}: {
  title: string;
  foods: Food[];
  recent?: Food[];
  country: string | null;
  kj: boolean;
  confirmLabel?: string;
  /** Work out a starting amount for the chosen food (used for swaps). */
  startGrams?: (f: Food) => number;
  onPick: (food: Food, grams: number) => Promise<{ error?: string } | void> | void;
  onClose: () => void;
  onSaved?: (food: Food) => void;
}) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<FoundFood[] | null>(null);
  const [chosen, setChosen] = useState<Picked | null>(null);
  const [grams, setGrams] = useState("100");
  const [own, setOwn] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return recent.length ? recent : foods.slice(0, 30);
    const words = t.split(/\s+/);
    return foods.filter((f) => words.every((w) => label(f).toLowerCase().includes(w))).slice(0, 40);
  }, [q, foods, recent]);

  function choose(f: Picked) {
    setChosen(f);
    setMsg(null);
    const g = f.id && startGrams ? startGrams(f as Food) : f.serving_g ?? 100;
    setGrams(String(Math.round(Number(g))));
  }

  function searchShops() {
    setMsg(null);
    start(async () => {
      // Search from the phone first (its own rate limit), then via our server.
      let r = await searchOff(q.trim(), country);
      if (r.error) {
        const viaServer = await searchSupermarket(q, country);
        if (!viaServer.error || viaServer.foods.length) r = viaServer;
        // Show both codes (phone and server) so a failure can be traced.
        else r = { foods: [], error: `${viaServer.error.replace(/\s*\(.*\)$/, "")} (phone: ${r.error.match(/\((.*)\)$/)?.[1] ?? "?"}; server: ${viaServer.error.match(/\((.*)\)$/)?.[1] ?? "?"})` };
      }
      setFound(r.foods);
      if (r.error) setMsg(r.error);
      else if (!r.foods.length) setMsg("Nothing found. Try fewer words, or add it yourself from the label.");
    });
  }

  function confirm() {
    const g = num(grams);
    if (!chosen || !g || g <= 0 || g > 5000) return setMsg("Enter an amount in grams.");
    start(async () => {
      let food = chosen as Food;
      if (!chosen.id) {
        const { id: _id, owner_id: _o, ...rest } = chosen;
        void _id;
        void _o;
        const r = await saveFood({ ...rest, source: "off" });
        if (r.error || !r.food) return setMsg(r.error ?? "Couldn't save that food.");
        food = r.food;
        onSaved?.(food);
      }
      const res = await onPick(food, g);
      if (res && res.error) setMsg(res.error);
    });
  }

  const preview = chosen && num(grams) ? forGrams(chosen, num(grams)!) : null;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="panel" role="dialog" aria-label={title}>
        <div className="panel-head">
          <h2>{own ? "Add your own food" : chosen ? "How much?" : title}</h2>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {own ? (
          <OwnFood
            initialName={q}
            onCancel={() => setOwn(false)}
            onSaved={(f) => {
              onSaved?.(f);
              setOwn(false);
              choose(f);
            }}
          />
        ) : chosen ? (
          <>
            <div className="bx">
              <b>{label(chosen)}</b>
              <span className="muted small">
                Per 100 g: {energyText(Number(chosen.kcal), kj)} · P {Number(chosen.protein_g)} · C {Number(chosen.carbs_g)} · F {Number(chosen.fat_g)}
                {chosen.sodium_mg != null ? ` · sodium ${Math.round(Number(chosen.sodium_mg))} mg` : ""}
              </span>
            </div>
            <label className="field">
              <span>Amount in grams</span>
              <input className="ctl num" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} autoFocus />
            </label>
            {chosen.serving_g ? (
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                {[0.5, 1, 2].map((m) => (
                  <button key={m} className="mini" onClick={() => setGrams(String(Math.round(Number(chosen.serving_g) * m)))}>
                    {m === 1 ? "" : `${m} × `}
                    {chosen.serving_name || "1 serving"} ({Math.round(Number(chosen.serving_g) * m)} g)
                  </button>
                ))}
              </div>
            ) : null}
            {preview ? (
              <p className="alert ok small" style={{ margin: 0 }}>
                {energyText(preview.kcal, kj)} · Protein {preview.protein_g} g · Carbs {preview.carbs_g} g · Fat {preview.fat_g} g
                {chosen.sodium_mg != null ? ` · Sodium ${preview.sodium_mg} mg` : ""}
              </p>
            ) : null}
            {msg ? <p className="alert error small">{msg}</p> : null}
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" onClick={() => setChosen(null)}>
                Back
              </button>
              <button className="btn primary" onClick={confirm} disabled={busy}>
                {busy ? "Saving…" : confirmLabel}
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              className="ctl"
              placeholder="Search, e.g. chicken, oats or a barcode"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setFound(null);
                setMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && q.trim().length >= 2) searchShops();
              }}
              autoFocus
            />
            {!q.trim() && recent.length ? <span className="eyebrow">Recent</span> : null}
            <div className="picker-list">
              {results.map((f) => (
                <button key={f.id} className="pick" onClick={() => choose(f)}>
                  <span>
                    <b>{label(f)}</b>
                    <small>
                      {energyText(Number(f.kcal), kj)} per 100 g · P {Number(f.protein_g)} · C {Number(f.carbs_g)} · F {Number(f.fat_g)}
                      {f.owner_id ? " · your food" : ""}
                    </small>
                  </span>
                  <span className="chip pink">Pick</span>
                </button>
              ))}
              {found?.length ? <span className="eyebrow">From the supermarket database</span> : null}
              {found?.map((f, i) => (
                <button key={`off-${f.barcode ?? i}`} className="pick" onClick={() => choose(f)}>
                  <span>
                    <b>{label(f)}</b>
                    <small>
                      {energyText(Number(f.kcal), kj)} per 100 g · P {f.protein_g} · C {f.carbs_g} · F {f.fat_g}
                    </small>
                  </span>
                  <span className="chip pink">Pick</span>
                </button>
              ))}
              {q.trim() && !results.length && !found ? <p className="muted small">Not in the app yet. Search the supermarket database below.</p> : null}
            </div>
            {msg ? <p className="alert small">{msg}</p> : null}
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button className="btn" onClick={searchShops} disabled={busy || q.trim().length < 2}>
                {busy ? "Searching…" : "Search supermarket foods"}
              </button>
              <button className="link" onClick={() => setOwn(true)}>
                + Add your own from a label
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function OwnFood({ initialName, onCancel, onSaved }: { initialName: string; onCancel: () => void; onSaved: (f: Food) => void }) {
  const [v, setV] = useState({ name: initialName, brand: "", kcal: "", protein_g: "", carbs_g: "", fat_g: "", fibre_g: "", sodium_mg: "", salt: "", serving_g: "" });
  const [kjIn, setKjIn] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((c) => ({ ...c, [k]: e.target.value }));

  function save() {
    const energy = num(v.kcal);
    if (!v.name.trim() || energy == null) return setMsg("Add a name and the energy per 100 g.");
    // Labels give salt in the UK and sodium in NZ and Australia. Salt ÷ 2.5 = sodium.
    const sodium = num(v.sodium_mg) ?? (num(v.salt) != null ? Math.round((num(v.salt)! / 2.5) * 1000) : null);
    start(async () => {
      const r = await saveFood({
        name: v.name,
        brand: v.brand.trim() || null,
        kcal: kjIn ? Math.round((energy / 4.184) * 10) / 10 : energy,
        protein_g: num(v.protein_g) ?? 0,
        carbs_g: num(v.carbs_g) ?? 0,
        fat_g: num(v.fat_g) ?? 0,
        fibre_g: num(v.fibre_g),
        sodium_mg: sodium,
        serving_g: num(v.serving_g),
        serving_name: null,
        barcode: null,
        source: "client",
      });
      if (r.error || !r.food) return setMsg(r.error ?? "Couldn't save.");
      onSaved(r.food);
    });
  }

  return (
    <>
      <p className="muted small" style={{ margin: 0 }}>
        Copy the <b>per 100 g</b> column from the label.
      </p>
      <label className="field">
        <span>Name</span>
        <input className="ctl" value={v.name} onChange={set("name")} />
      </label>
      <label className="field">
        <span>
          Brand <span className="hint">(optional)</span>
        </span>
        <input className="ctl" value={v.brand} onChange={set("brand")} />
      </label>
      <div className="bx-grid">
        <label>
          Energy
          <input className="ctl num" inputMode="decimal" value={v.kcal} onChange={set("kcal")} />
        </label>
        <label>
          Unit
          <select className="ctl" value={kjIn ? "kj" : "kcal"} onChange={(e) => setKjIn(e.target.value === "kj")}>
            <option value="kcal">kcal</option>
            <option value="kj">kJ</option>
          </select>
        </label>
        <label>
          Protein (g)
          <input className="ctl num" inputMode="decimal" value={v.protein_g} onChange={set("protein_g")} />
        </label>
        <label>
          Carbs (g)
          <input className="ctl num" inputMode="decimal" value={v.carbs_g} onChange={set("carbs_g")} />
        </label>
        <label>
          Fat (g)
          <input className="ctl num" inputMode="decimal" value={v.fat_g} onChange={set("fat_g")} />
        </label>
        <label>
          Fibre (g)
          <input className="ctl num" inputMode="decimal" value={v.fibre_g} onChange={set("fibre_g")} />
        </label>
        <label>
          Sodium (mg)
          <input className="ctl num" inputMode="decimal" value={v.sodium_mg} onChange={set("sodium_mg")} />
        </label>
        <label>
          or Salt (g)
          <input className="ctl num" inputMode="decimal" value={v.salt} onChange={set("salt")} />
        </label>
        <label>
          Serving (g)
          <input className="ctl num" inputMode="decimal" value={v.serving_g} onChange={set("serving_g")} />
        </label>
      </div>
      {msg ? <p className="alert error small">{msg}</p> : null}
      <div className="row" style={{ gap: 8 }}>
        <button className="btn" onClick={onCancel}>
          Back
        </button>
        <button className="btn primary" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save food"}
        </button>
      </div>
    </>
  );
}
