"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCoach, requireProfile } from "@/lib/auth";
import { isDate } from "@/lib/nutrition";

const uuid = z.string().uuid();
export type CardioResult = { error?: string; ok?: string } | null;

const optInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(min).max(max).nullable());
const optNum = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))), z.number().min(min).max(max).nullable());
const text = (max: number) => z.preprocess((v) => String(v ?? "").trim().slice(0, max) || null, z.string().nullable());

function refresh(clientId: string) {
  revalidatePath(`/coach/clients/${clientId}/cardio`);
  revalidatePath("/app/train");
}

// ---------- coach: targets and sessions ----------

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

/** Save a client's weekly targets and replace their sessions with the ones on the form. */
export async function saveCardioPlan(_prev: CardioResult, form: FormData): Promise<CardioResult> {
  const { supabase } = await requireCoach();
  const clientId = uuid.safeParse(form.get("client_id"));
  if (!clientId.success) return { error: "Something went wrong. Refresh and try again." };
  const target = optInt(0, 3000).safeParse(form.get("weekly_minutes"));
  const steps = optInt(0, 60000).safeParse(form.get("daily_steps"));
  if (!target.success) return { error: "Weekly minutes should be a whole number up to 3000." };
  if (!steps.success) return { error: "Daily steps should be a whole number up to 60,000." };

  const keys = form.getAll("row").map(String);
  const rows = [];
  for (const [i, k] of keys.entries()) {
    const get = (f: string) => form.get(`${f}_${k}`);
    const p = sessionInput.safeParse({
      day: get("day"),
      kind: get("kind"),
      minutes: get("minutes"),
      mode: get("mode"),
      target: get("target"),
      iv_work: get("iv_work"),
      iv_rest: get("iv_rest"),
      iv_rounds: get("iv_rounds"),
      timing: get("timing"),
      notes: get("notes"),
    });
    if (!p.success) return { error: `Check session ${i + 1}: minutes are 1 to 600, intervals need seconds on and rounds.` };
    const d = p.data;
    if (d.mode === "intervals" && (!d.iv_work || !d.iv_rounds)) return { error: `Session ${i + 1} is intervals, so it needs seconds on and the number of rounds.` };
    const id = uuid.safeParse(get("id"));
    rows.push({ ...d, id: id.success ? id.data : crypto.randomUUID(), minutes: d.minutes ?? 30, client_id: clientId.data, position: i });
  }

  const { error: pErr } = await supabase
    .from("cardio_plans")
    .upsert({ client_id: clientId.data, weekly_minutes: target.data ?? 0, daily_steps: steps.data, extra_counts: form.get("extra_counts") === "on" });
  if (pErr) return { error: "Couldn't save the targets. Please try again." };
  // Keep each session's id, so cardio already logged against it stays linked to it.
  if (rows.length) {
    const { error } = await supabase.from("cardio_sessions").upsert(rows);
    if (error) return { error: "Couldn't save the sessions. Please try again." };
  }
  let del = supabase.from("cardio_sessions").delete().eq("client_id", clientId.data);
  if (rows.length) del = del.not("id", "in", `(${rows.map((r) => r.id).join(",")})`);
  const { error: dErr } = await del;
  if (dErr) return { error: "Couldn't remove old sessions. Please try again." };
  refresh(clientId.data);
  return { ok: "Saved. It's in their Train tab now." };
}

// ---------- client: logging ----------

const logInput = z.object({
  session_id: z.preprocess((v) => (v ? v : null), uuid.nullable()),
  log_date: z.string().refine((s) => isDate(s)),
  kind: z.string().trim().min(1).max(60),
  minutes: z.preprocess((v) => Number(v), z.number().int().min(1).max(600)),
  avg_hr: optInt(30, 230),
  distance_km: optNum(0, 500),
  effort: optInt(1, 10),
  note: text(500),
});

export async function logCardio(_prev: CardioResult, form: FormData): Promise<CardioResult> {
  const { supabase, user } = await requireProfile();
  const p = logInput.safeParse(Object.fromEntries(["session_id", "log_date", "kind", "minutes", "avg_hr", "distance_km", "effort", "note"].map((k) => [k, form.get(k)])));
  if (!p.success) return { error: "Add your minutes (1 to 600). Heart rate and distance are optional." };
  const { error } = await supabase.from("cardio_logs").insert({ ...p.data, client_id: user.id });
  if (error) return { error: error.message.includes("row-level security") ? "Your free trial has finished, so you can't add new cardio." : "Couldn't save that. Please try again." };
  revalidatePath("/app/train");
  return { ok: `${p.data.minutes} minutes logged. Nice one.` };
}

export async function deleteCardioLog(form: FormData) {
  const { supabase, user } = await requireProfile();
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return;
  await supabase.from("cardio_logs").delete().eq("id", id.data).eq("client_id", user.id);
  revalidatePath("/app/train");
}

export async function saveSteps(_prev: CardioResult, form: FormData): Promise<CardioResult> {
  const { supabase, user } = await requireProfile();
  const date = String(form.get("log_date") ?? "");
  const steps = optInt(0, 150000).safeParse(String(form.get("steps") ?? "").replace(/[,\s]/g, ""));
  if (!isDate(date) || !steps.success || steps.data == null) return { error: "Steps should be a whole number." };
  const { error } = await supabase.from("step_logs").upsert({ client_id: user.id, log_date: date, steps: steps.data });
  if (error) return { error: "Couldn't save your steps. Please try again." };
  revalidatePath("/app/train");
  return { ok: "Steps saved." };
}
