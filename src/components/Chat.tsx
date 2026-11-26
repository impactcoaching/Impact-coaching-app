"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { markRead, sendMessage } from "@/app/actions/checkins";
import { uploadFile } from "@/lib/upload";

export type ChatMessage = {
  id: string;
  sender_id: string;
  body: string | null;
  url: string | null;
  attachment_type: "image" | "video" | null;
  created_at: string;
  read_at: string | null;
};

/** One conversation between Adam and a client. New messages show up every 15 seconds while it's open. */
export function Chat({ clientId, meId, otherName, messages, timeZone }: { clientId: string; meId: string; otherName: string; messages: ChatMessage[]; timeZone?: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const unread = messages.some((m) => m.sender_id !== meId && !m.read_at);

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(t);
  }, [router]);
  useEffect(() => {
    if (unread) void markRead(clientId);
  }, [unread, clientId]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function send(attachment?: { path: string; type: "image" | "video" }) {
    const body = text.trim();
    if (!body && !attachment) return;
    setError(null);
    start(async () => {
      const r = await sendMessage({ clientId, body: body || null, attachment_path: attachment?.path ?? null, attachment_type: attachment?.type ?? null });
      if (r.error) setError(r.error);
      else {
        setText("");
        router.refresh();
      }
    });
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    const type = file.type.startsWith("video") ? "video" : "image";
    setError(null);
    start(async () => {
      const up = await uploadFile("message-files", clientId, file, type === "video" ? 50 : 20);
      if (up.error || !up.path) return setError(up.error ?? "Upload failed.");
      const r = await sendMessage({ clientId, body: text.trim() || null, attachment_path: up.path, attachment_type: type });
      if (r.error) setError(r.error);
      else {
        setText("");
        router.refresh();
      }
    });
  }

  const time = (d: string) => new Date(d).toLocaleString("en-GB", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone });

  return (
    <div className="chat">
      <div className="chat-list">
        {!messages.length ? <p className="muted small">No messages yet. Say hello to {otherName}.</p> : null}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={`bubble${mine ? " me" : ""}`}>
              {m.url && m.attachment_type === "image" ? (
                <a href={m.url} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt="Photo" />
                </a>
              ) : null}
              {m.url && m.attachment_type === "video" ? <video src={m.url} controls playsInline preload="metadata" /> : null}
              {m.body ? <p>{m.body}</p> : null}
              <small suppressHydrationWarning>
                {time(m.created_at)}
                {mine && m.read_at ? " · Seen" : ""}
              </small>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {error ? (
        <p className="alert error small" role="alert">
          {error}
        </p>
      ) : null}
      <div className="chat-input" data-tour="chat-input">
        <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ""))} />
        <button className="iconbtn" type="button" data-tour="chat-attach" onClick={() => fileRef.current?.click()} aria-label="Add a photo or video" disabled={busy}>
          📎
        </button>
        <textarea
          className="ctl"
          rows={1}
          value={text}
          placeholder={`Message ${otherName}`}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="btn primary" type="button" onClick={() => send()} disabled={busy || !text.trim()}>
          {busy ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
