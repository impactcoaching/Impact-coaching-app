import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { StatusControl } from "@/components/StatusControl";
import { TRIAL_DAYS, TRIAL_PLACES, bookingUrl, deleteDate, longDate, trialDay, trialOver } from "@/lib/trial";

type Row = {
  id: string;
  full_name: string | null;
  status: string;
  country: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  checkins: { id: string; replied_at: string | null }[];
  programmes: { is_live: boolean }[];
  client_intake: { screening_flag: boolean; gp_confirmed_at: string | null } | { screening_flag: boolean; gp_confirmed_at: string | null }[] | null;
};

export default async function TrialsPage() {
  const { supabase } = await requireCoach();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, status, country, trial_started_at, trial_ends_at, checkins(id, replied_at), programmes(is_live), client_intake(screening_flag, gp_confirmed_at)")
    .eq("role", "client")
    .eq("status", "trial")
    .order("trial_started_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];
  // What auto-assign gave each trial (needs 0020_trial_auto_assign.sql; without it this is just empty).
  const ids = rows.map((r) => r.id);
  const [{ data: autoProg }, { data: autoPlan }] = ids.length
    ? await Promise.all([
        supabase.from("programmes").select("client_id, template_name").in("client_id", ids).not("template_name", "is", null),
        supabase.from("nutrition_plans").select("client_id, template_name").in("client_id", ids).not("template_name", "is", null),
      ])
    : [{ data: [] }, { data: [] }];
  const auto = new Map<string, string[]>();
  for (const a of [...(autoProg ?? []), ...(autoPlan ?? [])] as { client_id: string; template_name: string }[]) {
    auto.set(a.client_id, [...(auto.get(a.client_id) ?? []), a.template_name]);
  }
  const running = rows.filter((r) => !trialOver(r));
  const ended = rows.filter((r) => trialOver(r));
  const now = Date.now();

  return (
    <>
      <span className="eyebrow">Free trial</span>
      <h1>
        Trials
        <span>
          {running.length} of {TRIAL_PLACES} places in use
        </span>
      </h1>

      <p className="muted small" style={{ margin: 0 }}>
        New trials start straight away. Competitors are given the programme for their class, focus and days a week, and everyone gets a nutrition plan sized from their sign-up answers, both live straight away. Non-competitors get your starter workouts for now. Anyone with a health flag, a medical note about food, or no height and weight is left for you: they get your starter workouts and no nutrition plan. Change anything on their Training and Nutrition pages, the same as any client.
        {!bookingUrl() ? " No call booking link is set yet, so \"Book a call\" opens Messages. Add your Calendly link in Vercel as NEXT_PUBLIC_BOOKING_URL to change that." : ""}
      </p>

      <div className="card">
        <h2>Running</h2>
        {!running.length ? (
          <p className="muted" style={{ margin: 0 }}>
            No trials running. Share your web address followed by /coaching, or /join.
          </p>
        ) : (
          running.map((r) => {
            const day = trialDay(r) ?? 1;
            const ci = r.checkins[0];
            const intake = Array.isArray(r.client_intake) ? r.client_intake[0] : r.client_intake;
            const hasWorkouts = r.programmes.some((p) => p.is_live);
            const status = !hasWorkouts ? "Needs workouts" : intake?.screening_flag && !intake.gp_confirmed_at ? "Waiting on GP tick" : ci && !ci.replied_at ? "Check-in to reply to" : ci ? "Check-in replied" : day >= 7 ? "Check-in due" : "Logging";
            return (
              <div key={r.id} className="bx">
                <div className="bx-head">
                  <Link href={`/coach/clients/${r.id}`}>
                    <b>{r.full_name || "No name yet"}</b>
                  </Link>
                  <span className="muted small">
                    Day {day} of {TRIAL_DAYS}
                    {r.country ? ` · ${r.country}` : ""}
                  </span>
                </div>
                <div className="daybar" aria-hidden="true">
                  <i style={{ width: `${Math.round((day / TRIAL_DAYS) * 100)}%` }} />
                </div>
                {auto.get(r.id)?.length ? <p className="muted small" style={{ margin: 0 }}>Given automatically: {auto.get(r.id)!.join(" · ")}</p> : null}
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className={`chip${status === "Check-in to reply to" || status === "Needs workouts" ? " pink" : ""}`}>{status}</span>
                  <div className="row">
                    {!hasWorkouts ? (
                      <Link href={`/coach/clients/${r.id}/training`} className="btn primary">
                        Write workouts
                      </Link>
                    ) : null}
                    {ci && !ci.replied_at ? (
                      <Link href={`/coach/clients/${r.id}/checkins`} className="btn primary">
                        Reply
                      </Link>
                    ) : null}
                    <StatusControl id={r.id} status={r.status} />
                  </div>
                </div>
              </div>
            );
          })
        )}
        <p className="muted small" style={{ margin: 0 }}>
          Tap Start coaching once they&apos;ve paid. Their trial logs stay, and you can then build their own programme and nutrition.
        </p>
      </div>

      {ended.length ? (
        <div className="card">
          <h2>Finished, not joined</h2>
          <p className="muted small" style={{ margin: 0 }}>
            These accounts are read-only. Delete each one from their profile by the date shown, as promised in the privacy policy.
          </p>
          {ended.map((r) => {
            const due = deleteDate(r);
            const overdue = !!due && +due < now;
            return (
              <div key={r.id} className="row" style={{ justifyContent: "space-between" }}>
                <Link href={`/coach/clients/${r.id}`}>{r.full_name || "No name yet"}</Link>
                <span className={`chip${overdue ? " warn" : ""}`}>{due ? `${overdue ? "Delete now, was due" : "Delete by"} ${longDate(due)}` : "Ended"}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
