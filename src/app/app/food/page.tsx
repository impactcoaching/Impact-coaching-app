import { clientNote } from "@/lib/notes";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { currentPeakWeek } from "@/lib/peak-server";
import { aiEnabled } from "@/lib/ai";
import { peakDate, peakLabel } from "@/lib/peak";
import { isDate, pickDayType, showsKj, todayIn, type DayType, type Food, type Style } from "@/lib/nutrition";
import { Diary, type LogRow } from "./Diary";

type DayRow = Omit<DayType, "meals"> & {
  id: string;
  plan_meals: {
    id: string;
    name: string;
    notes: string | null;
    position: number;
    plan_meal_items: { food_id: string; grams: number; position: number; food: Food | null }[];
  }[];
};

export default async function FoodPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { supabase, user, profile } = await requireProfile();
  const sp = await searchParams;
  const today = todayIn(profile.time_zone);
  const date = isDate(sp.d) ? sp.d : today;
  const kj = showsKj(profile.country);

  const [{ data: plan }, { data: foods }, { data: logs }, { data: day }, { data: recentLogs }, { data: outs }] = await Promise.all([
    supabase.from("nutrition_plans").select("id, style, notes").eq("client_id", user.id).eq("is_live", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("foods").select("*").or(`owner_id.is.null,owner_id.eq.${user.id}`).order("name"),
    supabase.from("food_logs").select("*").eq("client_id", user.id).eq("log_date", date).order("created_at"),
    supabase.from("nutrition_days").select("*").eq("client_id", user.id).eq("log_date", date).maybeSingle(),
    supabase.from("food_logs").select("food_id").eq("client_id", user.id).not("food_id", "is", null).order("created_at", { ascending: false }).limit(60),
    supabase.from("eating_out").select("id, note, coach_reply, replied_at, created_at").eq("client_id", user.id).order("created_at", { ascending: false }).limit(3),
  ]);

  const { data: dayRows } = plan
    ? await supabase
        .from("day_types")
        .select("*, plan_meals(id, name, notes, position, plan_meal_items(food_id, grams, position, food:foods(*)))")
        .eq("plan_id", plan.id)
        .order("position")
    : { data: null };

  const planFoods = new Map<string, Food>();
  const dayTypes: DayType[] = ((dayRows ?? []) as unknown as DayRow[]).map(({ plan_meals, ...d }) => ({
    ...d,
    meals: [...plan_meals]
      .sort((a, b) => a.position - b.position)
      .map((m) => ({
        id: m.id,
        name: m.name,
        notes: m.notes,
        items: [...m.plan_meal_items]
          .sort((a, b) => a.position - b.position)
          .map((it) => {
            if (it.food) planFoods.set(it.food.id, it.food);
            return { food_id: it.food_id, grams: Number(it.grams) };
          }),
      })),
  }));
  const current = pickDayType(dayTypes, date, day?.day_type_id);

  // Foods: the library plus any plan foods, and the most recent ones first.
  const all = new Map(((foods ?? []) as Food[]).map((f) => [f.id, f]));
  planFoods.forEach((f, id) => all.set(id, f));
  const recentIds = [...new Set((recentLogs ?? []).map((r) => r.food_id as string))].slice(0, 12);
  const recent = recentIds.map((id) => all.get(id)).filter((f): f is Food => !!f);

  const peak = await currentPeakWeek(supabase, user.id, today);
  const peakDay = peak?.days.find((d) => peakDate(peak.week.show_date, d.day_offset) === date) ?? null;

  return (
    <>
      {peakDay ? (
        <Link href="/app/peak" className="alert ok" style={{ textDecoration: "none", color: "var(--fg)" }}>
          <b>Peak week: {peakLabel(peakDay.day_offset).toLowerCase()}.</b> Follow Adam&apos;s peak week plan for today&apos;s carbs, water and sodium. See the plan →
        </Link>
      ) : null}
    <Diary
      key={date}
      userId={user.id}
      date={date}
      today={today}
      country={profile.country}
      kj={kj}
      style={(plan?.style as Style | undefined) ?? null}
      planNotes={clientNote(plan?.notes)}
      dayTypes={dayTypes}
      current={current}
      logs={(logs ?? []) as LogRow[]}
      water={day?.water_ml ?? 0}
      portions={(day?.portions as Record<string, number> | null) ?? {}}
      foods={[...all.values()]}
      recent={recent}
      outs={outs ?? []}
      aiOn={aiEnabled() && profile.status !== "trial"}
      trial={profile.status === "trial"}
    />
    </>
  );
}
