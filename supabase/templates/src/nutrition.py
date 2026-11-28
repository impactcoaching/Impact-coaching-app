"""Nutrition plan templates: 4 styles x 14 sizes (1,400 to 4,000 kcal).
python3 nutrition.py 0019 -> ../0019_nutrition_plans/ (one SQL file per style), ../0019_nutrition_plans.sql and
../nutrition_plans_review.md.
Adam (28 Nov): balanced, high protein, vegetarian, vegan. Keep it simple. Training days have a post-workout meal.
Include the Strom Sports Nutrition and Per4m Nutrition ranges. Water and sodium are never set (coach only)."""
import json, os, sys

num = sys.argv[1] if len(sys.argv) > 1 else "0019"
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = json.load(open(os.path.join(HERE, "foods_library.json")))  # name -> kcal, protein, carbs, fat, fibre per 100 g

# New foods. Per 100 g. Brand products: values from product pages read 28 Nov 2026 (source noted).
NEW = {
    "Soya yoghurt, plain": ((50, 4.0, 2.1, 2.3, 1.0), None, None, None, "generic"),
    "Soya milk, unsweetened": ((33, 3.0, 0.0, 1.8, 0.6), None, 250, "1 glass", "generic"),
    "Edamame beans, frozen": ((121, 11.9, 8.9, 5.2, 5.2), None, 80, "1 handful", "generic"),
    # Per4m: per4mbetter.com shows its tables as images, so values are from UK retailers' listings.
    "Per4m Advanced Whey Protein": ((350, 73.3, 10.0, 2.7, 1.0), "Per4m", 30, "1 scoop", "bodyworld.eu, Strawberry Creme"),
    "Per4m Isolate Zero": ((362, 85.0, 1.5, 1.3, 1.5), "Per4m", 30, "1 scoop", "theskinnyfoodco.com, Chocolate Brownie Batter"),
    "Per4m Plant Protein": ((404, 70.0, 4.0, 8.5, 5.4), "Per4m", 30, "1 scoop", "proteinpackage.co.uk, Vanilla"),
    "Per4m Protein Bar": ((326, 32.0, 39.0, 8.6, 8.3), "Per4m", 62, "1 bar", "proteinpackage.co.uk, Caramel Biscuit"),
    # Strom: stromsports.com product pages.
    "Strom NiHPRO Protein Isolate": ((377, 73.3, 11.0, 5.3, 0.0), "Strom", 30, "1 scoop", "stromsports.com, per 30 g scoop"),
    "Strom Cream of Rice": ((327, 6.6, 72.0, 1.0, 3.0), "Strom", 25, "1 scoop", "stromsports.com"),
}
F = {**LIB, **{k: list(v[0]) for k, v in NEW.items()}}

FIXED = {"Per4m Protein Bar", "Soy sauce"}  # whole bars and seasonings, never scaled
# Protein foods and veg grow more slowly than the rest, so big plans add mostly carbs and fats, not 300 g of protein.
SLOW = {"Chicken breast, grilled", "Salmon fillet, raw", "Beef mince, 5% fat, raw", "Egg whites, liquid", "Egg, whole", "Greek yoghurt, 0% fat",
        "Skyr, plain", "Cottage cheese, low fat", "Tofu, firm", "Halloumi", "Mozzarella, light", "Per4m Advanced Whey Protein", "Per4m Isolate Zero",
        "Per4m Plant Protein", "Strom NiHPRO Protein Isolate", "Soya yoghurt, plain", "Broccoli", "Green beans", "Spinach", "Mixed salad leaves",
        "Tomato", "Frozen mixed veg", "Mushrooms", "Onion", "Edamame beans, frozen"}
EGGS = {"Egg, whole"}                  # whole eggs, 50 g each

