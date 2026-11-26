"use server";

import { inFolder } from "@/lib/paths";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCoach, requireProfile } from "@/lib/auth";
import { CYCLE_PHASES, GENERAL, MODULES, PERIOD_CHANGES, type ModuleKey } from "@/lib/checkins";
import { hasConsent, moduleFor } from "@/lib/checkins-server";
import { todayIn } from "@/lib/nutrition";
import { POLICY_VERSION } from "@/lib/options";

const uuid = z.string().uuid();
// ---------- client ----------

const answerValue = z.union([z.number().min(0).max(1_000_000), z.string().max(2000)]);
const photo = z.object({ pose: z.string().trim().min(1).max(60), path: z.string().max(300) });

const checkinInput = z.object({
  weight_kg: z.number().min(25).max(400).nullable(),
  answers: z.record(z.string().max(40), answerValue),
  module_answers: z.record(z.string().max(40), answerValue),
  measurements: z.record(z.string().max(20), z.number().min(10).max(300)).nullable(),
  cycle: z.object({ phase: z.enum(CYCLE_PHASES), period: z.enum(PERIOD_CHANGES).nullable().optional(), day: z.number().int().min(1).max(60).nullable(), note: z.string().max(500).nullable() }).nullable(),
  photos: z.array(photo).max(20),
  custom_answers: z.array(z.object({ q: z.string().max(300), a: z.string().max(2000) })).max(20).optional(),
});

export async function submitCheckin(input: z.input<typeof checkinInput>): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, user, profile } = await requireProfile();
  const parsed = checkinInput.safeParse(input);
  if (!parsed.success) return { error: "Something in the check-in doesn't look right. Check the numbers and try again." };
  const d = parsed.data;

  const [module, { data: settings }, cycleOk, photosOk] = await Promise.all([
    moduleFor(supabase, user.id),
    supabase.from("client_settings").select("*").eq("client_id", user.id).maybeSingle(),
    hasConsent(supabase, user.id, "cycle_data"),
    hasConsent(supabase, user.id, "progress_photos"),
  ]);
  if (d.photos.length && !photosOk) return { error: "Turn on progress photos first, then add them." };
  if (d.photos.some((p) => !inFolder(p.path, user.id))) return { error: "A photo couldn't be attached." };

  // Keep only answers to questions that exist, so nothing unexpected is stored.
  const keep = (vals: Record<string, string | number>, keys: string[]) => Object.fromEntries(Object.entries(vals).filter(([k, v]) => keys.includes(k) && v !== ""));
  const moduleKeys = MODULES[module].questions.map((q) => q.key);
  const asked: string[] = (settings as { custom_questions?: string[] } | null)?.custom_questions ?? [];
  const custom = (d.custom_answers ?? []).filter((x) => asked.includes(x.q) && x.a.trim());

  const { data: row, error } = await supabase
    .from("checkins")
    .insert({
      client_id: user.id,
      module,
      weight_kg: d.weight_kg,
      answers: keep(d.answers, GENERAL.map((q) => q.key)),
      module_answers: keep(d.module_answers, moduleKeys),
      measurements: settings?.measurements ? d.measurements : null,
      cycle: cycleOk ? d.cycle : null,
      ...(custom.length ? { custom_answers: custom } : {}),
    })
    .select("id")
    .single();
  if (error || !row) return { error: "Couldn't send your check-in. Please try again." };

  if (d.photos.length) {
    const taken_on = todayIn(profile.time_zone);
    const { error: pErr } = await supabase.from("progress_photos").insert(d.photos.map((p) => ({ ...p, client_id: user.id, checkin_id: row.id, taken_on })));
    if (pErr) return { error: "Your check-in was sent, but the photos didn't save. Add them again from Progress photos." };
  }
  revalidatePath("/app/checkin");
  return { ok: true };
}

export async function addPhotos(input: { photos: z.input<typeof photo>[] }): Promise<{ error?: string }> {
  const { supabase, user, profile } = await requireProfile();
  const parsed = z.array(photo).min(1).max(20).safeParse(input.photos);
  if (!parsed.success) return { error: "Couldn't add those photos." };
  if (!(await hasConsent(supabase, user.id, "progress_photos"))) return { error: "Turn on progress photos first." };
  if (parsed.data.some((p) => !inFolder(p.path, user.id))) return { error: "A photo couldn't be attached." };
  const { error } = await supabase.from("progress_photos").insert(parsed.data.map((p) => ({ ...p, client_id: user.id, taken_on: todayIn(profile.time_zone) })));
  if (error) return { error: "Couldn't save the photos. Please try again." };
  revalidatePath("/app/progress");
  return {};
}

export async function deletePhoto(id: string): Promise<{ error?: string }> {
  const { supabase } = await requireProfile();
  if (!uuid.safeParse(id).success) return { error: "Not found." };
  const { data } = await supabase.from("progress_photos").select("path").eq("id", id).maybeSingle();
  if (!data) return { error: "Not found." };
  const { error } = await supabase.from("progress_photos").delete().eq("id", id);
  if (error) return { error: "Couldn't delete that photo." };
  await supabase.storage.from("progress-photos").remove([data.path]);
  revalidatePath("/app/progress");
  return {};
}

