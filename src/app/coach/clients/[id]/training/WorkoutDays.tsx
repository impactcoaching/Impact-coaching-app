"use client";

import { useState, useTransition } from "react";
import { setWorkoutDays } from "@/app/actions/training";
import { WEEKDAYS } from "@/lib/cardio";

/** Weekday picker for one workout. Saves as soon as a day is tapped. */
export function WorkoutDays({ workoutId, initial, first }: { workoutId: string; initial: number[]; first: string }) {
  const [days, setDays] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string }>({});

  const toggle = (d: number) => {
    const before = days;
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort();
    setDays(next);
    setMsg({});
    start(async () => {
      const res = await setWorkoutDays(workoutId, next);
      if (res.error) {
        setDays(before);
        setMsg({ error: res.error });
      } else setMsg({ ok: true });
    });
  };

  return (
    <div>
      <span className="muted small">Set days for this session</span>
      <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
        {WEEKDAYS.map((w, i) => (
          <button key={w} type="button" className={`mini${days.includes(i + 1) ? " done" : ""}`} aria-pressed={days.includes(i + 1)} onClick={() => toggle(i + 1)}>
            {w}
          </button>
        ))}
        {pending ? <span className="muted small">Saving…</span> : msg.ok ? <span className="chip pink">Saved</span> : null}
      </div>
      <span className="muted small">
        {days.length ? `${first} sees this as "Today" on those days, and can still do it on another day if their week changes.` : `No days set, so ${first} picks it when they like.`}
      </span>
      {msg.error ? <p className="alert error small" style={{ margin: "6px 0 0" }}>{msg.error}</p> : null}
    </div>
  );
}
