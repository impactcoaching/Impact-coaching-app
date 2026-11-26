"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

// Each section has its own short tour, shown the first time a client opens it.
// Steps whose target isn't on screen are left out (a client with no plan yet sees fewer).

const PREFIX = "ic-tour-";
const TOUR_EVENT = "ic-start-tour";

type Step = { target?: string; title: string; body: string };
type TourDef = { id: string; match: (path: string) => boolean; steps: Step[] };

const t = (k: string) => `[data-tour="${k}"]`;

const TOURS: TourDef[] = [
  {
    id: "home",
    match: (p) => p === "/app",
    steps: [
      { title: "Quick look round?", body: "Five tabs along the bottom. Here's what each one does. It takes about 30 seconds." },
      { target: '.tabbar a[href="/app"]', title: "Home", body: "Your week at a glance: what's on today, your countdown and anything from me." },
      { target: '.tabbar a[href="/app/train"]', title: "Train", body: "Your programme. Log your sets as you go and send me clips to check your form." },
      { target: '.tabbar a[href="/app/food"]', title: "Nutrition", body: "Your targets and food diary, plus help when you're eating out." },
      { target: '.tabbar a[href="/app/checkin"]', title: "Check-in", body: "Your weekly check-in. Score your week, add photos, and I'll reply." },
      { target: '.tabbar a[href="/app/messages"]', title: "Messages", body: "Straight to me. Questions, wins, wobbles, all welcome." },
      { target: 'a[href="/app/progress"]', title: "Progress photos", body: "Your photos side by side, so you can see how far you've come." },
      { title: "That's the basics", body: "Each section has its own quick tour the first time you open it. You can replay them all from the bottom of Home." },
    ],
  },
  {
    id: "train",
    match: (p) => p === "/app/train",
    steps: [
      { target: t("workout"), title: "Your sessions", body: "Each card is one session in your programme. It shows how many exercises and when you last did it." },
      { target: t("workout"), title: "Start a session", body: "Tap a session to open it and start logging. Do them in whatever order suits your week unless I've said otherwise." },
    ],
  },
  {
    id: "workout",
    match: (p) => /^\/app\/train\/[^/]+$/.test(p),
    steps: [
      { target: t("progress"), title: "Your progress", body: "This bar fills up as you tick off sets, so you can see how far through you are." },
      { target: t("ex-head"), title: "Each exercise", body: "The exercise name, with anything I've noted for you underneath." },
      { target: t("ex-meta"), title: "What to aim for", body: "Sets and reps, how hard to push (RIR is reps left in the tank), the tempo and your rest time." },
      { target: t("demo"), title: "Demo", body: "Not sure how it's done? Tap here for a demo video." },
      { target: t("set"), title: "Log a set", body: "Type the weight and reps you did. The grey numbers are what you did last time, so you know what to beat." },
      { target: t("tick"), title: "Tick it off", body: "Tick each set when it's done. Your rest timer starts on its own at the bottom of the screen." },
      { target: t("int"), title: "Intensifiers", body: "If a set has a drop set, rest-pause or similar, it shows here beside the set. Tap it to see exactly what to do." },
      { target: t("film"), title: "Film a set", body: "Want me to check your form? Film the set here and I'll see the clip with your session." },
      { target: t("finish"), title: "Finish up", body: "Add a note if anything felt off, then save. I'll see the whole session." },
    ],
  },
  {
    id: "food",
    match: (p) => p === "/app/food",
    steps: [
      { target: t("daybar"), title: "Pick a day", body: "Today shows first. Use the arrows to look back or fill in a day you missed." },
      { target: t("targets"), title: "Your targets", body: "What's left for today, and bars for protein, carbs and fat. If you have different day types, pick today's at the top." },
      { target: t("water"), title: "Water", body: "Tap to add a glass or bottle as you go through the day." },
      { target: t("portions"), title: "Hand portions", body: "Tap plus or minus as you eat each portion. No weighing needed." },
      { target: t("meals"), title: "Your meals", body: "The meals I've planned for you. Tap Ate this to log the whole meal in one go." },
      { target: t("swap"), title: "Swaps", body: "Fancy something different? Swap a food and the amount is worked out to keep the meal on target." },
      { target: t("diary"), title: "Your diary", body: "Everything you've logged today, by meal." },
      { target: t("add-food"), title: "Add food", body: "Search for a food or type a barcode. Your recent foods are at the top, and you can add your own." },
      { target: t("eat-out"), title: "Eating out", body: "Out for a meal? Snap the menu and send it to me, or get a quick suggestion that fits the rest of your day." },
    ],
  },
  {
    id: "checkin",
    match: (p) => p === "/app/checkin",
    steps: [
      { target: t("ci-weight"), title: "Weight", body: "Weigh in the morning, after the loo and before food, so it's the same each week." },
      { target: t("ci-scores"), title: "Score your week", body: "Tap a number out of 10 for each one. Be honest, there are no wrong answers. It helps me adjust your plan." },
      { target: t("ci-module"), title: "Your goal questions", body: "A few extra questions for your goal, and any I've added just for you." },
      { target: t("ci-cycle"), title: "Your cycle", body: "Optional. It helps me make sense of changes in weight, hunger and energy." },
      { target: t("ci-measure"), title: "Measurements", body: "Optional. Measure in the same spots each time." },
      { target: t("ci-photos"), title: "Photos", body: "Same light, same spot, same time of day if you can. Only you and I see them." },
      { target: t("ci-send"), title: "Send it", body: "Send it when you're done. I'll reply here, sometimes with a short video." },
      { target: t("ci-history"), title: "Past check-ins", body: "Your earlier check-ins and my replies are all kept here." },
    ],
  },
  {
    id: "messages",
    match: (p) => p === "/app/messages",
    steps: [
      { target: t("chat-input"), title: "Message me", body: "Ask anything, any time. I'll reply as soon as I can." },
      { target: t("chat-attach"), title: "Photos and videos", body: "Send a photo or a short video, like a meal, a machine you're not sure about, or a lift." },
    ],
  },
  {
    id: "progress",
    match: (p) => p === "/app/progress",
    steps: [
      { target: t("compare"), title: "Compare", body: "Pick two dates and a pose, then view them side by side, with a slider, or overlaid." },
      { target: t("add-photos"), title: "Add photos", body: "Add photos here any time, not just on check-in day." },
    ],
  },
  {
    id: "peak",
    match: (p) => p === "/app/peak",
    steps: [
      { target: t("peak-days"), title: "Your peak week", body: "Each day's carbs, water, sodium and training, set by me. Today is highlighted." },
      { target: t("peak-days"), title: "Stick to the plan", body: "Follow it exactly. If anything feels off, message me before changing anything." },
    ],
  },
];

