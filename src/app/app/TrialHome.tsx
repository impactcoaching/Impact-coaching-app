import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth";
import { PLANS, TRIAL_DAYS, bookingUrl, deleteDate, longDate, noteFor, tenPercentOff, trialDay, trialOver } from "@/lib/trial";

async function trialStats(supabase: SupabaseClient, id: string) {
  const [{ count: sessions }, { data: foodDays }, { data: checkins }] = await Promise.all([
    supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("client_id", id).not("finished_at", "is", null),
    supabase.from("food_logs").select("log_date").eq("client_id", id).limit(1000),
    supabase.from("checkins").select("id, replied_at").eq("client_id", id),
  ]);
  return {
    sessions: sessions ?? 0,
    foodDays: new Set((foodDays ?? []).map((r) => r.log_date)).size,
    checkins: checkins?.length ?? 0,
    replied: (checkins ?? []).some((c) => c.replied_at),
  };
}

function BookButton({ primary = true, label = "Book a 15 minute call" }: { primary?: boolean; label?: string }) {
  const url = bookingUrl();
  return url ? (
    <a href={url} target="_blank" rel="noopener" className={`btn block${primary ? " primary" : ""}`}>
      {label}
    </a>
  ) : (
    <Link href="/app/messages" className={`btn block${primary ? " primary" : ""}`}>
      Message Adam to book a call
    </Link>
  );
}

