import type { FoundFood } from "./nutrition";

// Open Food Facts: a free, open database of branded and supermarket foods.
// Their search allows about 10 searches a minute per server, so we only search
// when someone presses the button, never on every key press.
const HOST: Record<string, string> = { UK: "uk", NZ: "nz", AU: "au", US: "us", IE: "ie" };
const FIELDS = "code,product_name,product_name_en,brands,nutriments,serving_quantity,serving_size";
const HEADERS = { "User-Agent": "ImpactCoachingApp/1.0 (web)", Accept: "application/json" };

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_quantity?: number | string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
};

const n = (v: unknown) => {
  const x = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(x) ? x : null;
};

function toFood(p: OffProduct): FoundFood | null {
  const name = (p.product_name_en || p.product_name || "").trim();
  const nu = p.nutriments ?? {};
  let kcal = n(nu["energy-kcal_100g"]);
  if (kcal == null) {
    const kj = n(nu["energy-kj_100g"]) ?? n(nu["energy_100g"]);
    if (kj != null) kcal = kj / 4.184;
  }
  if (!name || kcal == null || kcal > 950) return null;
  const sodiumG = n(nu["sodium_100g"]) ?? (n(nu["salt_100g"]) != null ? n(nu["salt_100g"])! / 2.5 : null);
  const serving = n(p.serving_quantity);
  return {
    id: null,
    owner_id: null,
    name: name.slice(0, 120),
    brand: p.brands ? p.brands.split(",")[0].trim().slice(0, 80) : null,
    kcal: Math.round(kcal * 10) / 10,
    protein_g: Math.round((n(nu["proteins_100g"]) ?? 0) * 10) / 10,
    carbs_g: Math.round((n(nu["carbohydrates_100g"]) ?? 0) * 10) / 10,
    fat_g: Math.round((n(nu["fat_100g"]) ?? 0) * 10) / 10,
    fibre_g: n(nu["fiber_100g"]),
    sodium_mg: sodiumG != null ? Math.round(sodiumG * 1000) : null,
    serving_g: serving && serving > 0 && serving < 2000 ? serving : null,
    serving_name: p.serving_size ? p.serving_size.slice(0, 40) : null,
    barcode: p.code ?? null,
    source: "off",
  };
}

const COUNTRY_TAG: Record<string, string> = { UK: "en:united-kingdom", NZ: "en:new-zealand", AU: "en:australia", US: "en:united-states", IE: "en:ireland" };
const BUSY = "The supermarket search is busy. Try again in a minute.";
const DOWN = "The supermarket search isn't answering right now.";

type Attempt = { foods: FoundFood[]; error?: string };
const clean = (list: (OffProduct | undefined)[]) => list.map((p) => (p ? toFood(p) : null)).filter((x): x is FoundFood => !!x);

/**
 * Search Open Food Facts. Works from the browser (each phone gets its own rate limit)
 * and from the server. Tries the newer fast search first, then the classic one.
 * Pass server = true to send a proper User-Agent (browsers don't allow it).
 */
export async function searchOff(q: string, country: string | null, server = false): Promise<Attempt> {
  const init: RequestInit = { cache: "no-store", ...(server ? { headers: HEADERS } : {}) };
  const timeout = (ms: number) => ({ ...init, signal: AbortSignal.timeout(ms) });
  const code = q.replace(/\s/g, "");
  const notes: string[] = [];

  if (/^\d{8,14}$/.test(code)) {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`, timeout(8000));
      if (res.status === 404) return { foods: [] };
      if (!res.ok) return { foods: [], error: res.status === 429 ? BUSY : `${DOWN} (${res.status})` };
      const j = (await res.json()) as { product?: OffProduct };
      return { foods: clean([j.product ? { ...j.product, code } : undefined]) };
    } catch (e) {
      return { foods: [], error: `${DOWN} (${(e as Error).name})` };
    }
  }

  // 1. Search-a-licious, the newer fast search. It finds products by name; we then fetch
  // their nutrition in one go from the product API, because the search index may not
  // carry full nutrition and asking it for unknown fields is refused (400).
  const salicious = async (query: string) => {
    const res = await fetch(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&page_size=20&langs=en`, timeout(7000));
    if (!res.ok) {
      notes.push(`s${res.status}`);
      return null;
    }
    const hits = ((await res.json()) as { hits?: OffProduct[] }).hits ?? [];
    return hits;
  };
  try {
    const tag = COUNTRY_TAG[country ?? ""];
    let hits = tag ? await salicious(`${q} countries_tags:"${tag}"`) : null;
    if (!hits || !hits.length) hits = await salicious(q);
    if (hits) {
      if (!hits.length) return { foods: [] };
      const direct = clean(hits);
      if (direct.length >= Math.min(5, hits.length)) return { foods: direct };
      const codes = hits.map((h) => h.code).filter((c): c is string => !!c).slice(0, 20);
      if (codes.length) {
        const res = await fetch(`https://world.openfoodfacts.org/api/v2/search?code=${codes.join(",")}&page_size=20&fields=${FIELDS}`, timeout(8000));
        if (res.ok) {
          const products = ((await res.json()) as { products?: OffProduct[] }).products ?? [];
          // Keep search order.
          const byCode = new Map(products.map((p) => [p.code, p]));
          const foods = clean(codes.map((c) => byCode.get(c)));
          if (foods.length) return { foods };
          notes.push("p0");
        } else notes.push(`p${res.status}`);
      }
    }
  } catch (e) {
    notes.push(`s-${(e as Error).name}`);
  }

  // 2. The classic search, on the country's own site.
  try {
    const host = HOST[country ?? ""] ?? "world";
    const res = await fetch(
      `https://${host}.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=${FIELDS}`,
      timeout(10000),
    );
    if (res.ok) return { foods: clean(((await res.json()) as { products?: OffProduct[] }).products ?? []) };
    if (res.status === 429) return { foods: [], error: BUSY };
    notes.push(`c${res.status}`);
  } catch (e) {
    notes.push(`c-${(e as Error).name}`);
  }
  return { foods: [], error: `${DOWN} (${notes.join(", ")})` };
}
