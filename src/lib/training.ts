// Shared training types and wording, used by the coach builder and the client tracker.

export type Intensifier =
  | { type: "drop"; drops: number; pct: number }
  | { type: "rp"; mini: number; rest: number }
  | { type: "cluster"; clusters: number; reps: number; rest: number }
  | { type: "myo"; mini: number; reps: number; rest: number }
  | { type: "partials"; reps: number };

export type IntensifierType = Intensifier["type"];

export const INTENSIFIERS: Record<IntensifierType, { label: string; blank: Intensifier }> = {
  drop: { label: "Drop set", blank: { type: "drop", drops: 2, pct: 20 } },
  rp: { label: "Rest-pause", blank: { type: "rp", mini: 3, rest: 15 } },
  cluster: { label: "Cluster set", blank: { type: "cluster", clusters: 4, reps: 3, rest: 20 } },
  myo: { label: "Myo-reps", blank: { type: "myo", mini: 4, reps: 4, rest: 10 } },
  partials: { label: "Partials", blank: { type: "partials", reps: 6 } },
};

export type Exercise = { id: string; name: string; muscle: string; equipment: string[]; demo_url: string | null; cues: string | null };

export type PlanExercise = {
  id?: string;
  exercise_id: string;
  linked_to_previous: boolean;
  warmup_sets: number;
  work_sets: number;
  reps_type: "fixed" | "range" | "amrap" | "time";
  reps_min: number | null;
  reps_max: number | null;
  tempo: string | null;
  effort_type: "RIR" | "RPE" | "%1RM" | "Weight";
  effort_value: string | null;
  rest_seconds: number;
  intensifier: Intensifier | null;
  intensifier_on: "last" | "all";
  film_set: number | null;
  notes: string | null;
};

export const blankPlanExercise = (exercise_id: string): PlanExercise => ({
  exercise_id,
  linked_to_previous: false,
  warmup_sets: 0,
  work_sets: 3,
  reps_type: "range",
  reps_min: 8,
  reps_max: 12,
  tempo: "3-0-1-0",
  effort_type: "RIR",
  effort_value: "2",
  rest_seconds: 90,
  intensifier: null,
  intensifier_on: "last",
  film_set: null,
  notes: null,
});

export function repsText(e: Pick<PlanExercise, "reps_type" | "reps_min" | "reps_max">) {
  if (e.reps_type === "amrap") return "as many as you can";
  if (e.reps_type === "time") return `${e.reps_min ?? 30} s`;
  if (e.reps_type === "range") return `${e.reps_min ?? "?"}–${e.reps_max ?? "?"}`;
  return `${e.reps_min ?? "?"}`;
}

export function effortText(e: Pick<PlanExercise, "effort_type" | "effort_value">) {
  if (!e.effort_value) return "";
  if (e.effort_type === "RIR") return `${e.effort_value} RIR`;
  if (e.effort_type === "RPE") return `RPE ${e.effort_value}`;
  if (e.effort_type === "%1RM") return `${e.effort_value}% of 1RM`;
  return `${e.effort_value} kg`;
}

export function intensifierText(i: Intensifier | null, on: "last" | "all" = "last") {
  if (!i) return "";
  const when = on === "all" ? "every set" : "last set";
  switch (i.type) {
    case "drop":
      return `Drop set × ${i.drops}, about ${i.pct}% lighter each drop, ${when}`;
    case "rp":
      return `Rest-pause: ${i.mini} mini-sets, ${i.rest} s rest, ${when}`;
    case "cluster":
      return `Clusters: ${i.clusters} × ${i.reps} reps, ${i.rest} s between`;
    case "myo":
      return `Myo-reps: activation set, then ${i.mini} mini-sets of ${i.reps}, ${i.rest} s rest`;
    case "partials":
      return `Partials: about ${i.reps} half reps after the last full rep, ${when}`;
  }
}

export function intensifierSteps(i: Intensifier): string[] {
  switch (i.type) {
    case "drop":
      return [
        "Finish the set as normal.",
        ...Array.from({ length: i.drops }, (_, n) => `Drop ${n + 1}: take about ${i.pct}% off straight away and go again close to failure.`),
      ];
    case "rp":
      return ["Finish the set as normal.", ...Array.from({ length: i.mini }, (_, n) => `Rest ${i.rest} s, then mini-set ${n + 1}: as many good reps as you can.`)];
    case "cluster":
      return Array.from({ length: i.clusters }, (_, n) => `Cluster ${n + 1}: ${i.reps} reps${n < i.clusters - 1 ? `, then rest ${i.rest} s` : ""}.`);
    case "myo":
      return ["Activation set: one set to about 1 rep short of failure.", ...Array.from({ length: i.mini }, (_, n) => `Rest ${i.rest} s, then mini-set ${n + 1}: ${i.reps} reps.`)];
    case "partials":
      return ["Finish your full reps.", `Without resting, do about ${i.reps} half reps in the strongest part of the movement.`];
  }
}

/** Group letters: A, B, B2 for a superset, and so on. */
export function setLabels(list: { linked_to_previous: boolean }[]) {
  const out: string[] = [];
  let group = -1;
  list.forEach((e, i) => {
    if (i === 0 || !e.linked_to_previous) group++;
    out.push(String.fromCharCode(65 + group));
  });
  // add numbers where a group has more than one exercise
  const counts: Record<string, number> = {};
  out.forEach((l) => (counts[l] = (counts[l] ?? 0) + 1));
  const seen: Record<string, number> = {};
  return out.map((l) => (counts[l] > 1 ? `${l}${(seen[l] = (seen[l] ?? 0) + 1)}` : l));
}

export function groupName(size: number) {
  return size === 2 ? "Superset" : size === 3 ? "Tri-set" : "Giant set";
}

/** The days a workout is set for, from the database (null before 0016 is run). */
export const workoutDays = (w: { weekdays?: number[] | null }) => (Array.isArray(w.weekdays) ? w.weekdays : []);

/** "Mon, Thu" or "Any day". */
export function daysText(days: number[]) {
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.length ? [...days].sort().map((d) => names[d - 1]).join(", ") : "Any day";
}

/** The calendar date (YYYY-MM-DD) of a moment in the client's time zone. */
export function dateIn(iso: string, tz: string | null) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}
