"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { saveIntake } from "@/app/actions/intake";
import {
  CLASS_FOCUS,
  COUNTRIES,
  DIVISIONS,
  EQUIPMENT,
  EXPERIENCE,
  FEDERATIONS,
  GOALS,
  GYM_PRESETS,
  NUTRITION_STYLES,
  SCREENING,
  programmeClass,
  type EquipmentKey,
} from "@/lib/options";

const STEPS = ["About you", "Your goal", "Training", "Where you train", "Food", "Health", "Your consent"];

export function IntakeForm({ firstName, trial = false }: { firstName: string; trial?: boolean }) {
  const [state, action, pending] = useActionState(saveIntake, undefined);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("");
  const [competes, setCompetes] = useState("no");
  const [preset, setPreset] = useState<keyof typeof GYM_PRESETS>("big");
  const [kit, setKit] = useState<EquipmentKey[]>(GYM_PRESETS.big.kit);
  const [screen, setScreen] = useState<Record<string, string>>({});
  const [tz, setTz] = useState("");
  const [sex, setSex] = useState("");
  const [division, setDivision] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);
  useEffect(() => {
    top.current?.scrollIntoView({ block: "start" });
  }, [step]);

  const flagged = Object.values(screen).includes("yes");

  function next() {
    const section = formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    const fields = section ? Array.from(section.querySelectorAll<HTMLInputElement>("input,select,textarea")) : [];
    for (const f of fields) {
      if (!f.checkValidity()) {
        f.reportValidity();
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function pickPreset(p: keyof typeof GYM_PRESETS) {
    setPreset(p);
    setKit(GYM_PRESETS[p].kit);
  }

  return (
    <div className="stack" ref={top}>
      <div className="stack" style={{ gap: 8 }}>
        <span className="eyebrow">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </span>
        <div className="steps" aria-hidden="true">
          {STEPS.map((s, i) => (
            <i key={s} className={i <= step ? "on" : ""} />
          ))}
        </div>
      </div>

      <form ref={formRef} action={action} className="stack" noValidate={false}>
        <input type="hidden" name="time_zone" value={tz} />
        <input type="hidden" name="start" value={trial ? "trial" : "apply"} />

        {/* 1. About you */}
        <section className="card" data-step="0" hidden={step !== 0}>
          <h2>Hi {firstName}</h2>
          <p className="muted small" style={{ margin: 0 }}>
            A few basics first. Only Adam can see your answers.
          </p>
          <div className="grid2">
            <label className="field">
              Date of birth
              <input className="ctl" type="date" name="date_of_birth" required max={new Date().toISOString().slice(0, 10)} />
            </label>
            <label className="field">
              <span>Mobile <span className="hint">(optional)</span></span>
              <input className="ctl" type="tel" name="phone" autoComplete="tel" />
            </label>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="small" style={{ fontWeight: 600, marginBottom: 8 }}>
              Sex
            </legend>
            <div className="choices" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
              {[
                ["female", "Female"],
                ["male", "Male"],
              ].map(([v, l]) => (
                <label key={v} className="choice">
                  <input type="radio" name="sex" value={v} required checked={sex === v} onChange={() => setSex(v)} />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field">
            Where do you live?
            <select className="ctl" name="country" required defaultValue="">
              <option value="" disabled>
                Choose a country
              </option>
              {COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <span className="hint small">This sets your food database and units. Your time zone is {tz || "detected automatically"}.</span>
          </label>
        </section>

        {/* 2. Goal */}
        <section className="card" data-step="1" hidden={step !== 1}>
          <h2>What&apos;s the goal?</h2>
          <div className="choices" role="radiogroup" aria-label="Goal">
            {GOALS.map((g) => (
              <label key={g.value} className="choice">
                <input type="radio" name="goal" value={g.value} required onChange={() => { setGoal(g.value); if (g.value === "competition") setCompetes("yes"); }} />
                {g.label}
              </label>
            ))}
          </div>
          <label className="field">
            <span>Tell Adam a bit more <span className="hint">(optional)</span></span>
            <textarea className="ctl" name="goal_detail" placeholder="For example: drop 8 kg for my sister's wedding, or my first bikini show next spring" />
          </label>
          <label className="field">
            <span>Is there a date you&apos;re working towards? <span className="hint">(optional)</span></span>
            <input className="ctl" type="date" name="goal_date" />
          </label>
          <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 8 }}>
            <legend className="small" style={{ fontWeight: 600, marginBottom: 8 }}>
              Do you compete, or plan to?
            </legend>
            <div className="choices">
              {[
                ["yes", "Yes"],
                ["no", "No"],
              ].map(([v, l]) => (
                <label key={v} className="choice">
                  <input type="radio" name="competes" value={v} checked={competes === v} onChange={() => setCompetes(v)} />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
          {competes === "yes" ? (
            <div className="grid2">
              <label className="field">
                Federation
                <select className="ctl" name="federation" defaultValue="">
                  <option value="">Not decided yet</option>
                  {FEDERATIONS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Class
                <select className="ctl" name="division" value={division} onChange={(e) => setDivision(e.target.value)}>
                  <option value="">Not decided yet</option>
                  {DIVISIONS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
              {(() => {
                const focuses = CLASS_FOCUS[programmeClass(division, sex) ?? ""];
                return focuses ? (
                  <label className="field" style={{ gridColumn: "1 / -1" }}>
                    The area you most want to bring up
                    <select className="ctl" name="focus" defaultValue={focuses[0]} key={division + sex}>
                      {focuses.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                ) : null;
              })()}
            </div>
          ) : null}
          {goal === "competition" && competes === "no" ? <p className="alert small">You picked competing as your goal, so we&apos;ve assumed you compete.</p> : null}
        </section>

        {/* 3. Training */}
        <section className="card" data-step="2" hidden={step !== 2}>
          <h2>Your training</h2>
          <div className="grid2">
            <label className="field">
              <span>Height (cm) <span className="hint">(optional)</span></span>
              <input className="ctl num" name="height_cm" inputMode="decimal" type="number" min={100} max={250} step="0.1" />
            </label>
            <label className="field">
              <span>Weight today (kg) <span className="hint">(optional)</span></span>
              <input className="ctl num" name="start_weight_kg" inputMode="decimal" type="number" min={30} max={300} step="0.1" />
            </label>
            <label className="field">
              Days a week you can train
              <select className="ctl" name="days_per_week" required defaultValue="4">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Time per session
              <select className="ctl" name="session_minutes" required defaultValue="60">
                {[30, 45, 60, 75, 90, 120].map((n) => (
                  <option key={n} value={n}>
                    {n} minutes
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            How long have you been training?
            <select className="ctl" name="experience" required defaultValue="">
              <option value="" disabled>
                Choose one
              </option>
              {EXPERIENCE.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Any injuries, aches or exercises you can&apos;t do? <span className="hint">(optional)</span></span>
            <textarea className="ctl" name="injuries" placeholder="For example: left shoulder clicks on overhead pressing" />
          </label>
        </section>

        {/* 4. Gym */}
        <section className="card" data-step="3" hidden={step !== 3}>
          <h2>Where you train</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Adam builds your sessions around the kit you actually have. You can add more gyms later.
          </p>
          <label className="field">
            Name of your gym
            <input className="ctl" name="gym_name" required defaultValue="" placeholder="For example: PureGym Leeds, or Home" />
          </label>
          <input type="hidden" name="gym_preset" value={preset} />
          <div className="choices">
            {(Object.keys(GYM_PRESETS) as (keyof typeof GYM_PRESETS)[]).map((p) => (
              <label key={p} className="choice">
                <input type="radio" name="_preset" checked={preset === p} onChange={() => pickPreset(p)} />
                {GYM_PRESETS[p].label}
                <small>{GYM_PRESETS[p].hint}</small>
              </label>
            ))}
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="small" style={{ fontWeight: 600, marginBottom: 8 }}>
              Untick anything your gym doesn&apos;t have ({kit.length} ticked)
            </legend>
            <div className="choices">
              {(Object.keys(EQUIPMENT) as EquipmentKey[]).map((k) => (
                <label key={k} className="check">
                  <input
                    type="checkbox"
                    name="equipment"
                    value={k}
                    checked={kit.includes(k)}
                    onChange={(e) => setKit((cur) => (e.target.checked ? [...cur, k] : cur.filter((x) => x !== k)))}
                  />
                  {EQUIPMENT[k]}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="muted small" style={{ margin: 0 }}>
            Got kit that isn&apos;t listed? You&apos;ll be able to add it with a photo once you&apos;re in the app.
          </p>
        </section>

        {/* 5. Food */}
        <section className="card" data-step="4" hidden={step !== 4}>
          <h2>Food</h2>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="small" style={{ fontWeight: 600, marginBottom: 8 }}>
              How would you like to do nutrition?
            </legend>
            <div className="choices">
              {NUTRITION_STYLES.map((n) => (
                <label key={n.value} className="choice">
                  <input type="radio" name="nutrition_style" value={n.value} required />
                  {n.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span>Allergies, intolerances, or foods you don&apos;t eat <span className="hint">(optional)</span></span>
            <textarea className="ctl" name="dietary_needs" placeholder="For example: vegetarian, no dairy, hate mushrooms" />
          </label>
          {sex === "female" ? (
          <label className="check">
            <input type="checkbox" name="cycle_tracking" />
            <span>
              Track my menstrual cycle in the app, so Adam can account for it in check-ins.{" "}
              <span className="muted">Optional. You can switch it off at any time.</span>
            </span>
          </label>
          ) : null}
        </section>

        {/* 6. Health screening */}
        <section className="card" data-step="5" hidden={step !== 5}>
          <h2>Health check</h2>
          <p className="muted small" style={{ margin: 0 }}>
            These questions help keep you safe. Answering yes doesn&apos;t stop you joining. It just means Adam may ask you to check with your GP first.
          </p>
          {SCREENING.map((s) => (
            <fieldset key={s.key} style={{ border: 0, padding: 0, margin: 0 }} className="stack">
              <legend className="small" style={{ fontWeight: 600, marginBottom: 6 }}>
                {s.q}
              </legend>
              <div className="choices" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
                {["no", "yes"].map((v) => (
                  <label key={v} className="choice">
                    <input type="radio" name={`screen_${s.key}`} value={v} required onChange={() => setScreen((c) => ({ ...c, [s.key]: v }))} />
                    {v === "yes" ? "Yes" : "No"}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {flagged ? (
            <label className="field">
              Tell Adam a little more about your yes answers
              <textarea className="ctl" name="screening_details" required />
            </label>
          ) : null}
        </section>

        {/* 7. Consent */}
        <section className="card" data-step="6" hidden={step !== 6}>
          <h2>Your consent</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Your weight, photos, health answers and cycle details are health data, which the law protects more strictly. Adam needs your clear consent to use them.
          </p>
          <label className="check">
            <input type="checkbox" name="consent_privacy" required />
            <span>
              I&apos;ve read the{" "}
              <Link href="/privacy" target="_blank">
                privacy policy
              </Link>
              .
            </span>
          </label>
          <label className="check">
            <input type="checkbox" name="consent_health" required />
            <span>I agree to Impact Coaching using my health details, including my answers here, to coach me.</span>
          </label>
          <label className="check">
            <input type="checkbox" name="consent_photos" />
            <span>
              I agree to store my progress and posing photos in the app, so only Adam and I can see them. <span className="muted">Optional, but Adam can&apos;t check your progress photos without it.</span>
            </span>
          </label>
          <label className="check">
            <input type="checkbox" name="consent_marketing" />
            <span>
              Adam can ask me before using any of my photos or results in his marketing. <span className="muted">Optional. Nothing is ever used without asking first.</span>
            </span>
          </label>
          {trial ? (
            <label className="check">
              <input type="checkbox" name="consent_contact" />
              <span>
                Adam can get in touch after my trial with offers and news. <span className="muted">Optional. Leave it unticked and you won&apos;t hear from us once your trial ends.</span>
              </span>
            </label>
          ) : null}
          {trial ? (
            <p className="muted small" style={{ margin: 0 }}>
              Your trial lasts 14 days. If you don&apos;t join after it, your account and everything in it is deleted 30 days after the trial ends.
            </p>
          ) : null}
          <p className="muted small" style={{ margin: 0 }}>
            You can change any of these later in your settings.
          </p>
        </section>

        {state?.error ? (
          <p className="alert error" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="row" style={{ justifyContent: "space-between" }}>
          {step > 0 ? (
            <button type="button" className="btn" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn primary" onClick={next}>
              Next
            </button>
          ) : (
            <button type="submit" className="btn primary" disabled={pending}>
              {pending ? "Saving…" : trial ? "Start my free trial" : "Send to Adam"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
