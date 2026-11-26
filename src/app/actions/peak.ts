"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCoach } from "@/lib/auth";
import { isDate } from "@/lib/nutrition";
import { PEAK_START } from "@/lib/peak";

const uuid = z.string().uuid();

export type PeakResult = { error?: string; ok?: string } | null;

function refresh(clientId: string) {
  revalidatePath(`/coach/clients/${clientId}/peak`);
  revalidatePath("/app/peak");
  revalidatePath("/app");
}

/** Start a peak week for a show: one empty row per day, from 6 days out to show day. */
export async function startPeakWeek(_prev: PeakResult, form: FormData): Promise<PeakResult> {
  const { supabase } = await requireCoach();
  const clientId = uuid.safeParse(form.get("client_id"));
  const show = String(form.get("show_date") ?? "");
  if (!clientId.success || !isDate(show)) return { error: "Pick the show date." };
  const { data: week, error } = await supabase.from("peak_weeks").insert({ client_id: clientId.data, show_date: show }).select("id").single();
  if (error || !week) return { error: "Couldn't start the peak week. Please try again." };
  const rows = Array.from({ length: 1 - PEAK_START }, (_, i) => ({ peak_week_id: week.id, client_id: clientId.data, day_offset: PEAK_START + i }));
  const { error: dErr } = await supabase.from("peak_days").insert(rows);
  if (dErr) return { error: "The peak week was made but the days didn't save. Refresh and try again." };
  refresh(clientId.data);
  return { ok: "Peak week started." };
}

const intOrNull = (max: number) =>
  z.preprocess((v) => {
    const s = String(v ?? "").trim().replace(",", ".");
    return s === "" ? null : Number(s);
  }, z.number().min(0).max(max).nullable());

const dayInput = z.object({
  day_offset: z.number().int().min(-13).max(1),
  carbs_g: intOrNull(2000),
  protein_g: intOrNull(1000),
  fat_g: intOrNull(500),
  water_l: intOrNull(20),
  sodium_mg: intOrNull(20000),
  training: z.string().trim().max(300),
  note: z.string().trim().max(1000),
});

/** Save every day of the plan in one go. */
export async function savePeakWeek(_prev: PeakResult, form: FormData): Promise<PeakResult> {
  const { supabase } = await requireCoach();
  const weekId = uuid.safeParse(form.get("week_id"));
  const show = String(form.get("show_date") ?? "");
  if (!weekId.success || !isDate(show)) return { error: "Check the show date." };
  const { data: week } = await supabase.from("peak_weeks").select("id, client_id").eq("id", weekId.data).maybeSingle();
  if (!week) return { error: "That peak week no longer exists." };

  const offsets = form.getAll("day_offset").map((v) => Number(v));
  const days = [];
  for (const o of offsets) {
    const get = (k: string) => form.get(`${k}_${o}`);
    const parsed = dayInput.safeParse({
      day_offset: o,
      carbs_g: get("carbs_g"),
      protein_g: get("protein_g"),
      fat_g: get("fat_g"),
      water_l: get("water_l"),
      sodium_mg: get("sodium_mg"),
      training: String(get("training") ?? ""),
      note: String(get("note") ?? ""),
    });
    if (!parsed.success) return { error: `Check the numbers for ${o === 0 ? "show day" : o === 1 ? "the day after" : `${-o} days out`}.` };
    const d = parsed.data;
    days.push({
      peak_week_id: week.id,
      client_id: week.client_id,
      day_offset: d.day_offset,
      carbs_g: d.carbs_g == null ? null : Math.round(d.carbs_g),
      protein_g: d.protein_g == null ? null : Math.round(d.protein_g),
      fat_g: d.fat_g == null ? null : Math.round(d.fat_g),
      water_ml: d.water_l == null ? null : Math.round(d.water_l * 1000),
      sodium_mg: d.sodium_mg == null ? null : Math.round(d.sodium_mg),
      training: d.training || null,
      note: d.note || null,
    });
  }
  const notes = String(form.get("notes") ?? "").trim().slice(0, 2000) || null;
  const { error: wErr } = await supabase.from("peak_weeks").update({ show_date: show, notes, is_live: form.get("is_live") === "on" }).eq("id", week.id);
  const { error: dErr } = days.length ? await supabase.from("peak_days").upsert(days, { onConflict: "peak_week_id,day_offset" }) : { error: null };
  if (wErr || dErr) return { error: "Couldn't save. Please try again." };
  refresh(week.client_id);
  return { ok: form.get("is_live") === "on" ? "Saved. The client can see it." : "Saved. Hidden from the client until you turn it on." };
}

/** Add the day after the show, for a post-show plan. */
export async function addDayAfter(form: FormData) {
  const { supabase } = await requireCoach();
  const weekId = uuid.safeParse(form.get("week_id"));
  if (!weekId.success) return;
  const { data: week } = await supabase.from("peak_weeks").select("id, client_id").eq("id", weekId.data).maybeSingle();
  if (!week) return;
  await supabase.from("peak_days").upsert({ peak_week_id: week.id, client_id: week.client_id, day_offset: 1 }, { onConflict: "peak_week_id,day_offset", ignoreDuplicates: true });
  refresh(week.client_id);
}

export async function deletePeakWeek(form: FormData) {
  const { supabase } = await requireCoach();
  const weekId = uuid.safeParse(form.get("week_id"));
  if (!weekId.success) return;
  const { data: week } = await supabase.from("peak_weeks").select("client_id").eq("id", weekId.data).maybeSingle();
  if (!week) return;
  await supabase.from("peak_weeks").delete().eq("id", weekId.data);
  refresh(week.client_id);
}
