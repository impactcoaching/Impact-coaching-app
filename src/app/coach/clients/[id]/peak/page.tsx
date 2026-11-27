import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { ClientTabs } from "@/components/ClientTabs";
import { addDayAfter, deletePeakWeek } from "@/app/actions/peak";
import { addDays, todayIn } from "@/lib/nutrition";
import { daysUntil, shortDate, type PeakDay, type PeakWeek } from "@/lib/peak";
import { PeakEditor, StartPeak } from "./PeakEditor";

export default async function PeakPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile: me } = await requireCoach();
  const self = id === me.id;
  const { data: c } = await supabase.from("profiles").select("id, full_name, time_zone").eq("id", id).or(`role.eq.client,id.eq.${me.id}`).maybeSingle();
  if (!c) notFound();
  const first = (c.full_name ?? "").split(" ")[0] || "this client";
  const today = todayIn(c.time_zone);

  const [{ data: intake }, { data: weeks }] = await Promise.all([
    supabase.from("client_intake").select("competes, federation, division, goal_date").eq("client_id", id).maybeSingle(),
    supabase.from("peak_weeks").select("id, client_id, show_date, is_live, notes").eq("client_id", id).order("show_date", { ascending: false }).limit(5),
  ]);
  const week = (weeks?.[0] as PeakWeek | undefined) ?? null;
  const { data: dayRows } = week ? await supabase.from("peak_days").select("*").eq("peak_week_id", week.id).order("day_offset") : { data: null };
  const days = (dayRows ?? []) as PeakDay[];
  const defaultDate = intake?.goal_date && intake.goal_date >= today ? intake.goal_date : addDays(today, 7 * 8);
  const until = week ? daysUntil(week.show_date, today) : null;

  return (
    <>
      <Link href="/coach/clients" className="small">
        ← All clients
      </Link>
      <h1>{c.full_name || "Client"}</h1>
      <ClientTabs id={c.id} active="peak" self={self} />

      <div className="card">
        <span className="eyebrow">Peak week{intake?.division ? ` · ${[intake.federation, intake.division].filter(Boolean).join(" ")}` : ""}</span>
        <h2>{week ? `Show: ${shortDate(week.show_date)}` : "No peak week yet"}</h2>
        <p className="muted small" style={{ margin: 0 }}>
          Everything here is set by you. The app never calculates or suggests carbs, water or sodium, and the AI features don&apos;t see this page.
          {week ? ` ${first} ${week.is_live ? "can see it now" : "can't see it yet"}.` : ""}
          {until != null && until >= 0 ? ` ${until === 0 ? "Show day is today." : `${until} day${until === 1 ? "" : "s"} to go.`}` : ""}
        </p>
        {!intake?.competes && !week ? <p className="alert small" style={{ margin: 0 }}>{first} didn&apos;t say they compete at sign-up. You can still set one up.</p> : null}
        {!week || (until != null && until < -1) ? <StartPeak clientId={c.id} defaultDate={defaultDate} /> : null}
      </div>

      {week ? (
        <div className="card">
          <PeakEditor key={week.id} week={week} days={days} first={first} />
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {!days.some((d) => d.day_offset === 1) ? (
              <form action={addDayAfter}>
                <input type="hidden" name="week_id" value={week.id} />
                <button className="btn">Add the day after the show</button>
              </form>
            ) : null}
            <details className="ci" style={{ flex: "1 1 220px" }}>
              <summary>
                <span className="small">Delete this peak week</span>
              </summary>
              <form action={deletePeakWeek} className="stack" style={{ gap: 8 }}>
                <input type="hidden" name="week_id" value={week.id} />
                <span className="muted small">This removes every day of it, for you and {first}. It can&apos;t be undone.</span>
                <button className="btn" style={{ alignSelf: "flex-start" }}>
                  Yes, delete it
                </button>
              </form>
            </details>
          </div>
        </div>
      ) : null}
    </>
  );
}
