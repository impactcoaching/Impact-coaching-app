import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { loadConversation } from "@/lib/messages-server";
import { Chat } from "@/components/Chat";
import { ClientTabs } from "@/components/ClientTabs";

export default async function CoachConversation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireCoach();
  const { data: c } = await supabase.from("profiles").select("id, full_name").eq("id", id).eq("role", "client").maybeSingle();
  if (!c) notFound();
  const messages = await loadConversation(supabase, id);
  const first = (c.full_name ?? "").split(" ")[0] || "your client";
  return (
    <>
      <Link href="/coach/messages" className="small">
        ← All messages
      </Link>
      <h1>{c.full_name || "Client"}</h1>
      <ClientTabs id={c.id} active="messages" />
      <Chat clientId={c.id} meId={user.id} otherName={first} messages={messages} />
    </>
  );
}
