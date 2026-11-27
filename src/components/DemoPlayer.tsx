"use client";

import { useEffect, useState } from "react";
import { getDemo } from "@/app/actions/demos";
import type { Demo } from "@/lib/demos";

/** Side panel that plays an exercise demo without leaving the app. */
export function DemoPlayer({ exerciseId, name, cues, onClose }: { exerciseId: string; name: string; cues?: string | null; onClose: () => void }) {
  const [demo, setDemo] = useState<Demo | null>(null);

  useEffect(() => {
    let live = true;
    getDemo(exerciseId)
      .then((d) => live && setDemo(d))
      .catch(() => live && setDemo({ kind: "none", reason: "The demo isn't loading just now. Check your signal and try again." }));
    return () => {
      live = false;
    };
  }, [exerciseId]);

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="panel" role="dialog" aria-label={`${name} demo`}>
        <div className="panel-head">
          <div>
            <span className="eyebrow">Demo</span>
            <h2>{name}</h2>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="demo-frame">
          {!demo ? <p className="muted small">Loading the demo…</p> : null}
          {demo?.kind === "video" ? (
            <video key={demo.src} src={demo.src} poster={demo.poster ?? undefined} controls playsInline autoPlay muted loop preload="auto" />
          ) : null}
          {demo?.kind === "embed" ? (
            <iframe src={demo.src} title={`${name} demo`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          ) : null}
          {demo?.kind === "link" ? (
            <a className="btn primary" href={demo.href} target="_blank" rel="noopener noreferrer">
              Open the demo
            </a>
          ) : null}
          {demo?.kind === "none" ? <p className="muted small">{demo.reason}</p> : null}
        </div>
        {demo?.kind === "video" && demo.watermarked ? <p className="small muted" style={{ margin: 0 }}>Preview quality. Full quality comes with the paid WorkoutX plan.</p> : null}

        {cues ? (
          <div className="stack" style={{ gap: 6 }}>
            <span className="eyebrow">Adam&apos;s cues</span>
            <p style={{ margin: 0, whiteSpace: "pre-line" }}>{cues}</p>
          </div>
        ) : null}
      </aside>
    </>
  );
}