export async function TrialHome({ supabase, profile, welcome }: { supabase: SupabaseClient; profile: Profile; welcome?: string }) {
  if (trialOver(profile)) return <TrialEnd supabase={supabase} profile={profile} />;
  const day = trialDay(profile) ?? 1;
  const first = (profile.full_name ?? "").split(" ")[0] || "there";
  const [stats, { data: prog }] = await Promise.all([
    trialStats(supabase, profile.id),
    supabase.from("programmes").select("id, workouts(id, name, position)").eq("client_id", profile.id).eq("is_live", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const workouts = [...((prog?.workouts as { id: string; name: string; position: number }[] | undefined) ?? [])].sort((a, b) => a.position - b.position);
  const next = workouts.length ? workouts[stats.sessions % workouts.length] : null;
  const note = noteFor(day);

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="eyebrow">Home</span>
        <span className="chip pink">Free trial</span>
      </div>
      <h1>
        Hi {first}
        <span>let&apos;s go</span>
      </h1>
      {welcome === "trial" ? <p className="alert ok">You&apos;re in. Your {TRIAL_DAYS} day trial has started.</p> : null}

      <div className="card" style={{ gap: 8 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <b>
            Day {day} of {TRIAL_DAYS}
          </b>
          <span className="muted small">{stats.checkins ? (stats.replied ? "Adam has replied to your check-in" : "Check-in sent") : day >= 7 ? "Check-in day" : `Check-in on day 7`}</span>
        </div>
        <div className="daybar" aria-hidden="true">
          <i style={{ width: `${Math.round((day / TRIAL_DAYS) * 100)}%` }} />
        </div>
      </div>

      <div className="card">
        <span className="eyebrow">{next ? "Next starter workout" : "Starter workouts"}</span>
        {next ? (
          <>
            <h2>{next.name}</h2>
            <span className="muted small">
              {stats.sessions} session{stats.sessions === 1 ? "" : "s"} done so far
            </span>
            <Link href={`/app/train/${next.id}`} className="btn primary block">
              Start workout
            </Link>
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Adam is adding your starter workouts. They&apos;ll show in Train very soon.
          </p>
        )}
      </div>

      <div className="grid2">
        <Link href="/app/food" className="card" style={{ textDecoration: "none", color: "var(--fg)", gap: 4 }}>
          <span className="muted small">Food logged</span>
          <h2 className="num">
            {stats.foodDays} day{stats.foodDays === 1 ? "" : "s"}
          </h2>
          <span className="small" style={{ color: "var(--pink-hi)", fontWeight: 600 }}>
            Log today ›
          </span>
        </Link>
        <Link href="/app/checkin" className="card" style={{ textDecoration: "none", color: "var(--fg)", gap: 4, borderColor: "rgba(255,46,136,0.45)" }}>
          <span className="muted small">Check-in</span>
          <h2>{stats.checkins ? (stats.replied ? "Replied" : "Sent") : day >= 7 ? "Today" : `Day 7`}</h2>
          <span className="small" style={{ color: "var(--pink-hi)", fontWeight: 600 }}>
            Adam replies by video ›
          </span>
        </Link>
      </div>

      <div className="card" style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <span className="avatar" aria-hidden="true">
          A
        </span>
        <div className="stack" style={{ gap: 2 }}>
          <b className="small">
            Adam <span className="muted" style={{ fontWeight: 400 }}>· day {note.from}</span>
          </b>
          <span className="small">{note.text}</span>
        </div>
      </div>
      {day >= 10 ? <BookButton /> : null}

      <span className="eyebrow" style={{ color: "var(--muted)" }}>
        With coaching
      </span>
      <div className="grid2">
        <Link href="/app/join-coaching" className="card locked">
          <span className="eyebrow">Locked</span>
          <b>Your own programme</b>
          <span className="muted small">Built around you and your gym</span>
        </Link>
        <Link href="/app/join-coaching" className="card locked">
          <span className="eyebrow">Locked</span>
          <b>Nutrition targets</b>
          <span className="muted small">Calories and macros set by Adam</span>
        </Link>
      </div>
      <Link href="/app/join-coaching" className="small" style={{ textAlign: "center" }}>
        See coaching options and prices ›
      </Link>
    </>
  );
}

export async function TrialEnd({ supabase, profile }: { supabase: SupabaseClient; profile: Profile }) {
  const first = (profile.full_name ?? "").split(" ")[0] || "there";
  const over = trialOver(profile);
  const stats = await trialStats(supabase, profile.id);
  const gone = deleteDate(profile);
  return (
    <>
      <span className="eyebrow">{over ? `Day ${TRIAL_DAYS} · trial finished` : "Coaching with Adam"}</span>
      <h1>
        {over ? "Two weeks done." : "Ready for more?"}
        <span>{over ? `Nice work, ${first}` : "here's how it works"}</span>
      </h1>
      <div className="stats3">
        <div>
          <b>{stats.sessions}</b>
          <span className="muted small">sessions</span>
        </div>
        <div>
          <b>{stats.foodDays}</b>
          <span className="muted small">days of food</span>
        </div>
        <div>
          <b>{stats.checkins}</b>
          <span className="muted small">check-in{stats.checkins === 1 ? "" : "s"}</span>
        </div>
      </div>
      <p style={{ margin: 0 }}>That&apos;s a proper start. Imagine it with a plan built around you and a check-in with me every week.</p>

      <div className="offer">
        <b>10%</b>
        <span>
          <strong>Two ways to save 10%.</strong> Pay monthly and your first month is 10% off. Or pay 3 months up front and every month is 10% off, which saves you three times as much. One discount per client.
        </span>
      </div>

      {PLANS.map((p, i) => (
        <div key={p.key} className={`card plan${i === 0 ? " plan-main" : ""}`}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <h2>{p.name}</h2>
            <span>
              <b className="num">£{p.monthly}</b>
              <span className="muted small"> / month</span>
            </span>
          </div>
          <div className="payopts">
            <div>
              <span className="muted">Monthly</span>
              <b>£{tenPercentOff(p.monthly)} first month</b>
              <span className="muted">
                then £{p.monthly} · save £{p.monthly - tenPercentOff(p.monthly)}
              </span>
            </div>
            <div className="best">
              <span style={{ color: "var(--pink-hi)", fontWeight: 700 }}>3 months · best value</span>
              <b>£{tenPercentOff(p.monthly) * 3} up front</b>
              <span>
                £{tenPercentOff(p.monthly)} a month · save £{(p.monthly - tenPercentOff(p.monthly)) * 3}
              </span>
            </div>
          </div>
          <ul className="ticks">
            {p.includes.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      ))}

      <div className="stack small" style={{ gap: 6 }}>
        <b>How joining works</b>
        <span>1. Have a quick 15 minute call with me</span>
        <span>2. Pay by bank transfer in pounds, monthly or 3 months up front</span>
        <span>3. I build your plan. Everything you&apos;ve logged stays.</span>
      </div>
      <BookButton label="Book my 15 minute call" />
      <Link href="/app/messages" className="btn block">
        I&apos;m ready to join
      </Link>
      {over && gone ? (
        <p className="muted small" style={{ margin: 0 }}>
          Not ready yet? That&apos;s fine. Your logs stay here to look back on until {longDate(gone)}, then your account and everything in it is deleted. You can message Adam to delete it sooner.
        </p>
      ) : null}
    </>
  );
}
