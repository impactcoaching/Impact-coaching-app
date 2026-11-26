import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { ClientTabs } from "@/components/ClientTabs";
import { PhotoCompare, type Photo } from "@/components/PhotoCompare";
import { markCheckinSeen, saveClientSettings } from "@/app/actions/checkins";
import { GENERAL, MEASUREMENTS, MODULES, POSE_TEMPLATES, WEEKDAY_NAMES, posesFor, suggestModule, type ModuleKey, type Question } from "@/lib/checkins";
import { ReplyForm } from "./ReplyForm";

type Answers = Record<string, string | number>;

function Trend({ points }: { points: { d: string; w: number }[] }) {
  if (points.length < 2) return null;
  const ws = points.map((p) => p.w);
  const min = Math.min(...ws),
    max = Math.max(...ws),
    span = max - min || 1;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * 300, 70 - ((p.w - min) / span) * 60]);
  return (
    <svg viewBox="0 0 300 80" className="trend" role="img" aria-label={`Weight from ${ws[0]} to ${ws[ws.length - 1]} kg`}>
      <polyline points={xy.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--pink)" strokeWidth="2.5" strokeLinejoin="round" />
      {xy.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="var(--pink-hi)" />
      ))}
    </svg>
  );
}

function delta(now: number | undefined, before: number | undefined, unit = "") {
  if (typeof now !== "number" || typeof before !== "number") return null;
  const d = Math.round((now - before) * 10) / 10;
  if (!d) return <span className="muted small"> (same)</span>;
  return <span className="muted small"> ({d > 0 ? "+" : ""}{d}{unit})</span>;
}

function AnswerRows({ qs, now, before }: { qs: readonly Question[]; now: Answers; before: Answers | null }) {
  return (
    <dl className="facts">
      {qs.map((q) =>
        now[q.key] === undefined || now[q.key] === "" ? null : (
          <div key={q.key} style={{ display: "contents" }}>
            <dt>{q.label}</dt>
            <dd style={{ whiteSpace: "pre-wrap" }}>
              {q.kind === "scale" ? `${now[q.key]}/5` : q.kind === "number" ? `${Number(now[q.key]).toLocaleString("en-GB")}${"unit" in q && q.unit ? ` ${q.unit}` : ""}` : String(now[q.key])}
              {q.kind === "scale" || q.kind === "number" ? delta(now[q.key] as number, before?.[q.key] as number | undefined) : null}
            </dd>
          </div>
        ),
      )}
    </dl>
  );
}

