// WorkoutX stock exercise demos (server only: the key must never reach the browser).
// Licence: we may play their clips but not copy or store them. We store exercise ids only,
// and ask for fresh signed links (they expire after about a day). Links are reused for
// up to 12 hours through Next's fetch cache, which the terms allow and keeps us well
// inside the monthly request allowance.

const BASE = "https://api.workoutxapp.com/v2";
const LINK_CACHE_SECONDS = 12 * 60 * 60;

export type WxExercise = {
  id: string;
  name: string;
  model: "male" | "female" | null;
  counterpartId: string | null;
  equipment: string | null;
  target: string | null;
  poster: string | null;
};

export type WxMedia = { mp4: string; poster: string | null; watermarked: boolean };

export function workoutxReady() {
  return Boolean(process.env.WORKOUTX_API_KEY);
}

export class WorkoutXError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function wx(path: string, revalidate: number | false) {
  const key = process.env.WORKOUTX_API_KEY;
  if (!key) throw new WorkoutXError("WorkoutX isn't set up yet.", 0);
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-WorkoutX-Key": key, Accept: "application/json" },
    ...(revalidate === false ? { cache: "no-store" as const } : { next: { revalidate } }),
  });
  if (!res.ok) {
    const msg =
      res.status === 401
        ? "WorkoutX didn't accept the key. Check WORKOUTX_API_KEY in Vercel."
        : res.status === 403
          ? "That needs a paid WorkoutX plan."
          : res.status === 429
            ? "WorkoutX says we've hit this month's limit (or too many at once). Try again shortly."
            : "WorkoutX didn't answer properly. Try again in a minute.";
    throw new WorkoutXError(msg, res.status);
  }
  return res.json();
}

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

function toExercise(r: Raw): WxExercise | null {
  const id = str(r.id);
  const name = str(r.name);
  if (!id || !name) return null;
  const media = (r.media ?? null) as Raw | null;
  const model = r.model === "male" || r.model === "female" ? r.model : null;
  return { id, name, model, counterpartId: str(r.counterpartId), equipment: str(r.equipment), target: str(r.target), poster: media ? str(media.poster) : null };
}

/** Search WorkoutX by name. Each call is one request from the allowance. */
export async function searchWorkoutX(name: string, limit = 10): Promise<WxExercise[]> {
  const q = new URLSearchParams({ name: name.trim(), limit: String(limit) });
  const json = (await wx(`/exercises?${q}`, LINK_CACHE_SECONDS)) as { results?: Raw[] };
  return (json.results ?? []).map(toExercise).filter((x): x is WxExercise => x !== null);
}

/** Fresh playable links for one WorkoutX clip. */
export async function workoutxMedia(id: string): Promise<WxMedia | null> {
  if (!/^ex_[A-Za-z0-9]{3,20}$/.test(id)) return null;
  const json = (await wx(`/exercises/${id}/media`, LINK_CACHE_SECONDS)) as Raw;
  const media = ((json.media ?? json) || null) as Raw | null;
  const mp4 = media ? str(media.mp4) : null;
  if (!media || !mp4) return null;
  return { mp4, poster: str(media.poster), watermarked: media.watermarked === true };
}

/** Pick the best match for one of our exercise names, trying simpler names if the full one finds nothing. */
export async function bestWorkoutXMatch(name: string): Promise<{ female: string | null; male: string | null; name: string } | null> {
  const tries = [name, name.replace(/[-°]/g, " ").replace(/\b(machine|dumbbell|barbell|cable|seated|standing|lying)\b/gi, "").replace(/\s+/g, " ").trim()];
  const words = name.split(/[\s-]+/).filter(Boolean);
  if (words.length > 2) tries.push(words.slice(-2).join(" "));
  for (const t of [...new Set(tries)].filter((t) => t.length >= 3)) {
    const found = await searchWorkoutX(t, 10);
    if (!found.length) continue;
    const wanted = new Set(name.toLowerCase().split(/[\s-]+/));
    const score = (x: WxExercise) => x.name.toLowerCase().split(/[\s-]+/).filter((w) => wanted.has(w)).length - x.name.length / 100;
    const best = [...found].sort((a, b) => score(b) - score(a))[0];
    const female = best.model === "female" ? best.id : best.model === "male" ? best.counterpartId : null;
    const male = best.model === "male" ? best.id : best.model === "female" ? best.counterpartId : best.id;
    return { female, male, name: best.name };
  }
  return null;
}
