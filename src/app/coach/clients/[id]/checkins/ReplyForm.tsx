"use client";

import { useRef, useState, useTransition } from "react";
import { replyCheckin } from "@/app/actions/checkins";
import { uploadFile } from "@/lib/upload";
import { VideoRecorder } from "@/components/VideoRecorder";

/** Reply to a check-in with text, a video, or both. Record in the page (screen + face on a laptop, face bubble on a phone) or pick a file. */
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
    const r = await uploadFile("checkin-replies", clientId, file, 200);
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
        {video?.uploading ? (
          <span className="btn" aria-live="polite">Uploading video…</span>
        ) : video?.path ? (
          <span className="chip pink">🎥 Video added ✓</span>
        ) : null}
        <VideoRecorder onDone={(f) => void onFile(f)} disabled={video?.uploading} />
        <button className="btn" type="button" onClick={() => ref.current?.click()} disabled={video?.uploading}>
          {video?.path ? "Change video" : "Upload a video"}
        </button>
        <button className="btn primary" type="button" onClick={send} disabled={busy || video?.uploading || (!text.trim() && !video?.path)}>
          {busy ? "Sending…" : `Send to ${clientFirst}`}
        </button>
      </div>
      <span className="muted small">Record here and scroll through their check-in while you talk, up to 10 minutes. Or upload a video up to 200 MB. Bigger files take longer to upload on mobile data.</span>
      {error ? <p className="alert error small">{error}</p> : null}
    </div>
  );
}
