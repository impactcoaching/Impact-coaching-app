import type { requireProfile } from "@/lib/auth";
import { suggestModule, type ModuleKey } from "@/lib/checkins";

type Supa = Awaited<ReturnType<typeof requireProfile>>["supabase"];

/** The latest answer the client gave for a consent. */
export async function hasConsent(supabase: Supa, clientId: string, kind: string) {
  const { data } = await supabase.from("consents").select("granted").eq("client_id", clientId).eq("kind", kind).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return !!data?.granted;
}

/** The module this client's check-in uses: what Adam set, or a suggestion from their sign-up. */
export async function moduleFor(supabase: Supa, clientId: string): Promise<ModuleKey> {
  const [{ data: s }, { data: intake }] = await Promise.all([
    supabase.from("client_settings").select("checkin_module").eq("client_id", clientId).maybeSingle(),
    supabase.from("client_intake").select("goal, competes, division").eq("client_id", clientId).maybeSingle(),
  ]);
  if (s?.checkin_module) return s.checkin_module as ModuleKey;
  return suggestModule(intake?.goal ?? null, !!intake?.competes, intake?.division ?? null);
}

