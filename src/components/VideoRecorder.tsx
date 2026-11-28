"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Kind = "screen" | "face";
type Phase = "idle" | "starting" | "recording" | "review";

const MAX_BYTES = 195 * 1024 * 1024; // stays under the 200 MB upload limit
const MAX_SECONDS = 10 * 60;
const TYPES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

function pickType() {
  if (typeof MediaRecorder === "undefined") return null;
  return TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Record a video reply without leaving the page, like Loom.
 * Laptop: records the screen, with your face in a bubble in the corner (the bubble is on the
 * page, so it shows in the recording). Phone: a face bubble floats while you scroll; browsers
 * on phones can't record the screen, so the video is your face and voice.
 */
export function VideoRecorder({ onDone, disabled }: { onDone: (file: File) => void; disabled?: boolean }) {
  const [canScreen, setCanScreen] = useState(false);
  const [supported, setSupported] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [kind, setKind] = useState<Kind>("face");
  const [secs, setSecs] = useState(0);
  const [side, setSide] = useState<"right" | "left">("right");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ file: File; url: string } | null>(null);

  const cam = useRef<MediaStream | null>(null);
  const screen = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const bytes = useRef(0);
  const started = useRef(0);
  const bubble = useRef<HTMLVideoElement>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    const md = navigator.mediaDevices;
    setSupported(!!md?.getUserMedia && pickType() !== null);
    setCanScreen(typeof md?.getDisplayMedia === "function" && !window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - started.current) / 1000);
      setSecs(s);
      if (s >= MAX_SECONDS) stop();
    }, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Show the camera in the bubble once it's on screen.
  useEffect(() => {
    if (bubble.current && cam.current && bubble.current.srcObject !== cam.current) {
      bubble.current.srcObject = cam.current;
      void bubble.current.play().catch(() => {});
    }
  });

  useEffect(() => () => release(), []);

  function release() {
    for (const s of [cam.current, screen.current]) s?.getTracks().forEach((t) => t.stop());
    cam.current = null;
    screen.current = null;
  }

  async function begin(k: Kind) {
    setError(null);
    setKind(k);
    setPhase("starting");
    cancelled.current = false;
    try {
      cam.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: k === "face" ? 720 : 480 }, height: { ideal: k === "face" ? 1280 : 480 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      release();
      setPhase("idle");
      setError("The camera or microphone didn't start. Check the browser has permission to use them, then try again.");
      return;
    }
    let stream: MediaStream;
    if (k === "screen") {
      try {
        screen.current = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 24 },
          audio: false,
          // Chrome: offer "this tab" first, so the check-in and your face bubble are what gets recorded.
          preferCurrentTab: true,
          selfBrowserSurface: "include",
        } as DisplayMediaStreamOptions);
      } catch {
        release();
        setPhase("idle");
        setError("Screen sharing was cancelled. Pick this tab when the browser asks, so the client sees the check-in.");
        return;
      }
      const v = screen.current.getVideoTracks()[0];
      v.addEventListener("ended", () => stop()); // the browser's own "Stop sharing" button
      stream = new MediaStream([v, ...cam.current.getAudioTracks()]);
    } else {
      stream = cam.current;
    }

    const type = pickType() || undefined;
    let r: MediaRecorder;
    try {
      r = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: k === "screen" ? 2_500_000 : 2_000_000 });
    } catch {
      r = new MediaRecorder(stream);
    }
    chunks.current = [];
    bytes.current = 0;
    r.ondataavailable = (e) => {
      if (!e.data.size) return;
      chunks.current.push(e.data);
      bytes.current += e.data.size;
      if (bytes.current > MAX_BYTES) stop();
    };
    r.onstop = () => {
      release();
      if (cancelled.current) {
        setPhase("idle");
        return;
      }
      const base = (r.mimeType || type || "video/mp4").split(";")[0];
      const blob = new Blob(chunks.current, { type: base });
      const ext = base.includes("webm") ? "webm" : "mp4";
      const file = new File([blob], `reply-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.${ext}`, { type: base });
      setResult({ file, url: URL.createObjectURL(blob) });
      setPhase("review");
    };
    rec.current = r;
    r.start(1000);
    started.current = Date.now();
    setSecs(0);
    setPhase("recording");
  }

  function stop() {
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
  }

  function cancel() {
    cancelled.current = true;
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
    else {
      release();
      setPhase("idle");
    }
  }

  function discard() {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setPhase("idle");
  }

  function use() {
    if (!result) return;
    onDone(result.file);
    URL.revokeObjectURL(result.url);
    setResult(null);
    setPhase("idle");
  }

  if (!supported) return null;

  return (
    <>
      {canScreen ? (
        <>
          <button className="btn" type="button" onClick={() => begin("screen")} disabled={disabled || phase !== "idle"}>
            ⏺ Record screen + face
          </button>
          <button className="btn" type="button" onClick={() => begin("face")} disabled={disabled || phase !== "idle"}>
            🙂 Face only
          </button>
        </>
      ) : (
        <button className="btn" type="button" onClick={() => begin("face")} disabled={disabled || phase !== "idle"}>
          ⏺ Record while you scroll
        </button>
      )}
      {error ? <p className="alert error small" style={{ flexBasis: "100%", margin: 0 }}>{error}</p> : null}

      {(phase === "starting" || phase === "recording") && typeof document !== "undefined"
        ? createPortal(
            <>
              <div className="recbar" role="status">
                <span className="recdot" aria-hidden />
                <b>{phase === "starting" ? "Starting…" : clock(secs)}</b>
                <span className="muted small recnote">{kind === "screen" ? "Scroll and point, it's all recorded" : "Scroll the check-in while you talk"}</span>
                <button className="btn small" type="button" onClick={cancel}>
                  Cancel
                </button>
                <button className="btn small primary" type="button" onClick={stop} disabled={phase !== "recording"}>
                  Stop
                </button>
              </div>
              <button type="button" className={`recbubble ${side}`} onClick={() => setSide(side === "right" ? "left" : "right")} aria-label="Move the camera bubble to the other side">
                <video ref={bubble} muted playsInline autoPlay />
              </button>
            </>,
            document.body,
          )
        : null}

      {phase === "review" && result
        ? createPortal(
            <div className="recreview" role="dialog" aria-label="Check your video">
              <div className="card stack" style={{ gap: 12 }}>
                <h2 style={{ margin: 0 }}>Happy with it?</h2>
                <video src={result.url} controls playsInline />
                <span className="muted small">
                  {clock(secs)} · {(result.file.size / 1024 / 1024).toFixed(0)} MB
                </span>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <button className="btn primary" type="button" onClick={use}>
                    Use this video
                  </button>
                  <button className="btn" type="button" onClick={discard}>
                    Bin it
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
