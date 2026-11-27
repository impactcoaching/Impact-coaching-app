import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  role: "coach" | "client";
  full_name: string | null;
  status: "signing_up" | "pending" | "trial" | "active" | "paused" | "ended";
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  country: string | null;
  time_zone: string | null;
  intro_seen_at?: string | null;
};

/** The signed-in person and their profile, or a redirect to sign-in. Shared by the layout and page in one request. */
export const requireProfile = cache(async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  // Signed in but no profile row (e.g. the account was made before the database was set up).
  // Send them to a page that explains, rather than looping back to sign-in.
  if (!profile) redirect("/login?error=profile");
  return { supabase, user, profile };
});

export async function requireCoach() {
  const ctx = await requireProfile();
  if (ctx.profile.role !== "coach") redirect("/app");
  return ctx;
}

/** Where a person should land after signing in. */
export function homeFor(profile: Profile) {
  if (profile.role === "coach") return "/coach";
  if (profile.status === "signing_up") return "/welcome";
  return "/app";
}
