"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const KEY = "ic-tour-done";
export const TOUR_EVENT = "ic-start-tour";

type Step = { target?: string; title: string; body: string };

const STEPS: Step[] = [
  { title: "Quick look round?", body: "Five tabs along the bottom. Here's what each one does. It takes about 30 seconds." },
  { target: '.tabbar a[href="/app"]', title: "Home", body: "Your week at a glance: what's on today, your countdown and anything from me." },
  { target: '.tabbar a[href="/app/train"]', title: "Train", body: "Your programme. Log each set as you go, and film a set if you want me to check your form." },
  { target: '.tabbar a[href="/app/food"]', title: "Nutrition", body: "Your targets and food diary. Scan or search foods, add your own, and log meals out." },
  { target: '.tabbar a[href="/app/checkin"]', title: "Check-in", body: "Fill it in on your check-in day. Score your week out of 10, add photos, and I'll reply." },
  { target: '.tabbar a[href="/app/messages"]', title: "Messages", body: "Straight to me. Questions, wins, wobbles, all welcome." },
  { target: 'a[href="/app/progress"]', title: "Progress photos", body: "Your photos side by side, so you can see how far you've come." },
  { title: "That's it", body: "You can replay this any time from the bottom of Home. Any questions, just message me." },
];

function useTarget(selector?: string) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (!selector) return setRect(null);
    const el = document.querySelector(selector);
    if (!el) return setRect(null);
    const update = () => setRect(el.getBoundingClientRect());
    el.scrollIntoView({ block: "nearest" });
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [selector]);
  return rect;
}

/** A short guided tour of the client app. Runs once per device after the intro reel, and can be replayed from Home. */
export function Tour() {
  const [i, setI] = useState<number | null>(null);
  // Only steps whose target is on screen (Progress photos isn't shown while a client waits for their plan).
  const [steps, setSteps] = useState<Step[]>(STEPS);

  const start = useCallback(() => {
    setSteps(STEPS.filter((s) => !s.target || document.querySelector(s.target)));
    setI(0);
  }, []);

  useEffect(() => {
    const onStart = () => start();
    window.addEventListener(TOUR_EVENT, onStart);
    let seen = true;
    try {
      seen = localStorage.getItem(KEY) === "1";
    } catch {}
    let timer: ReturnType<typeof setInterval> | undefined;
    if (!seen) {
      // Wait for the intro reel to close first.
      timer = setInterval(() => {
        if (!document.querySelector(".intro")) {
          clearInterval(timer);
          start();
        }
      }, 400);
    }
    return () => {
      window.removeEventListener(TOUR_EVENT, onStart);
      if (timer) clearInterval(timer);
    };
  }, [start]);

  const step = i == null ? null : steps[i];
  const rect = useTarget(step?.target);

  function finish() {
    setI(null);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  }

  useEffect(() => {
    if (i == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setI((n) => (n == null ? n : Math.min(n + 1, steps.length - 1)));
      if (e.key === "ArrowLeft") setI((n) => (n == null ? n : Math.max(n - 1, 0)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, steps.length]);

  if (!step || i == null) return null;
  const last = i === steps.length - 1;
  const pad = 6;
  const ring = rect ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;
  // Card sits above the target when it's in the lower half of the screen, otherwise below.
  const below = ring && ring.top + ring.height / 2 < window.innerHeight / 2;
  const cardStyle: React.CSSProperties = !ring
    ? {}
    : below
      ? { top: ring.top + ring.height + 14 }
      : { bottom: window.innerHeight - ring.top + 14 };

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {ring ? <div className="tour-ring" style={ring} /> : <div className="tour-dim" />}
      <div className={`tour-card card${ring ? "" : " mid"}`} style={cardStyle}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="eyebrow">
            {i + 1} of {steps.length}
          </span>
          {!last ? (
            <button className="link small" onClick={finish}>
              Skip tour
            </button>
          ) : null}
        </div>
        <h2 id="tour-title" style={{ margin: 0 }}>
          {step.title}
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          {step.body}
        </p>
        <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
          {i > 0 ? (
            <button className="btn" onClick={() => setI(i - 1)}>
              Back
            </button>
          ) : null}
          <button className="btn primary" autoFocus onClick={() => (last ? finish() : setI(i + 1))}>
            {last ? "Done" : i === 0 ? "Show me" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** "Replay the tour" link for Home. */
export function ReplayTour() {
  return (
    <button className="link small" onClick={() => window.dispatchEvent(new Event(TOUR_EVENT))}>
      Replay the app tour
    </button>
  );
}
