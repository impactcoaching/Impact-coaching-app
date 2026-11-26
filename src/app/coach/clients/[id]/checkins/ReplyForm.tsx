"use client";

import { useRef, useState, useTransition } from "react";
import { replyCheckin } from "@/app/actions/checkins";
import { uploadFile } from "@/lib/upload";

/** Reply to a check-in with text, a video, or both. Record on the phone or pick a file. */
export function ReplyForm({ checkinId, clientId, clientFirst }: { checkinId: string; clientId: string; clientFirst: string }) {
  const [text, setText] = useState("");
  const [video, setVideo] = useState<{ path?: string; name: string; uploading: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setVideo({ name: file.name, uploading: true });
    const r = await uploadFile("checkin-replies", clientId, file, 50);
    if (r.error || !r.path) {
      setVideo(null);
      setError(r.error ?? "Upload failed.");
    } else setVideo({ name: file.name, path: r.path, uploading: false });
  }

  function send() {
    setError(null);
    start(async () => {
      const r = await replyCheckin({ id: checkinId, reply: text.trim() || null, video_path: video?.path ?? null });
      if (r.error) setError(r.error);
    });
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <label className="field">
        <span>Your reply to {clientFirst}</span>
        <textarea className="ctl" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="What went well, what to change this week" />
      </label>
      <input ref={ref} type="file" accept="video/*" hidden onChange={(e) => (void onFile(e.target.files?.[0]), (e.target.value = ""))} />
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button className="btn" type="button" onClick={() => ref.current?.click()} disabled={video?.uploading}>
          {video?.uploading ? "Uploading video…" : video?.path ? "🎥 Video added ✓ (change)" : "🎥 Record or add a video"}
        </button>
        <button className="btn primary" type="button" onClick={send} disabled={busy || video?.uploading || (!text.trim() && !video?.path)}>
          {busy ? "Sending…" : `Send to ${clientFirst}`}
        </button>
      </div>
      <span className="muted small">Videos up to 50 MB, which is about 1 minute filmed on a phone (2 to 3 minutes if you set the camera to 720p). Supabase’s free plan caps uploads at 50 MB.</span>
      {error ? <p className="alert error small">{error}</p> : null}
    </div>
  );
}
