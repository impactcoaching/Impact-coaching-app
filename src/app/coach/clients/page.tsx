import Link from "next/link";
import { requireCoach } from "@/lib/auth";

const STATUS: Record<string, string> = { signing_up: "Filling in sign-up", pending: "To review", trial: "Free trial", active: "Active", paused: "Paused", ended: "Ended" };

export default async function ClientsPage() {
  const { supabase } = await requireCoach();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, status, country, created_at, client_intake(goal, competes, division, screening_flag)")
    .eq("role", "client")
    .order("full_name");
  const rows = data ?? [];
  return (
    <>
      <span className="eyebrow">Clients</span>
      <h1>
        Clients<span>{rows.length} in total</span>
      </h1>
      <div className="card">
        {rows.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No clients yet. Send people the sign-up link: your web address followed by /join.
          </p>
        ) : (
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
        )}
      </div>
    </>
  );
}
