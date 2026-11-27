import Link from "next/link";
import { requireCoach } from "@/lib/auth";

export default async function CoachDashboard() {
  const { supabase, profile, user } = await requireCoach();
  const [{ data: clients }, { count: toReply }, { count: unread }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, status, created_at").eq("role", "client").order("created_at", { ascending: false }),
    supabase.from("checkins").select("id", { count: "exact", head: true }).is("replied_at", null),
    supabase.from("messages").select("id", { count: "exact", head: true }).is("read_at", null).neq("sender_id", user.id),
  ]);
  const list = clients ?? [];
  const pending = list.filter((c) => c.status === "pending");
  const active = list.filter((c) => c.status === "active");
  const trials = list.filter((c) => c.status === "trial");
  const first = (profile.full_name ?? "").split(" ")[0] || "Coach";
  return (
    <>
      <span className="eyebrow">Dashboard</span>
      <h1>
        Morning {first}
        <span>here&apos;s today</span>
      </h1>
      <div className="grid2">
        <div className="card">
          <span className="eyebrow">Active clients</span>
          <h2 className="num" style={{ fontSize: 44 }}>
            {active.length}
            <span className="muted small" style={{ fontFamily: "var(--body)", textTransform: "none", marginLeft: 8 }}>
              of 50 places
            </span>
          </h2>
        </div>
        <div className="card">
          <span className="eyebrow">New sign-ups to review</span>
          <h2 className="num" style={{ fontSize: 44 }}>{pending.length}</h2>
        </div>
        <Link href="/coach/trials" className="card" style={{ textDecoration: "none", color: "var(--fg)" }}>
          <span className="eyebrow">Free trials</span>
          <h2 className="num" style={{ fontSize: 44 }}>{trials.length}</h2>
        </Link>
        <Link href="/coach/checkins" className="card" style={{ textDecoration: "none", color: "var(--fg)" }}>
          <span className="eyebrow">Check-ins to reply to</span>
          <h2 className="num" style={{ fontSize: 44 }}>{toReply ?? 0}</h2>
        </Link>
        <Link href="/coach/messages" className="card" style={{ textDecoration: "none", color: "var(--fg)" }}>
          <span className="eyebrow">Unread messages</span>
          <h2 className="num" style={{ fontSize: 44 }}>{unread ?? 0}</h2>
        </Link>
      </div>
      {pending.length ? (
        <div className="card">
          <h2>New sign-ups</h2>
          {pending.map((c) => (
            <Link key={c.id} href={`/coach/clients/${c.id}`} className="row" style={{ justifyContent: "space-between", textDecoration: "none", color: "var(--fg)" }}>
              <b>{c.full_name || "New client"}</b>
              <span className="chip pink">Review answers</span>
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
