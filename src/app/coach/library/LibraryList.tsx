"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { autoMatchStock, createExercise } from "@/app/actions/demos";
import { DEMO_LABEL, type DemoSource } from "@/lib/demos";
import { EQUIPMENT, type EquipmentKey } from "@/lib/options";

export type LibraryExercise = { id: string; name: string; muscle: string; equipment: string[]; source: DemoSource; auto: boolean };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function LibraryList({ exercises, muscles, stockReady }: { exercises: LibraryExercise[]; muscles: string[]; stockReady: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "none" | "auto">("all");
  const [adding, setAdding] = useState(false);
  const [addState, addAction, addPending] = useActionState(createExercise, null);
  const [matching, setMatching] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const missing = exercises.filter((e) => e.source === "none").length;
  const toCheck = exercises.filter((e) => e.auto).length;
  const withStockNone = exercises.filter((e) => e.source !== "stock" && e.source !== "own").length;

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return exercises.filter(
      (e) => (!t || e.name.toLowerCase().includes(t) || e.muscle.toLowerCase().includes(t)) && (only === "all" || (only === "none" ? e.source === "none" : e.auto)),
    );
  }, [exercises, q, only]);
  const groups = useMemo(() => {
    const m = new Map<string, LibraryExercise[]>();
    shown.forEach((e) => m.set(e.muscle, [...(m.get(e.muscle) ?? []), e]));
    return [...m.entries()];
  }, [shown]);

  async function matchAll() {
    setBusy(true);
    const skip: string[] = [];
    let total = 0;
    const missed: string[] = [];
    try {
      for (let round = 0; round < 40; round++) {
        setMatching(`Matching… ${total} done so far`);
        const r = await autoMatchStock(skip);
        total += r.matched;
        r.missed.forEach((m) => {
          skip.push(m.id);
          missed.push(m.name);
        });
        if (r.error) {
          setMatching(`${r.error}`);
          return;
        }
        if (r.remaining <= 0) break;
        if (r.wait) {
          setMatching(`WorkoutX asks us to slow down. Carrying on in a minute (${total} done so far)…`);
          await sleep(65000);
        }
      }
      setMatching(`Done. ${total} matched${missed.length ? `. No match for: ${missed.join(", ")}. Pick those by hand or add your own video.` : "."} Check the ones marked "check it".`);
    } catch {
      setMatching(`That stopped part way (${total} matched). Check your signal and tap again to carry on.`);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <span className="eyebrow">Demos</span>
            <h2 style={{ margin: 0 }}>
              {exercises.length - missing} of {exercises.length} have a demo
            </h2>
          </div>
          {toCheck ? <span className="chip warn">{toCheck} to check</span> : null}
        </div>
        {stockReady ? (
          withStockNone > 0 ? (
            <>
              <p className="small muted" style={{ margin: 0 }}>
                Find a WorkoutX stock clip for every exercise without one. You can check and change each match after.
              </p>
              <button className="btn primary" onClick={matchAll} disabled={busy}>
                {busy ? "Matching…" : "Match stock demos"}
              </button>
            </>
          ) : null
        ) : (
          <p className="small muted" style={{ margin: 0 }}>
            Stock demos switch on once the WorkoutX key is added in Vercel (WORKOUTX_API_KEY). Your own videos and links work now.
          </p>
        )}
        {matching ? (
          <p className="alert ok" role="status" style={{ margin: 0 }}>
            {matching}
          </p>
        ) : null}
      </div>

      <div className="card">
        <input className="ctl" type="search" placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search exercises" />
        <div className="row" style={{ gap: 6 }}>
          {(["all", "none", "auto"] as const).map((k) => (
            <button key={k} className={`mini${only === k ? " done" : ""}`} onClick={() => setOnly(k)}>
              {k === "all" ? "All" : k === "none" ? "No demo" : "To check"}
            </button>
          ))}
          <button className="mini pink" style={{ marginLeft: "auto" }} onClick={() => setAdding((a) => !a)}>
            {adding ? "Close" : "+ New exercise"}
          </button>
        </div>

        {adding ? (
          <form action={addAction} className="stack" style={{ gap: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <label className="field">
              <span>Name</span>
              <input className="ctl" name="name" required maxLength={80} placeholder="e.g. Pendulum squat" />
            </label>
            <label className="field">
              <span>Muscle group</span>
              <select className="ctl" name="muscle" defaultValue="">
                <option value="" disabled>
                  Pick one
                </option>
                {muscles.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <fieldset className="stack" style={{ gap: 8, border: 0, padding: 0, margin: 0 }}>
              <span className="small" style={{ fontWeight: 600 }}>
                Kit needed <span className="muted" style={{ fontWeight: 400 }}>(leave blank for none)</span>
              </span>
              <div className="grid2" style={{ gap: 8 }}>
                {(Object.keys(EQUIPMENT) as EquipmentKey[]).map((k) => (
                  <label key={k} className="check">
                    <input type="checkbox" name="equipment" value={k} />
                    {EQUIPMENT[k]}
                  </label>
                ))}
              </div>
            </fieldset>
            {addState?.error ? (
              <p className="alert error" role="alert" style={{ margin: 0 }}>
                {addState.error}
              </p>
            ) : null}
            <button className="btn primary" disabled={addPending}>
              {addPending ? "Adding…" : "Add exercise"}
            </button>
          </form>
        ) : null}
      </div>

      {groups.length === 0 ? <p className="muted">Nothing matches that.</p> : null}
      {groups.map(([muscle, list]) => (
        <div key={muscle} className="card">
          <span className="eyebrow">{muscle}</span>
          <div className="stack" style={{ gap: 6 }}>
            {list.map((e) => (
              <Link key={e.id} href={`/coach/library/${e.id}`} className="lib-row">
                <span>
                  <b>{e.name}</b>
                  <small>{e.equipment.length ? e.equipment.map((k) => EQUIPMENT[k as EquipmentKey] ?? k).join(", ") : "No kit"}</small>
                </span>
                <span className={`chip${e.source === "none" ? "" : e.auto ? " warn" : " pink"}`} style={{ flexShrink: 0 }}>
                  {e.auto ? "Stock, check it" : DEMO_LABEL[e.source]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
