"use server";

import { requireProfile } from "@/lib/auth";

/** The intro reel only plays once. */
export async function markIntroSeen() {
  const { supabase, user } = await requireProfile();
  await supabase.from("profiles").update({ intro_seen_at: new Date().toISOString() }).eq("id", user.id);
}
