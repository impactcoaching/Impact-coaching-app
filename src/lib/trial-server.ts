import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth";

/** True when a trial client answered yes to a health question and hasn't yet ticked that they've checked with their GP. */
export async function needsGpCheck(supabase: SupabaseClient, profile: Profile) {
  if (profile.status !== "trial") return false;
  const { data } = await supabase.from("client_intake").select("screening_flag, gp_confirmed_at").eq("client_id", profile.id).maybeSingle();
  return !!data?.screening_flag && !data?.gp_confirmed_at;
}
