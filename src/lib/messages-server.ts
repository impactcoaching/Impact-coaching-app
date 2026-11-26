import type { requireProfile } from "@/lib/auth";
import type { ChatMessage } from "@/components/Chat";

type Supa = Awaited<ReturnType<typeof requireProfile>>["supabase"];

/** The latest messages in a client's conversation, oldest first, with signed links for attachments. */
export async function loadConversation(supabase: Supa, clientId: string): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, body, attachment_path, attachment_type, created_at, read_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []).reverse();
  const paths = rows.map((r) => r.attachment_path).filter((p): p is string => !!p);
  const signed: Record<string, string> = {};
  if (paths.length) {
    const { data: s } = await supabase.storage.from("message-files").createSignedUrls(paths, 3600);
    s?.forEach((d) => d.path && d.signedUrl && (signed[d.path] = d.signedUrl));
  }
  return rows.map((r) => ({
    id: r.id,
    sender_id: r.sender_id,
    body: r.body,
    url: r.attachment_path ? signed[r.attachment_path] ?? null : null,
    attachment_type: r.attachment_type as ChatMessage["attachment_type"],
    created_at: r.created_at,
    read_at: r.read_at,
  }));
}
