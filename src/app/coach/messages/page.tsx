import Link from "next/link";
import { requireCoach } from "@/lib/auth";

export default async function CoachMessages() {
  const { supabase, user } = await requireCoach();
  const [{ data: clients }, { data: recent }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, status").eq("role", "client").in("status", ["active", "paused", "pending"]).order("full_name"),
    supabase.from("messages").select("client_id, sender_id, body, attachment_type, created_at, read_at").order("created_at", { ascending: false }).limit(500),
  ]);
  const last = new Map<string, NonNullable<typeof recent>[number]>();
  const unread = new Map<string, number>();
  for (const m of recent ?? []) {
    if (!last.has(m.client_id)) last.set(m.client_id, m);
    if (m.sender_id !== user.id && !m.read_at) unread.set(m.client_id, (unread.get(m.client_id) ?? 0) + 1);
  }
  const list = [...(clients ?? [])].sort((a, b) => (last.get(b.id)?.created_at ?? "").localeCompare(last.get(a.id)?.created_at ?? ""));
  return (
    <>
      <span className="eyebrow">Messages</span>
      <h1>
        Messages<span>{[...unread.values()].reduce((a, b) => a + b, 0) || "no"} unread</span>
      </h1>
      <div className="card">
        {!list.length ? <p className="muted" style={{ margin: 0 }}>No clients yet.</p> : null}
        {list.map((c) => {
          const m = last.get(c.id);
          const n = unread.get(c.id) ?? 0;
          return (
            <Link key={c.id} href={`/coach/messages/${c.id}`} className="convo">
              <span style={{ minWidth: 0 }}>
                <b>{c.full_name || "Client"}</b>
                <small className="muted">
                  {m ? `${m.sender_id === user.id ? "You: " : ""}${m.body ?? (m.attachment_type === "video" ? "Video" : "Photo")}` : "No messages yet"}
                </small>
              </span>
              {n ? <span className="chip pink">{n} new</span> : null}
            </Link>
          );
        })}
      </div>
    </>
  );
}
