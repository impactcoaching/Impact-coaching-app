import { addDays, isoWeekday } from "@/lib/nutrition";

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const CARDIO_KINDS = ["Incline walk", "Outdoor walk", "Stairmaster", "Bike", "Cross trainer", "Rower", "Run", "HIIT bike", "HIIT sprints", "Swim", "Class", "Other"] as const;

export const CARDIO_MODES = [
  { value: "hr", label: "Heart rate zone" },
  { value: "rpe", label: "Effort (RPE)" },
  { value: "speed", label: "Speed and incline" },
  { value: "intervals", label: "Intervals" },
] as const;
export type CardioMode = (typeof CARDIO_MODES)[number]["value"];

export const HR_ZONES = ["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5"] as const;
export const RPE_VALUES = ["3", "4", "5", "6", "7", "8", "9"] as const;
export const CARDIO_TIMING = ["Any time", "Fasted, morning", "After training", "Separate session", "Evening"] as const;

export const ZONE_HELP: Record<string, string> = {
  "Zone 1": "Very easy. You could chat all day.",
  "Zone 2": "You could hold a conversation in full sentences, but you'd rather not.",
  "Zone 3": "Steady and working. Short sentences only.",
  "Zone 4": "Hard. A few words at a time.",
  "Zone 5": "All out. No talking.",
};

export type CardioPlan = { client_id: string; weekly_minutes: number; daily_steps: number | null; extra_counts: boolean };

export type CardioSession = {
  id: string;
  client_id: string;
  day: number | null;
  kind: string;
  minutes: number;
  mode: CardioMode;
  target: string | null;
  iv_work: number | null;
  iv_rest: number | null;
  iv_rounds: number | null;
  timing: string | null;
  notes: string | null;
  position: number;
};

export type CardioLog = {
  id: string;
  client_id: string;
  session_id: string | null;
  log_date: string;
  kind: string;
  minutes: number;
  avg_hr: number | null;
  distance_km: number | null;
  effort: number | null;
  note: string | null;
};

/** Minutes a session takes. Intervals are worked out from the rounds, plus 5 minutes to warm up and cool down. */
export function sessionMinutes(s: Pick<CardioSession, "mode" | "minutes" | "iv_work" | "iv_rest" | "iv_rounds">) {
  if (s.mode === "intervals" && s.iv_work && s.iv_rounds) return Math.round((s.iv_rounds * (s.iv_work + (s.iv_rest ?? 0))) / 60) + 5;
  return s.minutes;
}

/** "Zone 2", "RPE 6", "5.5 km/h, 10%", "8 × 30 s on, 90 s off". */
export function intensityText(s: Pick<CardioSession, "mode" | "target" | "iv_work" | "iv_rest" | "iv_rounds">) {
  if (s.mode === "intervals") {
    const iv = s.iv_work && s.iv_rounds ? `${s.iv_rounds} × ${s.iv_work} s on, ${s.iv_rest ?? 0} s off` : "Intervals";
    return s.target ? `${iv} · ${s.target}` : iv;
  }
  if (!s.target) return null;
  if (s.mode === "rpe") return `RPE ${s.target}`;
  return s.target;
}

export const dayName = (d: number | null) => (d ? WEEKDAYS[d - 1] : "Any day");

/** Monday of the week that `date` is in, and the 7 dates of that week. */
export function weekOf(date: string) {
  const start = addDays(date, 1 - isoWeekday(date));
  return { start, end: addDays(start, 6), dates: Array.from({ length: 7 }, (_, i) => addDays(start, i)) };
}

/** Minutes that count toward the weekly target: sessions always, extra cardio if the coach allows it. */
export function countedMinutes(logs: Pick<CardioLog, "minutes" | "session_id">[], extraCounts: boolean) {
  return logs.reduce((a, l) => a + (l.session_id || extraCounts ? l.minutes : 0), 0);
}
