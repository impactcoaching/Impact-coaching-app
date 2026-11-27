import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod/v4";

// Server only. The key lives in Vercel as ANTHROPIC_API_KEY and never reaches the browser.

export const AI_MODEL = "claude-opus-5-5";

/** Rules every AI feature follows, whatever it's drafting. */
export const AI_RULES = `You help Adam, an online fitness coach (Impact Coaching) with clients in the UK, New Zealand, Australia, Ireland and the USA, with drafts. Adam reviews everything before a client sees it.
Hard rules:
- Never suggest, mention or change water intake, sodium or salt, or anything to do with peak week. Adam sets those himself. If asked, leave them out.
- Stay within safe, mainstream, evidence-based coaching. No crash diets, no very low calorie targets, no supplements or drugs.
- Respect injuries and anything in the health notes: avoid exercises that load an injured area and say so in the notes.
- Fit the client's country: name foods, brands and shops they can actually buy there, and use their currency if you mention prices (pounds in the UK, euros in Ireland, NZ dollars, Australian dollars, US dollars). If the country isn't known, don't name shops or prices.
- Use UK English. Keep notes short, warm and plain. No em dashes.`;

export function aiEnabled() {
  return !!process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

export type AiResult<T> = { data: T } | { error: string };

/** One structured request. Returns the parsed object, or a plain-English error. */
export async function draftWithAi<S extends z.ZodType>(opts: {
  schema: S;
  prompt: string;
  image?: { mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; base64: string };
  effort?: "low" | "medium" | "high";
}): Promise<AiResult<z.infer<S>>> {
  if (!aiEnabled()) return { error: "AI isn't switched on yet. Add ANTHROPIC_API_KEY in Vercel to turn it on." };
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (opts.image) content.push({ type: "image", source: { type: "base64", media_type: opts.image.mediaType, data: opts.image.base64 } });
  content.push({ type: "text", text: opts.prompt });
  try {
    const res = await getClient().beta.messages.parse(
      {
        model: AI_MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: AI_RULES,
        output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
        messages: [{ role: "user", content }],
      },
      { timeout: 120_000 },
    );
    if (res.stop_reason === "refusal") return { error: "The AI wouldn't draft this one. Try rewording the brief." };
    if (res.stop_reason === "max_tokens") return { error: "The draft was too long to finish. Try asking for fewer days or meals." };
    if (!res.parsed_output) return { error: "The AI's answer didn't come back in the right shape. Please try again." };
    return { data: res.parsed_output as z.infer<S> };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { error: "The AI key in Vercel isn't working. Check ANTHROPIC_API_KEY." };
    if (e instanceof Anthropic.RateLimitError) return { error: "The AI is busy right now. Try again in a minute." };
    if (e instanceof Anthropic.BadRequestError) return { error: "The AI couldn't read that request. If you sent a photo, try a smaller one." };
    if (e instanceof Anthropic.APIError) return { error: `The AI service had a problem (${e.status ?? "no answer"}). Try again shortly.` };
    return { error: "Couldn't reach the AI. Check your connection and try again." };
  }
}
