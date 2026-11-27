"use client";

import { useEffect } from "react";

/** Shown instead of a blank error page. Reports the error so it can be fixed, and offers a reload. */
export function CrashScreen({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    try {
      const body = JSON.stringify({ message: error.message, digest: error.digest, stack: error.stack, path: location.pathname });
      if (!navigator.sendBeacon?.("/api/client-error", new Blob([body], { type: "application/json" })))
        void fetch("/api/client-error", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
    } catch {}
  }, [error]);

  return (
    <main className="narrow" style={{ minHeight: "100dvh", justifyContent: "center", textAlign: "center" }}>
      <h1>
        Sorry about that
        <span>something went wrong</span>
      </h1>
      <p className="muted">Reloading usually fixes it. Anything youReloading usually fixes it. Your details are saved.apos;d already sent is saved.</p>
      <div className="stack" style={{ gap: 10 }}>
        <button className="btn primary block" onClick={() => location.reload()}>
          Reload
        </button>
        <a className="btn block" href="/">
          Back to the start
        </a>
      </div>
      <p className="muted small" style={{ wordBreak: "break-word" }}>
        If it keeps happening, send Adam a screenshot of this: {error.digest ?? error.message?.slice(0, 120) ?? "unknown"}
      </p>
    </main>
  );
}
