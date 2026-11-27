import { requireClientView } from "@/lib/auth";
import { loadConversation } from "@/lib/messages-server";
import Link from "next/link";
import { Chat } from "@/components/Chat";

export default async function MessagesPage() {
  const { supabase, user, mode, readOnly } = await requireClientView();
  if (mode === "me")
    return (
      <>
        <span className="eyebrow">Messages</span>
        <h1>Messages</h1>
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            This is where clients message you. Your own conversations are in the coach app. <Link href="/coach/messages">Open messages ›</Link>
          </p>
        </div>
      </>
    );
  const messages = await loadConversation(supabase, user.id);
  return (
    <>
      <span className="eyebrow">Messages</span>
      <h1>
        Adam<span>your coach</span>
      </h1>
      <Chat clientId={user.id} meId={user.id} otherName="Adam" messages={messages} readOnly={readOnly} />
    </>
  );
}