# Each style: meals at about 2,000 kcal. "Snack" is the rest-day snack; "Post-workout" replaces it on training days.
# "Snack 2" is added from 2,800 kcal so the bigger plans don't mean huge plates.
STYLES = {
    "Balanced": {
        "summary": "Everyday foods, about 30% protein, carbs around training.",
        "audience_note": "",
        "meals": {
            "Breakfast": ([("Oats, rolled", 80), ("Milk, semi-skimmed / light blue", 200), ("Greek yoghurt, 0% fat", 150), ("Frozen mixed berries", 100)],
                          "Swap: 2 eggs on 2 slices of wholemeal toast instead of the oats and yoghurt, or skyr for the yoghurt."),
            "Lunch": ([("Chicken breast, grilled", 130), ("Basmati rice, cooked", 200), ("Mixed salad leaves", 50), ("Tomato", 80), ("Avocado", 50)],
                      "Swap: turkey mince, tuna or prawns for the chicken; a wrap or a microwave rice pouch for the rice."),
            "Snack": ([("Skyr, plain", 150), ("Banana", 120), ("Almonds", 20)],
                      "Swap: cottage cheese for the skyr, any fruit for the banana, or a Per4m Protein Bar on busy days."),
            "Post-workout": ([("Per4m Advanced Whey Protein", 30), ("Strom Cream of Rice", 40), ("Banana", 100)],
                             "Within an hour or so of training. Swap: Per4m Isolate Zero or Strom NiHPRO for the whey; oats or rice cakes for the cream of rice."),
            "Dinner": ([("Salmon fillet, raw", 140), ("Potato, raw", 250), ("Broccoli", 100), ("Green beans", 80), ("Olive oil", 5)],
                       "Swap: cod, lean beef mince or chicken thigh for the salmon; sweet potato, pasta or rice for the potatoes; any veg."),
            "Snack 2": ([("Per4m Protein Bar", 62), ("Apple", 150)],
                        "Swap: Greek yoghurt and fruit, or a whey shake and a banana."),
        },
    },
    "High protein": {
        "summary": "About 35% protein from lean meat, fish, eggs, dairy and a shake.",
        "meals": {
            "Breakfast": ([("Egg whites, liquid", 150), ("Egg, whole", 100), ("Wholemeal bread", 80), ("Spinach", 50), ("Avocado", 30)],
                          "Swap: Greek yoghurt with a scoop of Per4m Isolate Zero and oats, or bacon medallions for the whole eggs."),
            "Lunch": ([("Chicken breast, grilled", 140), ("Basmati rice, cooked", 200), ("Broccoli", 100), ("Mixed salad leaves", 50), ("Olive oil", 5)],
                      "Swap: turkey mince, cod or tuna for the chicken; potatoes or a wrap for the rice."),
            "Snack": ([("Greek yoghurt, 0% fat", 150), ("Per4m Isolate Zero", 20), ("Frozen mixed berries", 100), ("Almonds", 20)],
                      "Stir the protein into the yoghurt. Swap: skyr or cottage cheese for the yoghurt, or a Per4m Protein Bar."),
            "Post-workout": ([("Strom NiHPRO Protein Isolate", 30), ("Strom Cream of Rice", 50), ("Banana", 100)],
                             "Within an hour or so of training. Swap: Per4m Isolate Zero or Advanced Whey for the NiHPRO; rice cakes and honey for the cream of rice."),
            "Dinner": ([("Beef mince, 5% fat, raw", 150), ("Pasta, dry", 80), ("Tomato", 100), ("Onion", 50), ("Mushrooms", 50), ("Mozzarella, light", 30)],
                       "Swap: turkey mince or chicken for the beef; rice or potatoes for the pasta."),
            "Snack 2": ([("Cottage cheese, low fat", 100), ("Rice cakes", 40), ("Peanut butter", 15), ("Banana", 100)],
                        "Swap: a Per4m Protein Bar, or a whey shake and fruit."),
        },
    },
    "Vegetarian": {
        "summary": "Eggs, dairy, tofu, beans and lentils, with whey for an easy protein boost.",
        "meals": {
            "Breakfast": ([("Oats, rolled", 80), ("Milk, semi-skimmed / light blue", 200), ("Greek yoghurt, 0% fat", 150), ("Frozen mixed berries", 100)],
                          "Swap: 2 eggs on 2 slices of wholemeal toast instead of the oats and yoghurt, or skyr for the yoghurt."),
            "Lunch": ([("Chickpeas, tinned, drained", 120), ("Quinoa, cooked", 150), ("Halloumi", 60), ("Spinach", 50), ("Tomato", 80), ("Olive oil", 5)],
                      "Swap: 2 eggs or light mozzarella for the halloumi; lentils for the chickpeas; rice or couscous for the quinoa."),
            "Snack": ([("Skyr, plain", 150), ("Banana", 120), ("Almonds", 20)],
                      "Swap: cottage cheese for the skyr, any fruit for the banana."),
            "Post-workout": ([("Per4m Advanced Whey Protein", 30), ("Strom Cream of Rice", 40), ("Banana", 100)],
                             "Within an hour or so of training. Swap: Per4m Isolate Zero or Strom NiHPRO for the whey; oats or rice cakes for the cream of rice."),
            "Dinner": ([("Tofu, firm", 200), ("White rice, cooked", 200), ("Frozen mixed veg", 150), ("Soy sauce", 15)],
                       "Swap: eggs, lentils or a veggie mince for the tofu; noodles or potatoes for the rice."),
            "Snack 2": ([("Cottage cheese, low fat", 150), ("Rice cakes", 30), ("Peanut butter", 15)],
                        "Swap: Greek yoghurt and fruit, or a whey shake and a banana."),
        },
    },
    "Vegan": {
        "summary": "Tofu, beans, lentils, soya and a plant protein shake. No animal products.",
        "meals": {
            "Breakfast": ([("Oats, rolled", 80), ("Soya milk, unsweetened", 250), ("Per4m Plant Protein", 30), ("Frozen mixed berries", 100), ("Chia seeds", 10)],
                          "Stir the protein in once the oats are cooked. Swap: soya yoghurt for some of the milk, or wholemeal toast with peanut butter."),
            "Lunch": ([("Lentils, cooked", 150), ("Quinoa, cooked", 150), ("Spinach", 50), ("Tomato", 80), ("Avocado", 50), ("Hummus", 30)],
                      "Swap: chickpeas or edamame for the lentils; rice or a wrap for the quinoa."),
            "Snack": ([("Soya yoghurt, plain", 200), ("Banana", 120), ("Almonds", 20)],
                      "Swap: any fruit for the banana, walnuts for the almonds."),
            "Post-workout": ([("Per4m Plant Protein", 30), ("Cream of rice, dry", 40), ("Banana", 100)],
                             "Within an hour or so of training. Per4m's Cream of Rice is labelled vegan. Swap: oats or rice cakes for the cream of rice."),
            "Dinner": ([("Tofu, firm", 200), ("Basmati rice, cooked", 200), ("Broccoli", 100), ("Edamame beans, frozen", 80), ("Soy sauce", 15)],
                       "Swap: tempeh, seitan or a vegan mince for the tofu; noodles or potatoes for the rice."),
            "Snack 2": ([("Soya yoghurt, plain", 150), ("Per4m Plant Protein", 20), ("Rice cakes", 30), ("Peanut butter", 20)],
                        "Stir the protein into the yoghurt. Swap: hummus and pitta, or a handful of nuts and fruit."),
        },
    },
}
VEGAN_OK = {"Per4m Plant Protein", "Soya yoghurt, plain", "Soya milk, unsweetened", "Edamame beans, frozen", "Cream of rice, dry"}
NOT_VEG = {"Per4m Protein Bar"}  # contains bovine collagen
SIZES = list(range(1400, 4001, 200))
SECOND_SNACK_FROM = 2800


