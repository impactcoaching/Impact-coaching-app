import { ReplayTour } from "@/components/Tour";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { todayIn } from "@/lib/nutrition";
import { daysUntil, shortDate } from "@/lib/peak";
import { currentPeakWeek } from "@/lib/peak-server";

export default async function ClientHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { supabase, user, profile } = await requireProfile();
  const sp = await searchParams;
  const today = todayIn(profile.time_zone);
  const peak = profile.status === "active" ? await currentPeakWeek(supabase, user.id, today) : null;
  const until = peak ? daysUntil(peak.week.show_date, today) : null;
  const first = (profile.full_name ?? "").split(" ")[0] || "there";
  return (
    <>
      <span className="eyebrow">Home</span>
      <h1>
        Hi {first}
        <span>{profile.status === "active" ? "let's go" : "nearly there"}</span>
      </h1>
      {sp.welcome ? <p className="alert ok">Thanks! Your answers are with Adam.</p> : null}
      {peak && until != null ? (
        <Link href="/app/peak" className="card peakcard">
          <span className="eyebrow">Peak week · show {shortDate(peak.week.show_date)}</span>
          <h2>{until > 0 ? `${until} day${until === 1 ? "" : "s"} to go` : until === 0 ? "It's show day" : "Show done. Well done!"}</h2>
          <span className="small">See today&apos;s plan from Adam →</span>
        </Link>
      ) : null}
      {profile.status === "pending" ? (
        <div className="card">
          <h2>What happens next</h2>
          <p className="muted" style={{ margin: 0 }}>
            Adam reads your answers and builds your first training and nutrition plan. You&apos;ll get a message here when it&apos;s ready, usually within 2 working days.
          </p>
        </div>
      ) : (
        <div className="card">
          <h2>Your week</h2>
          <p className="muted" style={{ margin: 0 }}>
            Your goal, show or goal date countdown, weight trend and today&apos;s plan will show here.
          </p>
          <Link href="/app/progress" className="btn" style={{ alignSelf: "flex-start" }}>
            Progress photos
          </Link>
        </div>
      )}
      <div className="stack small" style={{ textAlign: "center", paddingTop: 8, gap: 6, alignItems: "center" }}>
        <ReplayTour />
        <Link href="/privacy" className="muted">
          Privacy policy
        </Link>
      </div>
    </>
  );
}
