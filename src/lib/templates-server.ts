import type { requireCoach } from "@/lib/auth";
import { daysPerWeek, kcalRange, nutritionBody, resolveExercises, resolveFoods, tagLine, templatePath, trainingBody, type Template, type TemplateKind } from "@/lib/templates";
import { STYLES } from "@/lib/nutrition";
import type { TemplateCard } from "@/app/coach/library/TemplateList";

type Supa = Awaited<ReturnType<typeof requireCoach>>["supabase"];

/** All templates of one kind, as cards for the list. `ready` is false until 0017 has been run. */
export async function templateCards(supabase: Supa, kind: TemplateKind): Promise<{ cards: TemplateCard[]; ready: boolean }> {
  const { data, error } = await supabase.from("templates").select("*").eq("kind", kind).order("name");
  if (error) return { cards: [], ready: false };
  const [{ data: ex }, { data: foods }] = await Promise.all([
    kind === "training" ? supabase.from("exercises").select("id, name") : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    kind === "nutrition" ? supabase.from("foods").select("id, name, brand").is("owner_id", null) : Promise.resolve({ data: [] as { id: string; name: string; brand: string | null }[] }),
  ]);
  const cards = ((data ?? []) as Template[]).map((t) => {
    let facts = "";
    let days: number | null = null;
    let missing = 0;
    if (kind === "training") {
      const b = trainingBody(t.body);
      days = daysPerWeek(b);
      const sessions = b.workouts.length;
      facts = [`${days} ${days === 1 ? "day" : "days"} a week`, `${sessions} ${sessions === 1 ? "session" : "sessions"}`, b.cardio ? "with cardio" : null].filter(Boolean).join(" · ");
      missing = resolveExercises(b, ex ?? []).missing.length;
    } else {
      const b = nutritionBody(t.body);
      facts = [STYLES[b.style].label, kcalRange(b), `${b.day_types.length} day ${b.day_types.length === 1 ? "type" : "types"}`].filter(Boolean).join(" · ");
      missing = resolveFoods(b, foods ?? []).missing.length;
    }
    return { id: t.id, href: templatePath(t), name: t.name, summary: t.summary, goal: t.goal, level: t.level, location: t.location, audience: t.audience, competitor: t.competitor, tags: t.tags, tagLine: tagLine(t), facts, days, missing };
  });
  return { cards, ready: true };
}

/** Who a template can be copied onto: current clients, plus the coach's own training. */
export async function copyTargets(supabase: Supa, me: { id: string }) {
  const { data } = await supabase.from("profiles").select("id, full_name, status").eq("role", "client").in("status", ["pending", "trial", "active", "paused"]).order("full_name");
  const status: Record<string, string> = { pending: " (to review)", trial: " (free trial)", paused: " (paused)", active: "" };
  return [...(data ?? []).map((c) => ({ id: c.id as string, label: `${c.full_name || "Client"}${status[c.status as string] ?? ""}` })), { id: me.id, label: "Me (My training)" }];
}

/** Templates to pick from on a client's page. */
export async function templateChoices(supabase: Supa, kind: TemplateKind) {
  const { data, error } = await supabase.from("templates").select("id, name, goal, level, body").eq("kind", kind).order("name");
  if (error) return null;
  return (data ?? []).map((t) => ({
    id: t.id as string,
    label: [t.name, t.goal, t.level].filter(Boolean).join(" · "),
    cardio: kind === "training" ? !!trainingBody(t.body).cardio : false,
  }));
}
