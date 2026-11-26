"use client";

import { useRef, useState, useTransition } from "react";
import { addPhotos } from "@/app/actions/checkins";
import { uploadFile } from "@/lib/upload";

/** Add photos outside a check-in, e.g. on a new-week morning. */
export function AddPhotos({ userId, poses }: { userId: string; poses: string[] }) {
  const ref = useRef<HTMLInputElement>(null);
  const [pose, setPose] = useState(poses[0] ?? "Relaxed front");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [busy, start] = useTransition();

  function onFile(file: File | undefined) {
    if (!file) return;
    setMsg(null);
    start(async () => {
      const up = await uploadFile("progress-photos", userId, file, 20);
      if (up.error || !up.path) return setMsg({ error: up.error ?? "Upload failed." });
      const r = await addPhotos({ photos: [{ pose, path: up.path }] });
      setMsg(r.error ? { error: r.error } : { ok: `Added your ${pose.toLowerCase()} photo.` });
    });
  }

  return (
    <div className="card" data-tour="add-photos">
      <h2>Add a photo</h2>
      <label className="field">
        <span>Pose</span>
        <select className="ctl" value={pose} onChange={(e) => setPose(e.target.value)}>
          {poses.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button className="btn" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? "Uploading…" : "📷 Take or choose a photo"}
      </button>
      {msg?.error ? <p className="alert error small">{msg.error}</p> : null}
      {msg?.ok ? <p className="alert ok small">{msg.ok}</p> : null}
    </div>
  );
}
