import { cache } from "react";
import { cookies } from "next/headers";
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
  if (profile.status === "ended") return "/ended";
  return "/app";
}

/** Cookies the coach uses to look at the client app. Set by actions in app/actions/modes.ts. */
export const MODE_COOKIE = "ic-mode"; // "me": the coach is using the client app for his own training
export const VIEW_COOKIE = "ic-view"; // a client id: the coach is looking at that client's app, read only

export type ClientView = {
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"];
  /** Whose app this is. For a client, themselves. */
  user: { id: string };
  /** That person's profile. */
  profile: Profile;
  /** The person actually signed in. */
  viewer: Profile;
  mode: "client" | "me" | "view";
  readOnly: boolean;
};

/**
 * Whose client app this page shows. A client sees their own. The coach sees
 * his own training ("me") or one client's app, read only ("view"), depending on
 * which he picked. Otherwise the coach goes back to the coach app.
 */
export const requireClientView = cache(async function requireClientView(): Promise<ClientView> {
  const { supabase, user, profile } = await requireProfile();
  if (profile.role !== "coach") return { supabase, user: { id: user.id }, profile, viewer: profile, mode: "client", readOnly: false };
  const jar = await cookies();
  const viewId = jar.get(VIEW_COOKIE)?.value;
  if (viewId && /^[0-9a-f-]{36}$/i.test(viewId)) {
    const { data: c } = await supabase.from("profiles").select("*").eq("id", viewId).eq("role", "client").maybeSingle<Profile>();
    if (c) return { supabase, user: { id: c.id }, profile: c, viewer: profile, mode: "view", readOnly: true };
  }
  if (jar.get(MODE_COOKIE)?.value === "me") {
    // The coach's own account never goes through sign-up or a trial, so treat it as an active client.
    const me: Profile = { ...profile, status: "active", intro_seen_at: profile.intro_seen_at ?? new Date().toISOString() };
    return { supabase, user: { id: user.id }, profile: me, viewer: profile, mode: "me", readOnly: false };
  }
  redirect("/coach");
});