function key(id: string) {
  return PREFIX + id;
}
function seen(id: string) {
  try {
    return localStorage.getItem(key(id)) === "1";
  } catch {
    return true;
  }
}
function markSeen(id: string) {
  try {
    localStorage.setItem(key(id), "1");
  } catch {}
}

function useTarget(selector: string | undefined, tick: number) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (!selector) return setRect(null);
    const el = document.querySelector(selector);
    if (!el) return setRect(null);
    const update = () => setRect(el.getBoundingClientRect());
    // Tall cards scroll to their top so the heading shows above the tour card.
    el.scrollIntoView({ block: el.getBoundingClientRect().height > window.innerHeight * 0.4 ? "start" : "center" });
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [selector, tick]);
  return rect;
}

/** Runs each section's tour once per device, after the intro reel. Replayable from Home. */
export function Tour({ at }: { at?: string } = {}) {
  const pathname = usePathname();
  const path = at ?? pathname;
  const [run, setRun] = useState<{ id: string; steps: Step[]; i: number } | null>(null);

  const start = useCallback((def: TourDef) => {
    const steps = def.steps.filter((s) => !s.target || document.querySelector(s.target));
    // Nothing to point at yet (no plan, no photos): try again next visit.
    if (!steps.some((s) => s.target)) return;
    setRun({ id: def.id, steps, i: 0 });
  }, []);

  useEffect(() => {
    setRun(null);
    const def = TOURS.find((d) => d.match(path));
    if (!def || seen(def.id)) return;
    // Wait for the intro reel to close and the page to settle.
    let waited = 0;
    const timer = setInterval(() => {
      waited += 400;
      if (document.querySelector(".intro") || waited < 800) return;
      clearInterval(timer);
      start(def);
    }, 400);
    return () => clearInterval(timer);
  }, [path, start]);

  useEffect(() => {
    const onStart = () => {
      TOURS.forEach((d) => {
        try {
          localStorage.removeItem(key(d.id));
        } catch {}
      });
      const def = TOURS.find((d) => d.match(path));
      if (def) start(def);
    };
    window.addEventListener(TOUR_EVENT, onStart);
    return () => window.removeEventListener(TOUR_EVENT, onStart);
  }, [path, start]);

  const step = run ? run.steps[run.i] : undefined;
  const rect = useTarget(step?.target, run?.i ?? -1);

  const finish = useCallback(() => {
    if (run) markSeen(run.id);
    setRun(null);
  }, [run]);
  const go = useCallback((d: number) => setRun((r) => (r ? { ...r, i: Math.min(Math.max(r.i + d, 0), r.steps.length - 1) } : r)), []);

  useEffect(() => {
    if (!run) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, finish, go]);

  if (!run || !step) return null;
  const { i, steps } = run;
  const last = i === steps.length - 1;
  const pad = 6;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const ring = rect ? { left: rect.left - pad, top: Math.max(rect.top - pad, 4), width: rect.width + pad * 2, height: Math.min(rect.height + pad * 2, vh - 8) } : null;
  // Put the card wherever there's more room. If the target fills the screen, the card sits over its lower part.
  let cardStyle: React.CSSProperties = {};
  if (ring) {
    const above = ring.top;
    const below = vh - (ring.top + ring.height);
    if (below >= 230 && below >= above) cardStyle = { top: ring.top + ring.height + 14 };
    else if (above >= 230) cardStyle = { bottom: vh - ring.top + 14 };
    else cardStyle = { bottom: 96 };
  }

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
            <button className="btn" onClick={() => go(-1)}>
              Back
            </button>
          ) : null}
          <button className="btn primary" autoFocus onClick={() => (last ? finish() : go(1))}>
            {last ? "Got it" : i === 0 && !step.target ? "Show me" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** "Replay the tours" link for Home: resets every section's tour and starts Home's. */
export function ReplayTour() {
  return (
    <button className="link small" onClick={() => window.dispatchEvent(new Event(TOUR_EVENT))}>
      Replay the app tours
    </button>
  );
}
