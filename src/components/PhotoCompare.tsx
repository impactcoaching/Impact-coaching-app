"use client";

import { useMemo, useState } from "react";

export type Photo = { id: string; pose: string; taken_on: string; url: string };
type Mode = "side" | "slider" | "overlay";

const fmt = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Compare two progress photos of the same pose: side by side, a slider, or one faded over the other. */
export function PhotoCompare({ photos, poses }: { photos: Photo[]; poses: string[] }) {
  const available = useMemo(() => {
    const have = new Set(photos.map((p) => p.pose));
    const ordered = poses.filter((p) => have.has(p));
    return [...ordered, ...[...have].filter((p) => !ordered.includes(p))];
  }, [photos, poses]);
  const [pose, setPose] = useState(available[0] ?? "");
  const list = useMemo(() => photos.filter((p) => p.pose === pose).sort((a, b) => a.taken_on.localeCompare(b.taken_on)), [photos, pose]);
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("side");
  const [pos, setPos] = useState(50);

  if (!available.length) return <p className="muted small" style={{ margin: 0 }}>No photos yet.</p>;
  const before = list.find((p) => p.id === beforeId) ?? list[0];
  const after = list.find((p) => p.id === afterId) ?? list[list.length - 1];

  const pick = (value: string | null, set: (v: string) => void, label: string) => (
    <label className="field">
      <span>{label}</span>
      <select className="ctl" value={value ?? ""} onChange={(e) => set(e.target.value)}>
        {list.map((p) => (
          <option key={p.id} value={p.id}>
            {fmt(p.taken_on)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        {available.map((p) => (
          <button
            key={p}
            type="button"
            className={`mini${p === pose ? " done" : ""}`}
            onClick={() => {
              setPose(p);
              setBeforeId(null);
              setAfterId(null);
            }}
          >
            {p}
          </button>
        ))}
      </div>
      {list.length < 2 ? (
        <>
          <p className="muted small" style={{ margin: 0 }}>Only one {pose.toLowerCase()} photo so far. Once there&apos;s another, you can compare them here.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cmp-one" src={list[0].url} alt={`${pose}, ${fmt(list[0].taken_on)}`} />
        </>
      ) : (
        <>
          <div className="grid2">
            {pick(before.id, setBeforeId, "Before")}
            {pick(after.id, setAfterId, "After")}
          </div>
          <div className="seg" role="tablist" aria-label="How to compare">
            {(
              [
                ["side", "Side by side"],
                ["slider", "Slider"],
                ["overlay", "Overlay"],
              ] as const
            ).map(([m, l]) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
                {l}
              </button>
            ))}
          </div>
          {mode === "side" ? (
            <div className="cmp-side">
              {[before, after].map((p, i) => (
                <figure key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`${pose}, ${fmt(p.taken_on)}`} />
                  <figcaption>{fmt(p.taken_on)}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <>
              <div className="cmp-stack">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={after.url} alt={`${pose}, ${fmt(after.taken_on)}`} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={before.url}
                  alt={`${pose}, ${fmt(before.taken_on)}`}
                  className="top"
                  style={mode === "slider" ? { clipPath: `inset(0 ${100 - pos}% 0 0)` } : { opacity: pos / 100 }}
                />
                {mode === "slider" ? <i className="cmp-line" style={{ left: `${pos}%` }} /> : null}
                <span className="cmp-tag l">{fmt(before.taken_on)}</span>
                <span className="cmp-tag r">{fmt(after.taken_on)}</span>
              </div>
              <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label={mode === "slider" ? "Slide between photos" : "Fade between photos"} />
            </>
          )}
        </>
      )}
    </div>
  );
}
