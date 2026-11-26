"use client";

import { useEffect, useRef, useState } from "react";
import { markIntroSeen } from "@/app/actions/intro";

/** Plays once, the first time a client opens the app. Muted, skippable, about 10 seconds. */
export function IntroReel({ first }: { first: string }) {
  const [open, setOpen] = useState(true);
  const [ended, setEnded] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Respect reduced motion: show the still and the welcome, no playback.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setEnded(true);
    else void ref.current?.play().catch(() => setEnded(true));
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function close() {
    setOpen(false);
    document.body.style.overflow = "";
    void markIntroSeen();
  }

  if (!open) return null;
  return (
    <div className={`intro${ended ? " done" : ""}`} role="dialog" aria-label="Welcome to Impact Coaching">
      <video ref={ref} src="/intro/reel.mp4" poster="/intro/poster.jpg" muted playsInline preload="auto" onEnded={() => setEnded(true)} aria-hidden />
      <div className="intro-shade" />
      <div className="intro-text">
        <div className="intro-brand">
          IMPACT<b>.</b>
          <small>COACHING</small>
        </div>
        <p className="intro-hi">
          Welcome to the team{first ? `, ${first}` : ""}
        </p>
        <button className="btn primary big intro-go" onClick={close}>
          Let&apos;s go
        </button>
      </div>
      {!ended ? (
        <button className="intro-skip" onClick={close}>
          Skip
        </button>
      ) : null}
    </div>
  );
}
