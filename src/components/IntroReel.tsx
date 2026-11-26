"use client";

import { useEffect, useRef, useState } from "react";
import { markIntroSeen } from "@/app/actions/intro";

/**
 * Optional video behind the intro. Leave as null for the animated scene alone.
 * To use a clip: put it in public/intro/ (portrait, about 10 seconds, muted, under ~2MB) and set e.g. "/intro/reel.mp4".
 */
const INTRO_VIDEO: string | null = null;

/** How long the animated scene runs before "Let's go" appears, in ms. */
const SCENE_MS = 3800;

/** Plays once, the first time a client opens the app. Skippable. */
export function IntroReel({ first }: { first: string }) {
  const [open, setOpen] = useState(true);
  const [ended, setEnded] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setEnded(true);
    else if (INTRO_VIDEO) void ref.current?.play().catch(() => setEnded(true));
    else timer = setTimeout(() => setEnded(true), SCENE_MS);
    return () => {
      document.body.style.overflow = "";
      if (timer) clearTimeout(timer);
    };
  }, []);

  function close() {
    setOpen(false);
    document.body.style.overflow = "";
    void markIntroSeen();
  }

  if (!open) return null;
  return (
    <div className={`intro${ended ? " done" : ""}${INTRO_VIDEO ? "" : " scene"}`} role="dialog" aria-label="Welcome to Impact Coaching">
      {INTRO_VIDEO ? (
        <video ref={ref} src={INTRO_VIDEO} muted playsInline preload="auto" onEnded={() => setEnded(true)} aria-hidden />
      ) : (
        <div className="scene-bg" aria-hidden>
          <i className="glow" />
          <i className="streak s1" />
          <i className="streak s2" />
          <i className="streak s3" />
          <i className="flash" />
        </div>
      )}
      <div className="intro-shade" />
      <div className="intro-text">
        <div className="intro-brand">
          {"IMPACT".split("").map((c, i) => (
            <span key={i} style={{ animationDelay: `${0.5 + i * 0.08}s` }}>
              {c}
            </span>
          ))}
          <b>.</b>
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
