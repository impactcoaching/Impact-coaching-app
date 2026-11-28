"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteCardioLog, logCardio, saveSteps, type CardioResult } from "@/app/actions/cardio";
import { CARDIO_KINDS, WEEKDAYS, ZONE_HELP, countedMinutes, dayName, intensityText, sessionMinutes, type CardioLog, type CardioPlan, type CardioSession } from "@/lib/cardio";

function Submit({ label, busy, primary = true }: { label: string; busy: string; primary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn${primary ? " primary" : ""}`} disabled={pending} aria-busy={pending} style={{ alignSelf: "flex-start" }}>
      {pending ? busy : label}
    </button>
  );
}

function Msg({ state }: { state: CardioResult }) {
  if (state?.error)
    return (
      <p className="alert error small" role="alert" style={{ margin: 0 }}>
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p className="alert ok small" role="status" style={{ margin: 0 }}>
        {state.ok}
      </p>
    );
  return null;
}

/** Log a set session or extra cardio. Resets after saving. */
function LogForm({ today, session, kinds }: { today: string; session?: CardioSession; kinds?: readonly string[] }) {
  const [state, action] = useActionState<CardioResult, FormData>(logCardio, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="stack" style={{ gap: 10 }}>
      <input type="hidden" name="log_date" value={today} />
      {session ? (
        <>
          <input type="hidden" name="session_id" value={session.id} />
          <input type="hidden" name="kind" value={session.kind} />
        </>
      ) : null}
      <div className="clog">
        {!session ? (
          <label className="field">
            <span>Type</span>
            <select className="ctl" name="kind" defaultValue="Outdoor walk">
              {(kinds ?? CARDIO_KINDS).map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="field">
          <span>Minutes</span>
          <input className="ctl" name="minutes" inputMode="numeric" defaultValue={session ? sessionMinutes(session) : ""} placeholder="0" required />
        </label>
        <label className="field">
          <span>How hard, 1 to 10</span>
          <select className="ctl" name="effort" defaultValue="">
            <option value="">–</option>
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Avg heart rate</span>
          <input className="ctl" name="avg_hr" inputMode="numeric" placeholder="bpm" />
        </label>
        <label className="field">
          <span>Distance</span>
          <input className="ctl" name="distance_km" inputMode="decimal" placeholder="km" />
        </label>
      </div>
      <Submit label={session ? "Log it" : "Add"} busy="Saving…" />
      <Msg state={state} />
    </form>
  );
}

function Steps({ today, target, current }: { today: string; target: number | null; current: number | null }) {
  const [state, action] = useActionState<CardioResult, FormData>(saveSteps, null);
  return (
    <form action={action} className="stepsrow">
      <input type="hidden" name="log_date" value={today} />
      <label className="field" style={{ flex: 1 }}>
        <span>
          Steps today{target ? <span className="hint"> · target {target.toLocaleString("en-GB")}</span> : null}
        </span>
        <input className="ctl" name="steps" inputMode="numeric" defaultValue={current ?? ""} placeholder="From your phone or watch" />
      </label>
      <Submit label="Save" busy="Saving…" primary={false} />
      <Msg state={state} />
    </form>
  );
}

function SessionCard({ s, label, today }: { s: CardioSession; label: string; today: string }) {
  const intensity = intensityText(s);
  return (
    <div className="ctoday">
      <span className="eyebrow">
        {label}
        {s.timing && s.timing !== "Any time" ? ` · ${s.timing}` : ""}
      </span>
      <h3 style={{ margin: 0 }}>
        {s.kind} · {sessionMinutes(s)} min
      </h3>
      {intensity ? (
        <div className="chips">
          <span className="chip pink">{intensity}</span>
        </div>
      ) : null}
      {s.mode === "hr" && s.target && ZONE_HELP[s.target] ? <p className="muted small" style={{ margin: 0 }}>{`${s.target}: ${ZONE_HELP[s.target]}`}</p> : null}
      {s.notes ? <p className="small" style={{ margin: 0 }}>{s.notes}</p> : null}
      <LogForm today={today} session={s} />
    </div>
  );
}


export function CardioCard({
  today,
  plan,
  sessions,
  logs,
  stepsToday,
}: {
  today: string;
  plan: CardioPlan | null;
  sessions: CardioSession[];
  logs: CardioLog[];
  stepsToday: number | null;
}) {
  const [open, setOpen] = useState(false);
  const weekday = (() => {
    const d = new Date(today + "T12:00:00Z").getUTCDay();
    return d === 0 ? 7 : d;
  })();
  const extraCounts = plan?.extra_counts ?? true;
  const done = countedMinutes(logs, extraCounts);
  const target = plan?.weekly_minutes ?? 0;
  const doneIds = new Set(logs.map((l) => l.session_id).filter(Boolean));
  const todays = sessions.filter((s) => s.day === weekday && !doneIds.has(s.id));
  const todayLogged = sessions.filter((s) => s.day === weekday && doneIds.has(s.id));
  const anyDay = sessions.filter((s) => !s.day && !doneIds.has(s.id));

  return (
    <section className="card stack cardio" data-tour="cardio">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Cardio</h2>
        <span className="muted small">{target ? `${done} of ${target} min this week` : `${done} min this week`}</span>
      </div>
      {target ? (
        <div className="cbar">
          <i style={{ width: `${Math.min(100, (done / target) * 100)}%` }} />
        </div>
      ) : null}

      {todays.map((s) => (
        <SessionCard key={s.id} s={s} label="Today" today={today} />
      ))}
      {todayLogged.map((s) => (
        <p key={s.id} className="alert ok small" style={{ margin: 0 }}>
          Today&apos;s {s.kind.toLowerCase()} is logged. Nice one.
        </p>
      ))}
      {!todays.length && anyDay.length ? <SessionCard s={anyDay[0]} label="Any day this week" today={today} /> : null}

      {sessions.length ? (
        <>
          <button type="button" className="link small" style={{ alignSelf: "flex-start" }} onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "Hide" : "Show"} this week&apos;s plan
          </button>
          {open ? (
            <ul className="clist">
              {[...sessions].sort((a, b) => (a.day ?? 8) - (b.day ?? 8)).map((s) => (
                <li key={s.id} className={doneIds.has(s.id) ? "done" : s.day === weekday ? "today" : ""}>
                  <b>
                    {dayName(s.day)} · {s.kind} · {sessionMinutes(s)} min {doneIds.has(s.id) ? "✓" : ""}
                  </b>
                  <span className="muted small">{[intensityText(s), s.timing].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : !target ? (
        <p className="muted small" style={{ margin: 0 }}>
          Adam hasn&apos;t set any cardio yet. You can still log anything you do below.
        </p>
      ) : null}

      <div className="wstrip">
        <div>
          <b>
            Outdoor walk tracking <span className="chip">Coming soon</span>
          </b>
          <small>Map your route and we&apos;ll work out how hard it was from the hills and your pace. It&apos;s coming with the App Store version. For now, log walks below.</small>
        </div>
      </div>

      <details className="cextra">
        <summary>+ Log extra cardio</summary>
        <LogForm today={today} />
      </details>

      {plan?.daily_steps || stepsToday != null ? <Steps today={today} target={plan?.daily_steps ?? null} current={stepsToday} /> : null}

      {logs.length ? (
        <details className="cextra">
          <summary>This week&apos;s log ({logs.length})</summary>
          <ul className="clist">
            {logs.map((l) => (
              <li key={l.id}>
                <b>
                  {WEEKDAYS[(new Date(l.log_date + "T12:00:00Z").getUTCDay() + 6) % 7]} · {l.kind} · {l.minutes} min
                </b>
                <span className="muted small">
                  {[l.session_id ? "Set session" : extraCounts ? "Extra" : "Extra, doesn't count to the target", l.effort ? `effort ${l.effort}/10` : null, l.avg_hr ? `${l.avg_hr} bpm` : null, l.distance_km ? `${Number(l.distance_km)} km` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <form action={deleteCardioLog}>
                  <input type="hidden" name="id" value={l.id} />
                  <button className="link small">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
