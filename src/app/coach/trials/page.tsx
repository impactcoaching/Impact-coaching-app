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
  client_intake: { screening_flag: boolean; gp_confirmed_at: string | null } | { screening_flag: boolean; gp_confirmed_at: string | null }[] | null;
};

export default async function TrialsPage() {
  const { supabase, user } = await requireCoach();
  const [{ data }, { count: starters }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, status, country, trial_started_at, trial_ends_at, checkins(id, replied_at), client_intake(screening_flag, gp_confirmed_at)")
      .eq("role", "client")
      .eq("status", "trial")
      .order("trial_started_at", { ascending: false }),
    supabase.from("workouts").select("id, programmes!inner(is_starter)", { count: "exact", head: true }).eq("client_id", user.id).eq("programmes.is_starter", true),
  ]);
  const rows = (data ?? []) as unknown as Row[];
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

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="stack" style={{ gap: 4 }}>
            <b>Starter workouts</b>
            <span className="muted small">{starters ? `${starters} session${starters === 1 ? "" : "s"} ready for new trials` : "None yet. Trial clients won't have workouts until you write them."}</span>
          </div>
          <Link href="/coach/starter" className={`btn${starters ? "" : " primary"}`}>
            {starters ? "Edit" : "Write them"}
          </Link>
        </div>
        {!bookingUrl() ? (
          <p className="muted small" style={{ margin: 0 }}>
            No call booking link set yet, so &quot;Book a call&quot; buttons send people to Messages. Add your Calendly link in Vercel as NEXT_PUBLIC_BOOKING_URL to change that.
          </p>
        ) : null}
      </div>

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
            const status = intake?.screening_flag && !intake.gp_confirmed_at ? "Waiting on GP tick" : ci && !ci.replied_at ? "Check-in to reply to" : ci ? "Check-in replied" : day >= 7 ? "Check-in due" : "Logging";
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
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className={`chip${status === "Check-in to reply to" ? " pink" : ""}`}>{status}</span>
                  <div className="row">
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