def tot(items):
    t = [0.0] * 5
    for f, g in items:
        for i in range(5):
            t[i] += F[f][i] * g / 100
    return t


def rnd(f, g):
    if f in EGGS:
        return max(50, round(g / 50) * 50)
    step = 10 if g >= 100 else 5
    return max(5, round(g / step) * step)


def day(style, kcal, training):
    meals = STYLES[style]["meals"]
    order = ["Breakfast", "Lunch", "Post-workout" if training else "Snack", "Dinner"] + (["Snack 2"] if kcal >= SECOND_SNACK_FROM else [])
    chosen = [(m, meals[m]) for m in order]
    ks = (kcal / 2000) ** 0.4
    part = lambda sel: sum(tot([(f, g) for f, g in its if sel(f)])[0] for _m, (its, _n) in chosen)
    fixed, slow = part(lambda f: f in FIXED), part(lambda f: f in SLOW)
    k = (kcal - fixed - slow * ks) / part(lambda f: f not in FIXED and f not in SLOW)
    out = []
    for m, (its, note) in chosen:
        out.append((m, [(f, g if f in FIXED else rnd(f, g * (ks if f in SLOW else k))) for f, g in its], note))
    t = tot([x for _m, its, _n in out for x in its])
    return out, t


def portions(t, kcal):
    return dict(palms=round(t[1] / 25), fists=4 if kcal < SECOND_SNACK_FROM else 5, cupped=round(t[2] / 30), thumbs=round(t[3] / 10))


