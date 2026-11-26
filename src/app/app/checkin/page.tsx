import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { GENERAL, MODULES, minutesFor, posesFor, WEEKDAY_NAMES } from "@/lib/checkins";
import { hasConsent, moduleFor } from "@/lib/checkins-server";
import { CheckinForm } from "./CheckinForm";

export default async function CheckinPage() {
  const { supabase, user, profile } = await requireProfile();
  const [module, { data: settings }, { data: intake }, photosAllowed, cycleConsent, { data: past }] = await Promise.all([
    moduleFor(supabase, user.id),
    supabase.from("client_settings").select("*").eq("client_id", user.id).maybeSingle(),
    supabase.from("client_intake").select("competes, division, sex, cycle_tracking").eq("client_id", user.id).maybeSingle(),
    hasConsent(supabase, user.id, "progress_photos"),
    hasConsent(supabase, user.id, "cycle_data"),
    supabase.from("checkins").select("id, created_at, weight_kg, coach_reply, reply_video_path, replied_at").eq("client_id", user.id).order("created_at", { ascending: false }).limit(8),
  ]);

  const videos = (past ?? []).map((c) => c.reply_video_path).filter((p): p is string => !!p);
  const signed: Record<string, string> = {};
  if (videos.length) {
    const { data } = await supabase.storage.from("checkin-replies").createSignedUrls(videos, 3600);
    data?.forEach((d) => d.path && d.signedUrl && (signed[d.path] = d.signedUrl));
  }
  const poses = posesFor(settings?.poses, !!intake?.competes, intake?.division ?? null);
  const custom: string[] = (settings as { custom_questions?: string[] } | null)?.custom_questions ?? [];
  const mins = minutesFor(GENERAL.length + MODULES[module].questions.length + custom.length, photosAllowed ? poses.length : 0);
  const cycle = intake?.sex === "female" && !!intake?.cycle_tracking && cycleConsent;
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: profile.time_zone || "Europe/London" });

  return (
    <>
      <span className="eyebrow">Check-in</span>
      <h1>
        Check-in<span>how&apos;s the week?</span>
      </h1>
      <p className="muted small" style={{ margin: 0 }}>
        Check in any day{settings?.checkin_day ? `. Adam suggests ${WEEKDAY_NAMES[settings.checkin_day - 1]}s` : ""}. Be honest, it helps more than a perfect week does. Takes about {mins} minutes. <Link href="/app/progress">Your progress photos →</Link>
      </p>

      {(past ?? []).filter((c) => c.coach_reply || c.reply_video_path).slice(0, 1).map((c) => (
        <div key={c.id} className="card">
          <span className="eyebrow">Adam&apos;s reply to your {fmt(c.created_at)} check-in</span>
          {c.reply_video_path && signed[c.reply_video_path] ? <video className="replyvid" src={signed[c.reply_video_path]} controls playsInline preload="metadata" /> : null}
          {c.coach_reply ? <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{c.coach_reply}</p> : null}
        </div>
      ))}

      <CheckinForm
        userId={user.id}
        module={module}
        measurements={!!settings?.measurements}
        cycle={cycle}
        poses={poses}
        custom={custom}
        photosAllowed={photosAllowed}
        lastWeight={past?.find((c) => c.weight_kg != null)?.weight_kg ?? null}
      />

      {past?.length ? (
        <div className="card" data-tour="ci-history">
          <h2>Your check-ins</h2>
          {past.map((c) => (
            <details key={c.id} className="ci">
              <summary>
                <span>
                  {fmt(c.created_at)}
                  {c.weight_kg != null ? <span className="muted"> · {c.weight_kg} kg</span> : null}
                </span>
                {c.replied_at ? <span className="chip pink">Adam replied</span> : <span className="chip">With Adam</span>}
              </summary>
              {c.reply_video_path && signed[c.reply_video_path] ? <video className="replyvid" src={signed[c.reply_video_path]} controls playsInline preload="none" /> : null}
              {c.coach_reply ? <p className="small" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{c.coach_reply}</p> : null}
              {!c.replied_at ? <p className="muted small" style={{ margin: 0 }}>Adam hasn&apos;t replied to this one yet.</p> : null}
            </details>
          ))}
        </div>
      ) : null}
    </>
  );
}
