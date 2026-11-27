import Link from "next/link";
import { requireCoach } from "@/lib/auth";

const STATUS: Record<string, string> = { signing_up: "Filling in sign-up", pending: "To review", trial: "Free trial", active: "Active", paused: "Paused", ended: "Ended" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const { supabase } = await requireCoach();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, status, country, created_at, client_intake(goal, competes, division, screening_flag)")
    .eq("role", "client")
    .order("full_name");
  const all = data ?? [];
  const rows = all.filter((c) => c.status !== "ended");
  const ended = all.filter((c) => c.status === "ended");
  return (
    <>
      <span className="eyebrow">Clients</span>
      <h1>
        Clients<span>{rows.length} current</span>
      </h1>
      {deleted ? (
        <div className="alert ok" role="status">
          Client deleted. Their account, data, photos and videos have all been removed.
        </div>
      ) : null}
      <div className="card">
        {rows.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {ended.length ? "No current clients." : "No clients yet."} Send people the sign-up link: your web address followed by /join.
          </p>
        ) : (
          <ClientTable rows={rows} />
        )}
      </div>
      {ended.length ? (
        <details className="card ended-list">
          <summary>Ended ({ended.length})</summary>
          <ClientTable rows={ended} />
        </details>
      ) : null}
    </>
  );
}

type Row = {
  id: string;
  full_name: string | null;
  status: string;
  country: string | null;
  client_intake: { goal: string; competes: boolean; division: string | null; screening_flag: boolean } | { goal: string; competes: boolean; division: string | null; screening_flag: boolean }[] | null;
};

function ClientTable({ rows }: { rows: Row[] }) {
  return (
    <div className="tbl-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Goal</th>
            <th>Country</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const intake = Array.isArray(c.client_intake) ? c.client_intake[0] : c.client_intake;
            return (
              <tr key={c.id}>
                <td>
                  <Link href={`/coach/clients/${c.id}`}>{c.full_name || "No name yet"}</Link>
                </td>
                <td className="muted">{intake ? (intake.competes && intake.division ? intake.division : intake.goal.replace("_", " ")) : "–"}</td>
                <td className="muted">{c.country ?? "–"}</td>
                <td>
                  <span className={`chip${c.status === "pending" ? " pink" : ""}`}>{STATUS[c.status]}</span>
                  {intake?.screening_flag ? <span className="chip warn" style={{ marginLeft: 6 }}>Health flag</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
