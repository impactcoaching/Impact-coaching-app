// Exercise demos: what the coach has set, and how the app shows it.

export type DemoFields = {
  demo_path: string | null;
  wx_female: string | null;
  wx_male: string | null;
  demo_url: string | null;
};

export type DemoSource = "own" | "stock" | "link" | "none";

/** Which demo a client sees. The coach's own video always wins over stock. Stock only counts while WorkoutX is switched on. */
export function demoSource(e: DemoFields, stockOn = true): DemoSource {
  if (e.demo_path) return "own";
  if (stockOn && (e.wx_female || e.wx_male)) return "stock";
  if (e.demo_url) return "link";
  return "none";
}

export const DEMO_LABEL: Record<DemoSource, string> = {
  own: "Your video",
  stock: "Stock demo",
  link: "Link",
  none: "No demo yet",
};

/** A YouTube link as a privacy-friendly embed, or null for anything else. */
export function youtubeEmbed(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ?? null;
    }
    return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0` : null;
  } catch {
    return null;
  }
}

export type Demo =
  | { kind: "video"; src: string; poster: string | null; stock: boolean; watermarked: boolean }
  | { kind: "embed"; src: string }
  | { kind: "link"; href: string }
  | { kind: "none"; reason: string };
