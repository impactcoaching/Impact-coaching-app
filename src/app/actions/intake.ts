"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { ALL_EQUIPMENT, POLICY_VERSION, SCREENING } from "@/lib/options";

export type IntakeState = { error?: string } | undefined;

const optText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();
const optNum = (min: number, max: number) =>
  z
    .union([z.literal(""), z.coerce.number().min(min).max(max)])
    .transform((v) => (v === "" ? null : v))
    .optional();
const optDate = z
  .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
  .transform((v) => (v === "" ? null : v))
  .optional();

const schema = z.object({
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Add your date of birth"),
  phone: optText(40),
  sex: z.enum(["female", "male"], { message: "Please choose female or male" }),
  country: z.string().min(2).max(10),
  time_zone: z.string().max(60).optional(),
  goal: z.enum(["fat_loss", "muscle", "competition", "health", "performance"], { message: "Pick a goal" }),
  goal_detail: optText(),
  goal_date: optDate,
  competes: z.enum(["yes", "no"]).default("no"),
  federation: optText(60),
  division: optText(60),
  height_cm: optNum(100, 250),
  start_weight_kg: optNum(30, 300),
  days_per_week: optNum(1, 7),
  session_minutes: optNum(15, 180),
  experience: optText(20),
  injuries: optText(),
  gym_name: z.string().trim().min(1).max(80).default("My gym"),
  gym_preset: z.enum(["big", "small", "home", "none"]).default("none"),
  nutrition_style: optText(20),
  dietary_needs: optText(),
  cycle_tracking: z.enum(["on"]).optional(),
  screening_details: optText(),
  consent_privacy: z.literal("on", { message: "Please agree to the privacy policy to carry on" }),
  consent_health: z.literal("on", { message: "Adam needs your consent to use your health details for coaching" }),
  consent_photos: z.enum(["on"]).optional(),
  consent_marketing: z.enum(["on"]).optional(),
  consent_contact: z.enum(["on"]).optional(),
  start: z.enum(["trial", "apply"]).default("apply"),
});

export async function saveIntake(_: IntakeState, form: FormData): Promise<IntakeState> {
  const { supabase, user, profile } = await requireProfile();
  if (profile.role !== "client") return { error: "Only clients fill in this form." };

  const raw = Object.fromEntries(form);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const equipment = form.getAll("equipment").map(String).filter((k) => (ALL_EQUIPMENT as string[]).includes(k));
  const screening: Record<string, boolean> = {};
  for (const s of SCREENING) {
    const v = form.get(`screen_${s.key}`);
    if (v !== "yes" && v !== "no") return { error: "Please answer every health question" };
    screening[s.key] = v === "yes";
  }
  const screeningFlag = Object.values(screening).some(Boolean);

  const { error: intakeError } = await supabase.from("client_intake").upsert({
    client_id: user.id,
    date_of_birth: d.date_of_birth,
    phone: d.phone ?? null,
    sex: d.sex,
    goal: d.goal,
    goal_detail: d.goal_detail ?? null,
    goal_date: d.goal_date ?? null,
    competes: d.competes === "yes",
    federation: d.competes === "yes" ? (d.federation ?? null) : null,
    division: d.competes === "yes" ? (d.division ?? null) : null,
    height_cm: d.height_cm ?? null,
    start_weight_kg: d.start_weight_kg ?? null,
    days_per_week: d.days_per_week ?? null,
    session_minutes: d.session_minutes ?? null,
    experience: d.experience ?? null,
    injuries: d.injuries ?? null,
    nutrition_style: d.nutrition_style ?? null,
    dietary_needs: d.dietary_needs ?? null,
    cycle_tracking: d.sex === "female" && d.cycle_tracking === "on",
    screening,
    screening_flag: screeningFlag,
    screening_details: d.screening_details ?? null,
  });
  if (intakeError) return { error: "Something went wrong saving your answers. Please try again." };

  // Replace the main gym with what was ticked here.
  await supabase.from("gyms").delete().eq("client_id", user.id).eq("is_main", true);
  const { error: gymError } = await supabase
    .from("gyms")
    .insert({ client_id: user.id, name: d.gym_name, preset: d.gym_preset, equipment, is_main: true });
  if (gymError) return { error: "Something went wrong saving your gym. Please try again." };

  const consents = [
    { kind: "privacy_policy", granted: true },
    { kind: "health_data", granted: true },
    { kind: "progress_photos", granted: d.consent_photos === "on" },
    { kind: "marketing_photos", granted: d.consent_marketing === "on" },
    { kind: "cycle_data", granted: d.sex === "female" && d.cycle_tracking === "on" },
    ...(d.start === "trial" ? [{ kind: "marketing_contact", granted: d.consent_contact === "on" }] : []),
  ].map((c) => ({ ...c, client_id: user.id, policy_version: POLICY_VERSION }));
  const { error: consentError } = await supabase.from("consents").insert(consents);
  if (consentError) return { error: "Something went wrong saving your consent. Please try again." };

  if (d.start === "trial") {
    const { error: placeError } = await supabase.from("profiles").update({ country: d.country, time_zone: d.time_zone ?? null }).eq("id", user.id);
    if (placeError) return { error: "Something went wrong. Please try again." };
    // Starts the 14 days. Adam then writes their workouts. When all trial places are taken, they join the review list instead.
    const { data: started, error: trialError } = await supabase.rpc("start_trial");
    if (trialError) {
      console.error("start_trial", trialError);
      return { error: "Something went wrong starting your trial. Please try again." };
    }
    redirect(started === "full" ? "/app?welcome=full" : "/app?welcome=trial");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ country: d.country, time_zone: d.time_zone ?? null, status: "pending" })
    .eq("id", user.id);
  if (profileError) return { error: "Something went wrong. Please try again." };

  redirect("/app?welcome=1");
}

/** A trial client whose health answers need a GP check ticks that they've had one, which unlocks their workouts. */
export async function confirmGp(form: FormData) {
  const { supabase, user } = await requireProfile();
  if (form.get("gp") !== "on") redirect("/app/train?gp=missing");
  await supabase.from("client_intake").update({ gp_confirmed_at: new Date().toISOString() }).eq("client_id", user.id);
  redirect("/app/train");
}
