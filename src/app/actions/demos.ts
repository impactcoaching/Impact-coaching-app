"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCoach, requireProfile } from "@/lib/auth";
import { youtubeEmbed, type Demo } from "@/lib/demos";
import { ALL_EQUIPMENT } from "@/lib/options";
import { inFolder } from "@/lib/paths";
import { bestWorkoutXMatch, searchWorkoutX, workoutxMedia, workoutxReady, WorkoutXError, type WxExercise } from "@/lib/workoutx";

const uuid = z.string().uuid();
const wxId = z.string().regex(/^ex_[A-Za-z0-9]{3,20}$/).nullable();
const BUCKET = "exercise-demos";

// ---------- anyone signed in: play a demo ----------

/** The demo to play for one exercise. Clients see the female or male model to match them, where WorkoutX has both. */
export async function getDemo(exerciseId: string): Promise<Demo> {
  const { supabase, user, profile } = await requireProfile();
  const id = uuid.safeParse(exerciseId);
  if (!id.success) return { kind: "none", reason: "That exercise wasn't found." };
  const { data: e } = await supabase.from("exercises").select("demo_path, wx_female, wx_male, demo_url").eq("id", id.data).maybeSingle();
  if (!e) return { kind: "none", reason: "That exercise wasn't found." };

  if (e.demo_path) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(e.demo_path, 6 * 3600);
    if (data?.signedUrl) return { kind: "video", src: data.signedUrl, poster: null, stock: false, watermarked: false };
  }

  if (e.wx_female || e.wx_male) {
    let order = [e.wx_female, e.wx_male];
    if (profile.role === "client") {
      const { data: intake } = await supabase.from("client_intake").select("sex").eq("client_id", user.id).maybeSingle();
      if (intake?.sex === "male") order = [e.wx_male, e.wx_female];
    }
    for (const wid of order.filter((x): x is string => Boolean(x))) {
      try {
        const m = await workoutxMedia(wid);
        if (m) return { kind: "video", src: m.mp4, poster: m.poster, stock: true, watermarked: m.watermarked };
      } catch {
        // fall through to the other model, then the link
      }
    }
  }

  const embed = youtubeEmbed(e.demo_url);
  if (embed) return { kind: "embed", src: embed };
  if (e.demo_url) return { kind: "link", href: e.demo_url };
  return { kind: "none", reason: "The demo isn't loading just now. Try again in a minute." };
}

// ---------- coach: the Library ----------

const exerciseForm = z.object({
  name: z.string().trim().min(2, "Give it a name").max(80),
  muscle: z.string().trim().min(2, "Pick a muscle group").max(40),
  cues: z.string().trim().max(1000).optional(),
  demo_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\/\S+$/i.test(v), "Links need to start with https://")
    .optional(),
});

function readForm(form: FormData) {
  const parsed = exerciseForm.safeParse({
    name: form.get("name") ?? "",
    muscle: form.get("muscle") ?? "",
    cues: form.get("cues") ?? "",
    demo_url: form.get("demo_url") ?? "",
  });
  const equipment = form.getAll("equipment").map(String).filter((k) => (ALL_EQUIPMENT as string[]).includes(k));
  return { parsed, equipment };
}

type Result = { ok?: true; error?: string };

export async function createExercise(_: Result | null, form: FormData): Promise<Result> {
  const { supabase } = await requireCoach();
  const { parsed, equipment } = readForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data, error } = await supabase
    .from("exercises")
    .insert({ name: parsed.data.name, muscle: parsed.data.muscle, equipment, cues: parsed.data.cues || null })
    .select("id")
    .single();
  if (error?.code === "23505") return { error: "There's already an exercise with that name." };
  if (error || !data) return { error: "That didn't save. Try again." };
  revalidatePath("/coach/library");
  redirect(`/coach/library/${data.id}`);
}

export async function saveExercise(_: Result | null, form: FormData): Promise<Result> {
  const { supabase } = await requireCoach();
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return { error: "That exercise wasn't found." };
  const { parsed, equipment } = readForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase
    .from("exercises")
    .update({ name: parsed.data.name, muscle: parsed.data.muscle, equipment, cues: parsed.data.cues || null, demo_url: parsed.data.demo_url || null })
    .eq("id", id.data);
  if (error?.code === "23505") return { error: "There's already an exercise with that name." };
  if (error) return { error: "That didn't save. Try again." };
  revalidatePath("/coach/library");
  revalidatePath(`/coach/library/${id.data}`);
  return { ok: true };
}

