import Link from "next/link";
import { requireCoach } from "@/lib/auth";

export default async function CoachCheckins({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const { supabase } = await requireCoach();
  const sp = await searchParams;
  let q = supabase.from("checkins").select("id, client_id, created_at, weight_kg, coach_seen_at, replied_at, profiles!checkins_client_id_fkey(full_name)").order("created_at", { ascending: false }).limit(100);
  if (!sp.all) q = q.is("replied_at", null);
  const { data } = await q;
  const rows = (data ?? []) as unknown as { id: string; client_id: string; created_at: string; weight_kg: number | null; coach_seen_at: string | null; replied_at: string | null; profiles: { full_name: string | null } | null }[];
  const waiting = rows.filter((r) => !r.replied_at).length;

  return (
    <>
      <span className="eyebrow">Check-ins</span>
      <h1>
        Check-ins<span>{sp.all ? "all recent" : `${waiting || "none"} to reply to`}</span>
      </h1>
      <div className="seg" style={{ alignSelf: "flex-start" }}>
        <Link href="/coach/checkins" className={!sp.all ? "on" : ""}>
          To reply to
        </Link>
        <Link href="/coach/checkins?all=1" className={sp.all ? "on" : ""}>
          All recent
        </Link>
      </div>
      <div className="card">
        {!rows.length ? <p className="muted" style={{ margin: 0 }}>{sp.all ? "No check-ins yet." : "All caught up. Nice."}</p> : null}
        {rows.map((r) => (
          <Link key={r.id} href={`/coach/clients/${r.client_id}/checkins?c=${r.id}`} className="convo">
            <span>
              <b>{r.profiles?.full_name || "Client"}</b>
              <small className="muted">
                {new Date(r.created_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                {r.weight_kg != null ? ` · ${Number(r.weight_kg)} kg` : ""}
              </small>
            </span>
            {r.replied_at ? <span className="chip">Replied</span> : r.coach_seen_at ? <span className="chip">Seen</span> : <span className="chip pink">New</span>}
          </Link>
        ))}
      </div>
    </>
  );
}