def q(s):
    return "'" + s.replace("'", "''") + "'"


DOLLAR = "$" + "$"
NOTE = ("Eat roughly the same each day and don't stress about being exact. Hit your protein first. "
        "Training days swap the afternoon snack for a post-workout meal with more carbs. "
        "Weigh your food for the first week or two if you can, then hand portions are fine. Fill up on veg as much as you like.")
md = ["# Nutrition plans\n"]
parts, checks = [], []
for style, cfg in STYLES.items():
    used = {f for its, _n in cfg["meals"].values() for f, _g in its}
    if style == "Vegan":
        bad = [f for f in used if f not in VEGAN_OK and f not in {"Oats, rolled", "Frozen mixed berries", "Chia seeds", "Lentils, cooked", "Quinoa, cooked", "Spinach", "Tomato",
                                                                "Avocado", "Hummus", "Banana", "Almonds", "Tofu, firm", "Basmati rice, cooked", "Broccoli", "Soy sauce", "Rice cakes", "Peanut butter"}]
        assert not bad, bad
    if style == "Vegetarian":
        assert not (used & NOT_VEG) and not any(w in f.lower() for f in used for w in ("chicken", "beef", "salmon", "tuna", "turkey", "cod", "prawn", "ham", "bacon")), used
    rows = []
    md.append(f"\n## {style}\n\n{cfg['summary']}\n")
    for kcal in SIZES:
        dts, totals = [], {}
        for training in (True, False):
            meals, t = day(style, kcal, training)
            checks.append((style, kcal, training, round(t[0]), round(t[1] * 4 / t[0] * 100), round(t[3] * 9 / t[0] * 100)))
            totals[training] = t
            dts.append({
                "name": "Training day" if training else "Rest day",
                "weekdays": [1, 2, 4, 5] if training else [3, 6, 7],
                "kcal": kcal, "protein_g": round(t[1]), "carbs_g": round(t[2]), "fat_g": round(t[3]), "fibre_g": max(25, round(t[4])),
                "sodium_mg": None, "water_ml": None, **portions(t, kcal),
                "notes": "Post-workout meal within an hour or so of training." if training else None,
                "meals": [{"name": m, "notes": n, "items": [{"food": f, "grams": g} for f, g in its]} for m, its, n in meals],
            })
        name = f"{style}, {kcal:,} kcal"
        body = {"style": "plan", "notes": NOTE, "day_types": dts}
        tags = "{" + ",".join(json.dumps(x) for x in [style.lower(), "trial", f"{kcal} kcal"]) + "}"
        summary = f"{kcal:,} kcal ({round(kcal * 4.184):,} kJ). {cfg['summary']} Training and rest days, 3 meals and a snack."
        goal = "Muscle gain" if style == "High protein" else "General health"
        rows.append(f"({q(name)}, {q(summary)}, {q(goal)}, {q(tags)}, {DOLLAR}{json.dumps(body, ensure_ascii=False, separators=(',', ':'))}{DOLLAR}::jsonb)")
        tr = totals[True]
        md.append(f"| {kcal:,} kcal | P {round(tr[1])} g · C {round(tr[2])} g · F {round(tr[3])} g | " +
                  " · ".join(f"{m}: " + ", ".join(f"{f} {g} g" for f, g in its) for m, its, _n in day(style, kcal, True)[0]) + " |")
    parts.append((style, f"""
-- {style}: {len(rows)} plans, {SIZES[0]:,} to {SIZES[-1]:,} kcal.
delete from public.templates where kind = 'nutrition' and name like {q(style + ', %kcal')};
insert into public.templates (kind, name, summary, goal, level, audience, competitor, tags, body)
select 'nutrition', v.name, v.summary, v.goal, 'Beginner', 'any', 'any', v.tags::text[], v.body
from (values
{(',' + chr(10)).join(rows)}
) as v(name, summary, goal, tags, body);
"""))

