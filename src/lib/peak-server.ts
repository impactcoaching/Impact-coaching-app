import type { requireProfile } from "@/lib/auth";
import { addDays } from "@/lib/nutrition";
import type { PeakDay, PeakWeek } from "@/lib/peak";

type Supa = Awaited<ReturnType<typeof requireProfile>>["supabase"];

/** The client's live peak week, if the show is no more than 3 days ago. Row level security hides weeks Adam hasn't turned on. */
export async function currentPeakWeek(supabase: Supa, clientId: string, today: string) {
  const { data: week } = await supabase
    .from("peak_weeks")
    .select("id, client_id, show_date, is_live, notes")
    .eq("client_id", clientId)
    .eq("is_live", true)
    .gte("show_date", addDays(today, -3))
    .order("show_date")
    .limit(1)
    .maybeSingle();
  if (!week) return null;
  const { data: days } = await supabase.from("peak_days").select("*").eq("peak_week_id", week.id).order("day_offset");
  return { week: week as PeakWeek, days: (days ?? []) as PeakDay[] };
}