/** The client turns progress photos on (recorded as a new consent, like at sign-up). */
export async function allowPhotos() {
  const { supabase, user } = await requireProfile();
  await supabase.from("consents").insert({ client_id: user.id, kind: "progress_photos", granted: true, policy_version: POLICY_VERSION });
  revalidatePath("/app/checkin");
  revalidatePath("/app/progress");
}

// ---------- coach ----------

const settingsInput = z.object({
  client_id: uuid,
  checkin_module: z.enum(Object.keys(MODULES) as [ModuleKey, ...ModuleKey[]]),
  measurements: z.boolean(),
  poses: z.array(z.string().trim().min(1).max(60)).max(20).nullable(),
  checkin_day: z.number().int().min(1).max(7).nullable(),
  custom_questions: z.array(z.string().trim().min(1).max(300)).max(20),
});

export async function saveClientSettings(form: FormData) {
  const { supabase } = await requireCoach();
  const poses = String(form.get("poses") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const day = Number(form.get("checkin_day"));
  const parsed = settingsInput.safeParse({
    client_id: form.get("client_id"),
    checkin_module: form.get("checkin_module"),
    measurements: form.get("measurements") === "on",
    poses: form.get("use_template") === "on" ? null : poses.length ? poses : null,
    checkin_day: day >= 1 && day <= 7 ? day : null,
    custom_questions: String(form.get("custom_questions") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  });
  if (!parsed.success) return;
  await supabase.from("client_settings").upsert(parsed.data, { onConflict: "client_id" });
  revalidatePath(`/coach/clients/${parsed.data.client_id}/checkins`);
}

const replyInput = z.object({ id: uuid, reply: z.string().trim().max(4000).nullable(), video_path: z.string().max(300).nullable() });

export async function replyCheckin(input: z.input<typeof replyInput>): Promise<{ error?: string }> {
  const { supabase } = await requireCoach();
  const parsed = replyInput.safeParse(input);
  if (!parsed.success) return { error: "Couldn't send that reply." };
  const { id, reply, video_path } = parsed.data;
  if (!reply && !video_path) return { error: "Write a reply or add a video first." };
  const { data: c } = await supabase.from("checkins").select("client_id").eq("id", id).single();
  if (!c) return { error: "That check-in no longer exists." };
  if (video_path && !inFolder(video_path, c.client_id)) return { error: "That video is in the wrong place." };
  const { data, error } = await supabase
    .from("checkins")
    .update({ coach_reply: reply, reply_video_path: video_path, replied_at: new Date().toISOString(), coach_seen_at: new Date().toISOString() })
    .eq("id", id)
    .select("client_id")
    .single();
  if (error || !data) return { error: "Couldn't send that reply. Please try again." };
  revalidatePath(`/coach/clients/${data.client_id}/checkins`);
  revalidatePath("/coach/checkins");
  return {};
}

export async function markCheckinSeen(form: FormData) {
  const { supabase } = await requireCoach();
  const id = uuid.parse(form.get("id"));
  const { data } = await supabase.from("checkins").update({ coach_seen_at: new Date().toISOString() }).eq("id", id).select("client_id").single();
  if (data) {
    revalidatePath(`/coach/clients/${data.client_id}/checkins`);
    revalidatePath("/coach/checkins");
  }
}

// ---------- messages (both sides) ----------

const messageInput = z.object({
  clientId: uuid,
  body: z.string().trim().max(4000).nullable(),
  attachment_path: z.string().max(300).nullable(),
  attachment_type: z.enum(["image", "video"]).nullable(),
});

export async function sendMessage(input: z.input<typeof messageInput>): Promise<{ error?: string }> {
  const { supabase, user, profile } = await requireProfile();
  const parsed = messageInput.safeParse(input);
  if (!parsed.success) return { error: "Couldn't send that message." };
  const { clientId, body, attachment_path, attachment_type } = parsed.data;
  if (profile.role !== "coach" && clientId !== user.id) return { error: "Couldn't send that message." };
  if (!body && !attachment_path) return { error: "Write a message first." };
  if (attachment_path && (!inFolder(attachment_path, clientId) || !attachment_type)) return { error: "That file couldn't be attached." };
  const { error } = await supabase.from("messages").insert({ client_id: clientId, sender_id: user.id, body: body || null, attachment_path, attachment_type });
  if (error) return { error: "Couldn't send that message. Please try again." };
  revalidatePath(profile.role === "coach" ? `/coach/messages/${clientId}` : "/app/messages");
  return {};
}

/** Mark the other side's messages in this conversation as read. */
export async function markRead(clientId: string) {
  const { supabase, user } = await requireProfile();
  if (!uuid.safeParse(clientId).success) return;
  await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("client_id", clientId).neq("sender_id", user.id).is("read_at", null);
}
