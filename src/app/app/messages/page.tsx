import { requireProfile } from "@/lib/auth";
import { loadConversation } from "@/lib/messages-server";
import { Chat } from "@/components/Chat";

export default async function MessagesPage() {
  const { supabase, user } = await requireProfile();
  const messages = await loadConversation(supabase, user.id);
  return (
    <>
      <span className="eyebrow">Messages</span>
      <h1>
        Adam<span>your coach</span>
      </h1>
      <Chat clientId={user.id} meId={user.id} otherName="Adam" messages={messages} />
    </>
  );
}
