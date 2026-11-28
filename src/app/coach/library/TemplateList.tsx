"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AUDIENCE, COMPETITOR, GOALS, LEVELS, type TemplateKind } from "@/lib/templates";

export type TemplateCard = {
  id: string;
  href: string;
  name: string;
  summary: string | null;
  goal: string | null;
  level: string | null;
  location: string | null;
  audience: keyof typeof AUDIENCE;
  competitor: keyof typeof COMPETITOR;
  tags: string[];
  tagLine: string;
  /** "4 days a week · 4 sessions" or "Meal plan · 1,600 to 1,850 kcal" */
  facts: string;
  days: number | null;
  missing: number;
};

const any = "";

/** Search and filter the templates. There are only ever a few dozen, so it's all done on the page. */
export function TemplateList({ kind, items }: { kind: TemplateKind; items: TemplateCard[] }) {
  const [q, setQ] = useState("");
  const [goal, setGoal] = useState(any);
  const [level, setLevel] = useState(any);
  const [days, setDays] = useState(any);
  const [who, setWho] = useState(any);
  const [comp, setComp] = useState(any);

  const goals = [...new Set([...GOALS[kind], ...items.map((i) => i.goal).filter((g): g is string => !!g)])];
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!t || `${i.name} ${i.summary ?? ""} ${i.tags.join(" ")}`.toLowerCase().includes(t)) &&
        (!goal || i.goal === goal) &&
        (!level || i.level === level) &&
        (!days || String(i.days) === days) &&
        // "Women" shows templates for women and for anyone; same for competitors.
        (!who || i.audience === who || i.audience === "any") &&
        (!comp || i.competitor === comp || i.competitor === "any"),
    );
  }, [items, q, goal, level, days, who, comp]);
  const filtered = !!(q || goal || level || days || who || comp);

  return (
    <>
      <div className="card">
        <input className="ctl" type="search" placeholder={kind === "training" ? "Search, e.g. glutes or push pull legs" : "Search, e.g. 1600 or vegetarian"} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search templates" />
        <div className="tfilters">
          <select className="ctl" value={goal} onChange={(e) => setGoal(e.target.value)} aria-label="Goal">
            <option value={any}>Any goal</option>
            {goals.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <select className="ctl" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Level">
            <option value={any}>Any level</option>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          {kind === "training" ? (
            <select className="ctl" value={days} onChange={(e) => setDays(e.target.value)} aria-label="Days a week">
              <option value={any}>Any days a week</option>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>
                  {d} {d === 1 ? "day" : "days"} a week
                </option>
              ))}
            </select>
          ) : null}
          <select className="ctl" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Women or men">
            <option value={any}>Women and men</option>
            <option value="female">Women</option>
            <option value="male">Men</option>
          </select>
          <select className="ctl" value={comp} onChange={(e) => setComp(e.target.value)} aria-label="Competing">
            <option value={any}>Competing or not</option>
            <option value="yes">Competitors</option>
            <option value="no">Non-competitors</option>
          </select>
        </div>
        {filtered ? (
          <button
            className="link small"
            style={{ alignSelf: "flex-start" }}
            onClick={() => {
              setQ("");
              setGoal(any);
              setLevel(any);
              setDays(any);
              setWho(any);
              setComp(any);
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {!items.length ? (
        <p className="muted">
          No {kind === "training" ? "programme" : "nutrition"} templates yet. Make one here, or open a client&apos;s {kind === "training" ? "Training" : "Nutrition"} tab and save theirs as a template.
        </p>
      ) : !shown.length ? (
        <p className="muted">Nothing matches those filters.</p>
      ) : (
        <div className="tgrid">
          {shown.map((i) => (
            <Link key={i.id} href={i.href} className="card tcard">
              <span className="eyebrow">{i.tagLine || "No tags yet"}</span>
              <b className="tcard-name">{i.name}</b>
              {i.summary ? <span className="muted small">{i.summary}</span> : null}
              <span className="small">{i.facts}</span>
              {i.tags.length || i.missing ? (
                <span className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  {i.tags.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                  {i.missing ? <span className="chip warn">{i.missing} not in library</span> : null}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
