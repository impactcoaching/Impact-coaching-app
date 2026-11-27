"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteExercise, saveExercise, searchStock, setOwnVideo, setStock } from "@/app/actions/demos";
import { DemoPlayer } from "@/components/DemoPlayer";
import { DEMO_LABEL, demoSource } from "@/lib/demos";
import { EQUIPMENT, type EquipmentKey } from "@/lib/options";
import { uploadFile } from "@/lib/upload";
import type { WxExercise } from "@/lib/workoutx";

type Ex = {
  id: string;
  name: string;
  muscle: string;
  equipment: string[];
  cues: string | null;
  demo_url: string | null;
  demo_path: string | null;
  wx_female: string | null;
  wx_male: string | null;
  wx_auto: boolean;
};

export function ExerciseEditor({ exercise: e, muscles, stockReady, usedCount }: { exercise: Ex; muscles: string[]; stockReady: boolean; usedCount: number }) {
  const router = useRouter();
  const [state, action, saving] = useActionState(saveExercise, null);
  const [preview, setPreview] = useState(false);
  const [sure, setSure] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState(e.name);
  const [results, setResults] = useState<WxExercise[] | null>(null);
  const [searching, startSearch] = useTransition();
  const [, startSave] = useTransition();
  const file = useRef<HTMLInputElement>(null);
  const source = demoSource(e, stockReady);

  async function upload(f: File) {
    setMsg(null);
    setUploading(true);
    const up = await uploadFile("exercise-demos", "coach", f, 100);
    if (up.error || !up.path) {
      setUploading(false);
      setMsg({ error: up.error ?? "The upload didn't work." });
      return;
    }
    const r = await setOwnVideo(e.id, up.path);
    setUploading(false);
    setMsg(r.error ? { error: r.error } : { ok: "Your video is now the demo for this exercise." });
    router.refresh();
  }

  function search() {
    setMsg(null);
    startSearch(async () => {
      const r = await searchStock(q);
      if (r.error) setMsg({ error: r.error });
      setResults(r.results ?? []);
    });
  }

  function pick(x: WxExercise | null) {
    const female = x ? (x.model === "female" ? x.id : x.counterpartId) : null;
    const male = x ? (x.model === "female" ? x.counterpartId : x.id) : null;
    startSave(async () => {
      const r = await setStock(e.id, female, male);
      setMsg(r.error ? { error: r.error } : { ok: x ? `Stock demo set to "${x.name}".` : "Stock demo removed." });
      router.refresh();
    });
  }

  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <span className="eyebrow">Demo clients see</span>
            <h2 style={{ margin: 0 }}>{e.wx_auto && source === "stock" ? "Stock, matched automatically" : DEMO_LABEL[source]}</h2>
          </div>
          {source !== "none" ? (
            <button className="btn primary" onClick={() => setPreview(true)}>
              ▶ Watch
            </button>
          ) : null}
        </div>
        {e.wx_auto && source === "stock" ? (
          <div className="row">
            <p className="small muted" style={{ margin: 0, flex: 1 }}>
              Watch it to check it&apos;s the right movement, then keep it or pick another below.
            </p>
            <button className="mini pink" onClick={() => pick(null)}>
              Wrong, remove
            </button>
            <button
              className="mini done"
              onClick={() =>
                startSave(async () => {
                  await setStock(e.id, e.wx_female, e.wx_male);
                  router.refresh();
                })
              }
            >
              Looks right
            </button>
          </div>
        ) : null}
        <p className="small muted" style={{ margin: 0 }}>
          {stockReady ? "Your own video comes first, then the stock demo, then a link." : "Your own video comes first, then the link."}
        </p>
        {msg?.error ? (
          <p className="alert error" role="alert" style={{ margin: 0 }}>
            {msg.error}
          </p>
        ) : null}
        {msg?.ok ? (
          <p className="alert ok" role="status" style={{ margin: 0 }}>
            {msg.ok}
          </p>
        ) : null}
      </div>

      <div className="card">
        <span className="eyebrow">Your own video</span>
        <p className="small muted" style={{ margin: 0 }}>
          Film it upright, 10 to 60 seconds, under 100 MB. Clients can unmute it to hear you.
        </p>
        <div className="row">
          <button className="btn primary" onClick={() => file.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : e.demo_path ? "Replace my video" : "Upload my video"}
          </button>
          {e.demo_path ? (
            <button
              className="btn"
              onClick={() =>
                startSave(async () => {
                  const r = await setOwnVideo(e.id, null);
                  setMsg(r.error ? { error: r.error } : { ok: "Your video is removed." });
                  router.refresh();
                })
              }
            >
              Remove it
            </button>
          ) : null}
        </div>
        <input
          ref={file}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          hidden
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            if (f) upload(f);
            ev.target.value = "";
          }}
        />
      </div>

      {stockReady || e.wx_female || e.wx_male ? (
      <div className="card">
        <span className="eyebrow">Stock demo (WorkoutX)</span>
        {stockReady ? (
          <>
            <p className="small muted" style={{ margin: 0 }}>
              {e.wx_female || e.wx_male
                ? `Set${e.wx_female && e.wx_male ? ", with a female and male version. Clients see the one that matches them." : "."}`
                : "None set yet."}{" "}
              Search to change it. Each search uses one WorkoutX request.
            </p>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input className="ctl" value={q} onChange={(ev) => setQ(ev.target.value)} onKeyDown={(ev) => ev.key === "Enter" && search()} aria-label="Search WorkoutX" />
              <button className="btn" onClick={search} disabled={searching}>
                {searching ? "…" : "Search"}
              </button>
            </div>
            {results && results.length === 0 && !searching ? <p className="small muted">No clips found. Try fewer words, such as &quot;squat&quot;.</p> : null}
            {results?.length ? (
              <div className="wx-pick">
                {results.map((x) => (
                  <button key={x.id} aria-pressed={x.id === e.wx_female || x.id === e.wx_male} onClick={() => pick(x)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {x.poster ? <img src={x.poster} alt="" loading="lazy" /> : null}
                    <b>{x.name}</b>
                    <span className="muted">
                      {[x.model === "female" ? "Female" : x.model === "male" ? "Male" : null, x.equipment].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            {e.wx_female || e.wx_male ? (
              <button className="link small" style={{ alignSelf: "flex-start" }} onClick={() => pick(null)}>
                Remove the stock demo
              </button>
            ) : null}
          </>
        ) : (
          <>
            <p className="small muted" style={{ margin: 0 }}>
              Stock demos are switched off, so clients don&apos;t see this one.
            </p>
            <button className="link small" style={{ alignSelf: "flex-start" }} onClick={() => pick(null)}>
              Remove the stock demo
            </button>
          </>
        )}
      </div>
      ) : null}

      <form action={action} className="card">
        <input type="hidden" name="id" value={e.id} />
        <span className="eyebrow">Details</span>
        <label className="field">
          <span>Name</span>
          <input className="ctl" name="name" defaultValue={e.name} required maxLength={80} />
        </label>
        <label className="field">
          <span>Muscle group</span>
          <select className="ctl" name="muscle" defaultValue={e.muscle}>
            {muscles.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>
            Cues <span className="hint">(clients see these under the demo)</span>
          </span>
          <textarea className="ctl" name="cues" defaultValue={e.cues ?? ""} maxLength={1000} placeholder="e.g. Ribs down, push the floor away, control the bottom" />
        </label>
        <label className="field">
          <span>
            Demo link <span className="hint">(optional, e.g. YouTube. Used if there&apos;s no video of your own)</span>
          </span>
          <input className="ctl" name="demo_url" type="url" inputMode="url" defaultValue={e.demo_url ?? ""} placeholder="https://" />
        </label>
        <fieldset className="stack" style={{ gap: 8, border: 0, padding: 0, margin: 0 }}>
          <span className="small" style={{ fontWeight: 600 }}>
            Kit needed <span className="muted" style={{ fontWeight: 400 }}>(the programme builder warns if a client&apos;s gym is missing it)</span>
          </span>
          <div className="grid2" style={{ gap: 8 }}>
            {(Object.keys(EQUIPMENT) as EquipmentKey[]).map((k) => (
              <label key={k} className="check">
                <input type="checkbox" name="equipment" value={k} defaultChecked={e.equipment.includes(k)} />
                {EQUIPMENT[k]}
              </label>
            ))}
          </div>
        </fieldset>
        {state?.error ? (
          <p className="alert error" role="alert" style={{ margin: 0 }}>
            {state.error}
          </p>
        ) : null}
        {state?.ok ? (
          <p className="alert ok" role="status" style={{ margin: 0 }}>
            Saved.
          </p>
        ) : null}
        <button className="btn primary" disabled={saving}>
          {saving ? "Saving…" : "Save details"}
        </button>
      </form>

      <form action={deleteExercise} className="card">
        <input type="hidden" name="id" value={e.id} />
        <span className="eyebrow">Delete</span>
        {usedCount > 0 ? (
          <p className="small muted" style={{ margin: 0 }}>
            This is in {usedCount} programme {usedCount === 1 ? "slot" : "slots"}, so it can&apos;t be deleted.
          </p>
        ) : (
          <div className="row">
            <button type="button" className="btn" onClick={() => setSure((v) => !v)}>
              {sure ? "Keep it" : "Delete this exercise"}
            </button>
            {sure ? <button className="btn primary">Yes, delete it</button> : null}
          </div>
        )}
      </form>

      {preview ? <DemoPlayer exerciseId={e.id} name={e.name} cues={e.cues} onClose={() => setPreview(false)} /> : null}
    </>
  );
}
