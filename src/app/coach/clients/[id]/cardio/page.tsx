import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { ClientTabs } from "@/components/ClientTabs";
import { addDays, todayIn } from "@/lib/nutrition";
import { WEEKDAYS, countedMinutes, weekOf, type CardioLog, type CardioPlan, type CardioSession } from "@/lib/cardio";
import { CardioEditor } from "./CardioEditor";

export default async function CardioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile: me } = await requireCoach();
  const self = id === me.id;
  const { data: c } = await supabase.from("profiles").select("id, full_name, time_zone").eq("id", id).or(`role.eq.client,id.eq.${me.id}`).maybeSingle();
  if (!c) notFound();
  const first = (c.full_name ?? "").split(" ")[0] || "this client";
  const week = weekOf(todayIn(c.time_zone));
  const lastWeek = weekOf(addDays(week.start, -7));

  const [{ data: plan }, { data: sessions }, { data: logs }, { data: steps }] = await Promise.all([
    supabase.from("cardio_plans").select("*").eq("client_id", id).maybeSingle<CardioPlan>(),
    supabase.from("cardio_sessions").select("*").eq("client_id", id).order("position"),
    supabase.from("cardio_logs").select("*").eq("client_id", id).gte("log_date", lastWeek.start).lte("log_date", week.end).order("log_date"),
    supabase.from("step_logs").select("log_date, steps").eq("client_id", id).gte("log_date", lastWeek.start).lte("log_date", week.end),
  ]);
  const all = (logs ?? []) as CardioLog[];
  const extra = plan?.extra_counts ?? true;

  function Week({ label, dates }: { label: string; dates: string[] }) {
    const inWeek = all.filter((l) => dates.includes(l.log_date));
    const total = countedMinutes(inWeek, extra);
    const st = (steps ?? []).filter((s) => dates.includes(s.log_date));
    const avg = st.length ? Math.round(st.reduce((a, s) => a + s.steps, 0) / st.length) : null;
    return (
      <section className="card stack" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>{label}</h2>
          <span className="muted small">
            {total}
            {plan?.weekly_minutes ? ` of ${plan.weekly_minutes}` : ""} min
            {avg != null ? ` · ${avg.toLocaleString("en-GB")} steps a day on average${plan?.daily_steps ? ` (target ${plan.daily_steps.toLocaleString("en-GB")})` : ""}` : ""}
          </span>
        </div>
        <div className="wkmins">
          {dates.map((d, i) => {
            const m = inWeek.filter((l) => l.log_date === d).reduce((a, l) => a + l.minutes, 0);
            return (
              <div key={d} className={m ? "on" : ""}>
                {WEEKDAYS[i]}
                <b>{m || "–"}</b>
              </div>
            );
          })}
        </div>
        {inWeek.length ? (
          <ul className="clist">
            {inWeek.map((l) => (
              <li key={l.id}>
                <b>
                  {WEEKDAYS[dates.indexOf(l.log_date)]} · {l.kind} · {l.minutes} min
                </b>
                <span className="muted small">
                  {[l.session_id ? "Set session" : "Extra", l.effort ? `effort ${l.effort}/10` : null, l.avg_hr ? `${l.avg_hr} bpm avg` : null, l.distance_km ? `${Number(l.distance_km)} km` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {l.note ? <span className="small">“{l.note}”</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <span className="muted small">Nothing logged.</span>
        )}
      </section>
    );
  }

  return (
    <>
      <Link href="/coach/clients" className="small">
        ← All clients
      </Link>
      <h1>{c.full_name || "Client"}</h1>
      <ClientTabs id={c.id} active="cardio" self={self} />
      <CardioEditor clientId={c.id} first={first} plan={plan ?? null} sessions={(sessions ?? []) as CardioSession[]} />
      <div className="grid2">
        <Week label="This week" dates={week.dates} />
        <Week label="Last week" dates={lastWeek.dates} />
      </div>
    </>
  );
}