export async function deleteExercise(form: FormData) {
  const { supabase } = await requireCoach();
  const id = uuid.parse(form.get("id"));
  const { data: e } = await supabase.from("exercises").select("demo_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) redirect(`/coach/library/${id}?error=in-use`);
  if (e?.demo_path) await supabase.storage.from(BUCKET).remove([e.demo_path]);
  revalidatePath("/coach/library");
  redirect("/coach/library");
}

/** After the browser uploads the coach's own video into exercise-demos/coach/, link it to the exercise. */
export async function setOwnVideo(exerciseId: string, path: string | null): Promise<Result> {
  const { supabase } = await requireCoach();
  const id = uuid.safeParse(exerciseId);
  if (!id.success) return { error: "That exercise wasn't found." };
  if (path !== null && !inFolder(path, "coach")) return { error: "That upload didn't work. Try again." };
  const { data: before } = await supabase.from("exercises").select("demo_path").eq("id", id.data).maybeSingle();
  const { error } = await supabase.from("exercises").update({ demo_path: path }).eq("id", id.data);
  if (error) return { error: "That didn't save. Try again." };
  if (before?.demo_path && before.demo_path !== path) await supabase.storage.from(BUCKET).remove([before.demo_path]);
  revalidatePath("/coach/library");
  revalidatePath(`/coach/library/${id.data}`);
  return { ok: true };
}

export async function searchStock(q: string): Promise<{ results?: WxExercise[]; error?: string }> {
  await requireCoach();
  if (!workoutxReady()) return { error: "WorkoutX isn't set up yet. Add WORKOUTX_API_KEY in Vercel first." };
  const term = q.trim().slice(0, 60);
  if (term.length < 3) return { error: "Type at least 3 letters." };
  try {
    return { results: await searchWorkoutX(term, 10) };
  } catch (e) {
    return { error: e instanceof WorkoutXError ? e.message : "WorkoutX didn't answer. Try again in a minute." };
  }
}

export async function setStock(exerciseId: string, female: string | null, male: string | null): Promise<Result> {
  const { supabase } = await requireCoach();
  const id = uuid.safeParse(exerciseId);
  const f = wxId.safeParse(female);
  const m = wxId.safeParse(male);
  if (!id.success || !f.success || !m.success) return { error: "That clip wasn't recognised." };
  const { error } = await supabase.from("exercises").update({ wx_female: f.data, wx_male: m.data, wx_auto: false }).eq("id", id.data);
  if (error) return { error: "That didn't save. Try again." };
  revalidatePath("/coach/library");
  revalidatePath(`/coach/library/${id.data}`);
  return { ok: true };
}

/**
 * Find stock clips for a few exercises that have none (the free WorkoutX plan allows 30 requests a minute,
 * so the Library page calls this in small batches and waits when asked to).
 */
export async function autoMatchStock(skipIds: string[]): Promise<{ matched: number; missed: { id: string; name: string }[]; remaining: number; wait?: boolean; error?: string }> {
  const { supabase } = await requireCoach();
  const none = { matched: 0, missed: [], remaining: 0 };
  if (!workoutxReady()) return { ...none, error: "WorkoutX isn't set up yet. Add WORKOUTX_API_KEY in Vercel first." };
  const skip = new Set(skipIds.filter((x) => uuid.safeParse(x).success));
  const { data } = await supabase.from("exercises").select("id, name").is("wx_female", null).is("wx_male", null).order("name");
  const todo = (data ?? []).filter((e) => !skip.has(e.id));
  let matched = 0;
  const missed: { id: string; name: string }[] = [];
  const batch = todo.slice(0, 5);
  for (const [i, e] of batch.entries()) {
    try {
      const m = await bestWorkoutXMatch(e.name);
      if (!m || (!m.female && !m.male)) missed.push(e);
      else {
        await supabase.from("exercises").update({ wx_female: m.female, wx_male: m.male, wx_auto: true }).eq("id", e.id);
        matched++;
      }
    } catch (err) {
      revalidatePath("/coach/library");
      const remaining = todo.length - i;
      if (err instanceof WorkoutXError && err.status === 429) return { matched, missed, remaining, wait: true };
      return { matched, missed, remaining, error: err instanceof WorkoutXError ? err.message : "WorkoutX stopped answering. Try again in a minute." };
    }
  }
  revalidatePath("/coach/library");
  return { matched, missed, remaining: todo.length - batch.length };
}