new_sql = "".join(
    f"insert into public.foods (name, brand, kcal, protein_g, carbs_g, fat_g, fibre_g, serving_g, serving_name, source)\n"
    f"select {q(n)}, {q(b) if b else 'null'}, {v[0]}, {v[1]}, {v[2]}, {v[3]}, {v[4]}, {sg if sg else 'null'}, {q(sn) if sn else 'null'}, 'coach'\n"
    f"where not exists (select 1 from public.foods where owner_id is null and lower(name) = lower({q(n)}));\n"
    for n, (v, b, sg, sn, _src) in NEW.items())
out = os.path.join(HERE, "..", f"{num}_nutrition_plans")
os.makedirs(out, exist_ok=True)
for i, (style, part) in enumerate(parts, 1):
    head = f"-- {num} part {i} of {len(parts)}: {style} nutrition plans. Run the parts in order (part 1 adds the new foods).\n"
    open(os.path.join(out, f"{num}_{i}_{style.lower().replace(' ', '_')}.sql"), "w").write(head + (new_sql if i == 1 else "") + part)
open(os.path.join(HERE, "..", f"{num}_nutrition_plans.sql"), "w").write(
    f"-- {num}: {len(parts) * len(SIZES)} nutrition plan templates ({', '.join(STYLES)}), {SIZES[0]:,} to {SIZES[-1]:,} kcal.\n"
    f"-- Loads into Library, Nutrition plans. Safe to run twice. Water and sodium are left for the coach.\n" + new_sql + "".join(p for _s, p in parts))
open(os.path.join(HERE, "..", "nutrition_plans_review.md"), "w").write("\n".join(md) + "\n")
json.dump(checks, open("/tmp/claude-0/nut_checks.json", "w"))
off = max(abs(c[3] - c[1]) / c[1] for c in checks)
print(len(parts) * len(SIZES), "plans. worst kcal miss", f"{off:.1%}", "protein %", min(c[4] for c in checks), "-", max(c[4] for c in checks),
      "fat %", min(c[5] for c in checks), "-", max(c[5] for c in checks))
for st in STYLES:
    cs = [c for c in checks if c[0] == st]
    print(st, "protein %", min(c[4] for c in cs), "-", max(c[4] for c in cs), "fat %", min(c[5] for c in cs), "-", max(c[5] for c in cs))