export default async function ClientCheckins({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ c?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireCoach();
  const { data: c } = await supabase.from("profiles").select("id, full_name, time_zone").eq("id", id).eq("role", "client").maybeSingle();
  if (!c) notFound();
  const first = (c.full_name ?? "").split(" ")[0] || "this client";
  const tz = c.time_zone || "Europe/London";

  const [{ data: settings }, { data: intake }, { data: list }, { data: photoRows }] = await Promise.all([
    supabase.from("client_settings").select("*").eq("client_id", id).maybeSingle(),
    supabase.from("client_intake").select("goal, competes, federation, division, sex, cycle_tracking").eq("client_id", id).maybeSingle(),
    supabase.from("checkins").select("*").eq("client_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.from("progress_photos").select("id, pose, taken_on, path, checkin_id").eq("client_id", id).order("taken_on", { ascending: false }).limit(300),
  ]);
  const checkins = list ?? [];
  const idx = Math.max(0, checkins.findIndex((x) => x.id === sp.c));
  const cur = checkins[idx];
  const prev = checkins[idx + 1] ?? null;

  const module: ModuleKey = (settings?.checkin_module as ModuleKey) ?? suggestModule(intake?.goal ?? null, !!intake?.competes, intake?.division ?? null);
  const poses = posesFor(settings?.poses, !!intake?.competes, intake?.division ?? null);

  const sign = async (bucket: string, paths: string[]) => {
    const out: Record<string, string> = {};
    if (!paths.length) return out;
    const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 3600);
    data?.forEach((d) => d.path && d.signedUrl && (out[d.path] = d.signedUrl));
    return out;
  };
  const [photoUrls, videoUrls] = await Promise.all([
    sign("progress-photos", (photoRows ?? []).map((p) => p.path)),
    sign("checkin-replies", cur?.reply_video_path ? [cur.reply_video_path] : []),
  ]);
  const photos: Photo[] = (photoRows ?? []).filter((p) => photoUrls[p.path]).map((p) => ({ id: p.id, pose: p.pose, taken_on: p.taken_on, url: photoUrls[p.path] }));
  const curPhotos = (photoRows ?? []).filter((p) => cur && p.checkin_id === cur.id && photoUrls[p.path]);
  const weights = checkins
    .filter((x) => x.weight_kg != null)
    .slice(0, 12)
    .reverse()
    .map((x) => ({ d: x.created_at as string, w: Number(x.weight_kg) }));
  const fmt = (d: string) => new Date(d).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: tz });
  const curMod = (cur?.module as ModuleKey | undefined) ?? module;

  return (
    <>
      <Link href="/coach/checkins" className="small">
        ← All check-ins
      </Link>
      <h1>{c.full_name || "Client"}</h1>
      <ClientTabs id={c.id} active="checkins" />

      {!cur ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            No check-ins yet. {first} can check in any day from the Check-in tab.
          </p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="bx-head">
              <div>
                <span className="eyebrow">{MODULES[curMod]?.label ?? "Check-in"}</span>
                <h2>{fmt(cur.created_at)}</h2>
                <span className="muted small">({first}&apos;s time)</span>
              </div>
              {cur.coach_seen_at ? (
                <span className="chip">Seen</span>
              ) : (
                <form action={markCheckinSeen}>
                  <input type="hidden" name="id" value={cur.id} />
                  <button className="mini pink">Mark as seen</button>
                </form>
              )}
            </div>
            {cur.weight_kg != null ? (
              <p style={{ margin: 0 }}>
                <b className="num" style={{ fontSize: 28 }}>
                  {Number(cur.weight_kg)} kg
                </b>
                {delta(Number(cur.weight_kg), prev?.weight_kg != null ? Number(prev.weight_kg) : undefined, " kg")}
              </p>
            ) : null}
            <Trend points={weights} />
            <AnswerRows qs={GENERAL} now={cur.answers as Answers} before={(prev?.answers as Answers) ?? null} />
          </div>

          {MODULES[curMod]?.questions.length && Object.keys(cur.module_answers ?? {}).length ? (
            <div className="card">
              <h2>{MODULES[curMod].label}</h2>
              <AnswerRows qs={MODULES[curMod].questions} now={cur.module_answers as Answers} before={prev?.module === cur.module ? ((prev?.module_answers as Answers) ?? null) : null} />
            </div>
          ) : null}

          {cur.measurements ? (
            <div className="card">
              <h2>Measurements</h2>
              <dl className="facts">
                {MEASUREMENTS.filter((m) => (cur.measurements as Answers)[m.key] != null).map((m) => (
                  <div key={m.key} style={{ display: "contents" }}>
                    <dt>{m.label}</dt>
                    <dd>
                      {(cur.measurements as Answers)[m.key]} cm
                      {delta((cur.measurements as Answers)[m.key] as number, (prev?.measurements as Answers | null)?.[m.key] as number | undefined, " cm")}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {cur.cycle ? (
            <div className="card">
              <h2>Cycle</h2>
              <p style={{ margin: 0 }}>
                {(cur.cycle as { phase: string }).phase}
                {(cur.cycle as { day: number | null }).day ? `, day ${(cur.cycle as { day: number }).day}` : ""}
              </p>
              {(cur.cycle as { note: string | null }).note ? <p className="muted small" style={{ margin: 0 }}>{(cur.cycle as { note: string }).note}</p> : null}
            </div>
          ) : null}

          {curPhotos.length ? (
            <div className="card">
              <h2>Photos with this check-in</h2>
              <div className="posegrid">
                {curPhotos.map((p) => (
                  <a key={p.id} className="posebox has" href={photoUrls[p.path]} target="_blank" rel="noopener">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrls[p.path]} alt={p.pose} />
                    <small>{p.pose}</small>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div className="card">
            <h2>Reply</h2>
            {cur.replied_at ? (
              <>
                {cur.reply_video_path && videoUrls[cur.reply_video_path] ? <video className="replyvid" src={videoUrls[cur.reply_video_path]} controls playsInline preload="metadata" /> : null}
                {cur.coach_reply ? <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{cur.coach_reply}</p> : null}
                <span className="muted small">Sent {fmt(cur.replied_at)}</span>
              </>
            ) : (
              <ReplyForm checkinId={cur.id} clientId={c.id} clientFirst={first} />
            )}
          </div>
        </>
      )}

      {photos.length ? (
        <div className="card">
          <h2>Compare photos</h2>
          <PhotoCompare photos={photos} poses={poses} />
        </div>
      ) : null}

      {checkins.length > 1 ? (
        <div className="card">
          <h2>Earlier check-ins</h2>
          {checkins.map((x) => (
            <Link key={x.id} href={`/coach/clients/${c.id}/checkins?c=${x.id}`} className="convo" aria-current={x.id === cur?.id ? "page" : undefined}>
              <span>
                <b>{fmt(x.created_at)}</b>
                <small className="muted">{x.weight_kg != null ? `${Number(x.weight_kg)} kg` : "No weight"}</small>
              </span>
              {x.replied_at ? <span className="chip">Replied</span> : x.coach_seen_at ? <span className="chip">Seen</span> : <span className="chip pink">New</span>}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="card">
        <h2>Check-in settings for {first}</h2>
        <form action={saveClientSettings} className="stack" style={{ gap: 12 }}>
          <input type="hidden" name="client_id" value={c.id} />
          <label className="field">
            <span>Goal module</span>
            <select name="checkin_module" className="ctl" defaultValue={module}>
              {(Object.keys(MODULES) as ModuleKey[]).map((k) => (
                <option key={k} value={k}>
                  {MODULES[k].label}: {MODULES[k].sub}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Suggested check-in day</span>
            <select name="checkin_day" className="ctl" defaultValue={settings?.checkin_day ?? ""}>
              <option value="">Any day</option>
              {WEEKDAY_NAMES.map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" name="measurements" defaultChecked={!!settings?.measurements} />
            Ask for body measurements (waist, hips, chest, thigh, arm)
          </label>
          <label className="field">
            <span>
              Photo poses, one per line{" "}
              <span className="hint">
                ({intake?.competes && intake?.division ? `${intake.federation ?? ""} ${intake.division}`.trim() : "not competing"}; the starting list comes from their division)
              </span>
            </span>
            <textarea name="poses" className="ctl" rows={Math.min(12, poses.length + 1)} defaultValue={poses.join("\n")} />
          </label>
          {settings?.poses ? (
            <label className="check small">
              <input type="checkbox" name="use_template" />
              Go back to the standard list for {intake?.division && POSE_TEMPLATES[intake.division] ? intake.division : "their goal"}
            </label>
          ) : null}
          {intake?.sex === "female" ? (
            <span className="muted small">
              Cycle questions: {intake.cycle_tracking ? `on (${first} opted in at sign-up)` : `off (${first} didn't opt in)`}.
            </span>
          ) : null}
          <button className="btn primary" style={{ alignSelf: "flex-start" }}>
            Save settings
          </button>
        </form>
      </div>
    </>
  );
}
