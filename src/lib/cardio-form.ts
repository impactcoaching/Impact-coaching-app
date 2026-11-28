// Reads the cardio editor form. Used for a client's cardio and for a programme template's cardio.

import { z } from "zod";

const uuid = z.string().uuid();
const optInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(min).max(max).nullable());
const text = (max: number) => z.preprocess((v) => String(v ?? "").trim().slice(0, max) || null, z.string().nullable());

const sessionInput = z.object({
  day: optInt(1, 7),
  kind: z.string().trim().min(1).max(60),
  minutes: optInt(1, 600),
  mode: z.enum(["hr", "rpe", "speed", "intervals"]),
  target: text(80),
  iv_work: optInt(1, 3600),
  iv_rest: optInt(0, 3600),
  iv_rounds: optInt(1, 100),
  timing: text(40),
  notes: text(500),
});

export type ParsedCardio = {
  weekly_minutes: number;
  daily_steps: number | null;
  extra_counts: boolean;
  sessions: (Omit<z.infer<typeof sessionInput>, "minutes"> & { id: string | null; minutes: number; position: number })[];
};

export function parseCardioForm(form: FormData): { error: string } | { data: ParsedCardio } {
  const target = optInt(0, 3000).safeParse(form.get("weekly_minutes"));
  const steps = optInt(0, 60000).safeParse(form.get("daily_steps"));
  if (!target.success) return { error: "Weekly minutes should be a whole number up to 3000." };
  if (!steps.success) return { error: "Daily steps should be a whole number up to 60,000." };

  const sessions: ParsedCardio["sessions"] = [];
  for (const [i, k] of form.getAll("row").map(String).entries()) {
    const get = (f: string) => form.get(`${f}_${k}`);
    const p = sessionInput.safeParse(Object.fromEntries(["day", "kind", "minutes", "mode", "target", "iv_work", "iv_rest", "iv_rounds", "timing", "notes"].map((f) => [f, get(f)])));
    if (!p.success) return { error: `Check session ${i + 1}: minutes are 1 to 600, intervals need seconds on and rounds.` };
    const d = p.data;
    if (d.mode === "intervals" && (!d.iv_work || !d.iv_rounds)) return { error: `Session ${i + 1} is intervals, so it needs seconds on and the number of rounds.` };
    const id = uuid.safeParse(get("id"));
    sessions.push({ ...d, id: id.success ? id.data : null, minutes: d.minutes ?? 30, position: i });
  }
  return { data: { weekly_minutes: target.data ?? 0, daily_steps: steps.data, extra_counts: form.get("extra_counts") === "on", sessions } };
}
