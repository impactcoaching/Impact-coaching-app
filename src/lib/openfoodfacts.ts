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

export async function searchOff(q: string, country: string | null): Promise<{ foods: FoundFood[]; error?: string }> {
  const host = HOST[country ?? ""] ?? "world";
  const code = q.replace(/\s/g, "");
  try {
    if (/^\d{8,14}$/.test(code)) {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`, { headers: HEADERS, signal: AbortSignal.timeout(6000), cache: "no-store" });
      if (!res.ok) return { foods: [] };
      const j = (await res.json()) as { product?: OffProduct };
      const f = j.product ? toFood({ ...j.product, code }) : null;
      return { foods: f ? [f] : [] };
    }
    const url = `https://${host}.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=${FIELDS}`;
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (res.status === 429) return { foods: [], error: "The supermarket search is busy. Try again in a minute." };
    if (!res.ok) return { foods: [], error: "The supermarket search isn't answering right now." };
    const j = (await res.json()) as { products?: OffProduct[] };
    return { foods: (j.products ?? []).map(toFood).filter((x): x is FoundFood => !!x) };
  } catch {
    return { foods: [], error: "The supermarket search isn't answering right now." };
  }
}
