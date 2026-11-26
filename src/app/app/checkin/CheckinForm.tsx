"use client";

import { useRef, useState, useTransition } from "react";
import { allowPhotos, submitCheckin } from "@/app/actions/checkins";
import { CYCLE_PHASES, GENERAL, MEASUREMENTS, MODULES, PERIOD_CHANGES, SCALE_MAX, type ModuleKey, type Question } from "@/lib/checkins";
import { uploadFile } from "@/lib/upload";

type Vals = Record<string, string | number>;
const num = (v: string) => (v.trim() === "" ? "" : Number(v.replace(",", ".")));

function Field({ q, value, onChange }: { q: Question; value: string | number | undefined; onChange: (v: string | number) => void }) {
  if (q.kind === "scale")
    return (
      <div className="qblock">
        <span className="qlabel">
          {q.label}
          {q.optional ? <span className="hint"> (optional)</span> : null}
        </span>
        <div className="scale" role="radiogroup" aria-label={q.label}>
          {Array.from({ length: SCALE_MAX }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" role="radio" aria-checked={value === n} className={value === n ? "on" : ""} onClick={() => onChange(n)}>
              {n}
            </button>
          ))}
        </div>
        <div className="scale-ends">
          <span>{q.low}</span>
          <span>{q.high}</span>
        </div>
      </div>
    );
  if (q.kind === "number")
    return (
      <label className="field">
        <span>
          {q.label}
          {q.unit ? <span className="hint"> ({q.unit})</span> : null}
          {q.optional ? <span className="hint"> (optional)</span> : null}
        </span>
        <input className="ctl num" inputMode="decimal" value={value ?? ""} onChange={(e) => onChange(num(e.target.value))} />
      </label>
    );
  if (q.kind === "choice")
    return (
      <div className="qblock">
        <span className="qlabel">
          {q.label}
          {q.optional ? <span className="hint"> (optional)</span> : null}
        </span>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {q.options.map((o) => (
            <button key={o} type="button" className={`mini${value === o ? " done" : ""}`} aria-pressed={value === o} onClick={() => onChange(o)}>
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  return (
    <label className="field">
      <span>
        {q.label}
        {q.optional ? <span className="hint"> (optional)</span> : null}
      </span>
      {q.short ? (
        <input className="ctl" value={value ?? ""} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <textarea className="ctl" rows={2} value={value ?? ""} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

export function CheckinForm({
  userId,
  module,
  measurements,
  cycle,
  poses,
  custom,
  photosAllowed,
  lastWeight,
}: {
  userId: string;
  module: ModuleKey;
  measurements: boolean;
  cycle: boolean;
  poses: string[];
  custom: string[];
  photosAllowed: boolean;
  lastWeight: number | null;
}) {
  const [weight, setWeight] = useState("");
  const [answers, setAnswers] = useState<Vals>({});
  const [mod, setMod] = useState<Vals>({});
  const [meas, setMeas] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<string>("");
  const [period, setPeriod] = useState<string>("");
  const [extra, setExtra] = useState<Record<number, string>>({});
  const [cycleDay, setCycleDay] = useState("");
  const [cycleNote, setCycleNote] = useState("");
  const [photos, setPhotos] = useState<Record<string, { path?: string; preview: string; uploading: boolean }>>({});
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [busy, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [posePick, setPosePick] = useState<string | null>(null);
  const moduleDef = MODULES[module];

  async function onFile(file: File | undefined) {
    const pose = posePick;
    if (!file || !pose) return;
    const preview = URL.createObjectURL(file);
    setPhotos((p) => ({ ...p, [pose]: { preview, uploading: true } }));
    const r = await uploadFile("progress-photos", userId, file, 20);
    if (r.error) {
      setPhotos((p) => {
        const n = { ...p };
        delete n[pose];
        return n;
      });
      setMsg({ error: r.error });
    } else setPhotos((p) => ({ ...p, [pose]: { preview, path: r.path, uploading: false } }));
  }

  function send() {
    setMsg(null);
    if (Object.values(photos).some((p) => p.uploading)) return setMsg({ error: "Wait for the photos to finish uploading." });
    const w = weight.trim() ? Number(weight.replace(",", ".")) : null;
    if (w != null && (Number.isNaN(w) || w < 25 || w > 400)) return setMsg({ error: "Check your weight. It's in kg." });
    const m = Object.fromEntries(Object.entries(meas).filter(([, v]) => v.trim() !== "").map(([k, v]) => [k, Number(v.replace(",", "."))]));
    start(async () => {
      const r = await submitCheckin({
        weight_kg: w,
        answers,
        module_answers: mod,
        measurements: measurements && Object.keys(m).length ? m : null,
        cycle:
          cycle && (phase || period)
            ? {
                phase: (phase || "Not sure") as (typeof CYCLE_PHASES)[number],
                period: (period || null) as (typeof PERIOD_CHANGES)[number] | null,
                day: cycleDay ? Number(cycleDay) : null,
                note: cycleNote.trim() || null,
              }
            : null,
        custom_answers: custom.map((q, i) => ({ q, a: (extra[i] ?? "").trim() })).filter((x) => x.a),
        photos: Object.entries(photos)
          .filter(([, p]) => p.path)
          .map(([pose, p]) => ({ pose, path: p.path! })),
      });
      if (r.error) setMsg({ error: r.error });
      else {
        setMsg({ ok: true });
        setWeight("");
        setAnswers({});
        setMod({});
        setMeas({});
        setPhase("");
        setPeriod("");
        setExtra({});
        setCycleDay("");
        setCycleNote("");
        setPhotos({});
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  if (msg?.ok)
    return (
      <div className="card">
        <h2>Sent to Adam</h2>
        <p className="muted" style={{ margin: 0 }}>
          Thanks. Adam will go through it and reply here, usually within a day or two.
        </p>
        <button className="btn" onClick={() => setMsg(null)}>
          Done
        </button>
      </div>
    );

  return (
    <div className="stack">
      <div className="card" data-tour="ci-weight">
        <h2>Weight</h2>
        <label className="field">
          <span>
            This morning, after the loo, before food (kg) <span className="hint">(optional)</span>
          </span>
          <input className="ctl num" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={lastWeight ? `Last time ${lastWeight}` : ""} />
        </label>
      </div>

      <div className="card" data-tour="ci-scores">
        <h2>How it went</h2>
        {GENERAL.map((q) => (
          <Field key={q.key} q={q} value={answers[q.key]} onChange={(v) => setAnswers((a) => ({ ...a, [q.key]: v }))} />
        ))}
      </div>

      {moduleDef.questions.length || custom.length ? (
        <div className="card" data-tour="ci-module">
          <span className="eyebrow">{moduleDef.questions.length ? moduleDef.label : "From Adam"}</span>
          {moduleDef.questions.map((q) => (
            <Field key={q.key} q={q} value={mod[q.key]} onChange={(v) => setMod((a) => ({ ...a, [q.key]: v }))} />
          ))}
          {custom.map((q, i) => (
            <Field key={`c${i}`} q={{ kind: "text", key: `c${i}`, label: q }} value={extra[i]} onChange={(v) => setExtra((a) => ({ ...a, [i]: String(v) }))} />
          ))}
        </div>
      ) : null}

      {measurements ? (
        <div className="card" data-tour="ci-measure">
          <h2>Measurements</h2>
          <p className="muted small" style={{ margin: 0 }}>
            In cm, measured the same way each time. Skip any you don&apos;t do.
          </p>
          <div className="bx-grid">
            {MEASUREMENTS.map((m) => (
              <label key={m.key}>
                {m.label}
                <input className="ctl num" inputMode="decimal" value={meas[m.key] ?? ""} onChange={(e) => setMeas((c) => ({ ...c, [m.key]: e.target.value }))} />
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {cycle ? (
        <div className="card" data-tour="ci-cycle">
          <h2>Your cycle</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Helps Adam read changes in weight, hunger and energy. Only you and Adam see this.
          </p>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {CYCLE_PHASES.map((p) => (
              <button key={p} type="button" className={`mini${phase === p ? " done" : ""}`} aria-pressed={phase === p} onClick={() => setPhase(phase === p ? "" : p)}>
                {p}
              </button>
            ))}
          </div>
          <div className="qblock">
            <span className="qlabel">
              Any changes to your period? <span className="hint">(optional)</span>
            </span>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {PERIOD_CHANGES.map((p) => (
                <button key={p} type="button" className={`mini${period === p ? " done" : ""}`} aria-pressed={period === p} onClick={() => setPeriod(period === p ? "" : p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="grid2">
            <label className="field">
              <span>
                Day of cycle <span className="hint">(if you know)</span>
              </span>
              <input className="ctl num" inputMode="numeric" value={cycleDay} onChange={(e) => setCycleDay(e.target.value.replace(/\D/g, "").slice(0, 2))} />
            </label>
            <label className="field">
              <span>
                Anything to note <span className="hint">(optional)</span>
              </span>
              <input className="ctl" value={cycleNote} onChange={(e) => setCycleNote(e.target.value)} />
            </label>
          </div>
        </div>
      ) : null}

      <div className="card" data-tour="ci-photos">
        <h2>Photos</h2>
        {!photosAllowed ? (
          <>
            <p className="muted small" style={{ margin: 0 }}>
              You chose not to share progress photos when you signed up. If you&apos;d like to add them, turn them on here. They&apos;re private to you and Adam, and never used for marketing without asking.
            </p>
            <form action={allowPhotos}>
              <button className="btn">Turn on progress photos</button>
            </form>
          </>
        ) : (
          <>
            <p className="muted small" style={{ margin: 0 }}>
              Same place, same light, same time of day if you can. Only you and Adam see them.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <div className="posegrid">
              {poses.map((pose) => {
                const p = photos[pose];
                return (
                  <button
                    key={pose}
                    type="button"
                    className={`posebox${p ? " has" : ""}`}
                    onClick={() => {
                      setPosePick(pose);
                      fileRef.current?.click();
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p ? <img src={p.preview} alt={pose} /> : <span aria-hidden>📷</span>}
                    <small>{p?.uploading ? "Uploading…" : pose}</small>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {msg?.error ? (
        <p className="alert error" role="alert">
          {msg.error}
        </p>
      ) : null}
      <button className="btn primary" data-tour="ci-send" onClick={send} disabled={busy}>
        {busy ? "Sending…" : "Send check-in to Adam"}
      </button>
    </div>
  );
}
