# Loading templates with SQL

Templates live in `public.templates` (added in `0017_templates.sql`). Each one is a single row:
tags in columns, the plan itself in `body` (jsonb). Paste a file like the examples below into the
Supabase SQL Editor and the templates show up in Library, Programmes or Nutrition plans.

Exercises and foods are given **by name**. The app matches them to the library when the template
is opened or copied (exact name, any case). Anything it can't find is listed in red on the template
so it can be added. If a template needs a new exercise or food, insert it in the same file first.

Leave anything out and the app fills in a sensible default.

## Rules for templates Claude designs

- `sodium_mg` and `water_ml` stay `null`. Peak week, water and sodium are coach-set only.
- UK English and Adam's voice in notes. No em dashes.
- Tags: `goal`, `level` (`Beginner` / `Intermediate` / `Advanced`), `location` (`Gym` / `Home` / `Any`, programmes only),
  `audience` (`any` / `female` / `male`), `competitor` (`any` / `yes` / `no`), `tags` (anything else, lower case).

## Programme

```sql
insert into public.exercises (name, muscle, equipment) values ('Pendulum squat', 'Quads', '{pendulum}')
on conflict (name) do nothing;

insert into public.templates (kind, name, summary, goal, level, location, audience, competitor, tags, body) values (
  'training', 'Glute focus, 4 days', 'Upper/lower with two glute-biased lower days', 'Glutes and legs', 'Intermediate', 'Gym', 'female', 'any', '{glutes}',
  $${
    "notes": "Four sessions a week. Add a rep each week until you hit the top of the range, then add weight.",
    "workouts": [
      { "name": "Day 1: Lower (glutes)", "weekdays": [1],
        "exercises": [
          { "exercise": "Barbell hip thrust", "warmup_sets": 2, "work_sets": 3, "reps_min": 8, "reps_max": 12,
            "tempo": "2-1-1-1", "effort_type": "RIR", "effort_value": "1-2", "rest_seconds": 120,
            "intensifier": { "type": "rp", "mini": 2, "rest": 15 }, "intensifier_on": "last", "film_set": 3,
            "notes": "Ribs down, chin tucked, squeeze for a second at the top" },
          { "exercise": "Cable kickback", "work_sets": 3, "reps_min": 12, "reps_max": 15, "rest_seconds": 60 },
          { "exercise": "Hip abduction machine", "work_sets": 2, "reps_min": 15, "reps_max": 20, "linked_to_previous": true }
        ] }
    ],
    "cardio": { "weekly_minutes": 120, "daily_steps": 10000, "extra_counts": true,
      "sessions": [ { "day": 2, "kind": "Incline walk", "minutes": 30, "mode": "hr", "target": "Zone 2", "timing": "Any time" } ] }
  }$$::jsonb
);
```

Exercise fields (all optional except `exercise`): `linked_to_previous` (superset with the one above),
`warmup_sets`, `work_sets`, `reps_type` (`fixed` / `range` / `amrap` / `time`, worked out from the reps if left out),
`reps_min`, `reps_max`, `tempo`, `effort_type` (`RIR` / `RPE` / `%1RM` / `Weight`), `effort_value`, `rest_seconds`,
`intensifier` (`drop` {drops, pct}, `rp` {mini, rest}, `cluster` {clusters, reps, rest}, `myo` {mini, reps, rest}, `partials` {reps}),
`intensifier_on` (`last` / `all`), `film_set`, `notes`. `weekdays` is 1 Monday to 7 Sunday; leave it empty for any day.

## Nutrition plan

```sql
insert into public.templates (kind, name, summary, goal, level, audience, competitor, tags, body) values (
  'nutrition', '1,600 kcal fat loss, meal plan', 'Higher carbs on training days', 'Fat loss', 'Beginner', 'female', 'no', '{uk}',
  $${
    "style": "plan",
    "notes": "Protein at every meal. Swap any food for one you like and the app matches the grams.",
    "day_types": [
      { "name": "Training day", "weekdays": [1, 2, 4, 5], "kcal": 1700, "protein_g": 140, "carbs_g": 170, "fat_g": 50, "fibre_g": 30,
        "meals": [
          { "name": "Breakfast", "items": [ { "food": "Porridge oats", "grams": 50 }, { "food": "Greek yoghurt 0% fat", "grams": 150 } ] }
        ] },
      { "name": "Rest day", "weekdays": [3, 6, 7], "kcal": 1500, "protein_g": 140, "carbs_g": 120, "fat_g": 50, "fibre_g": 30, "meals": [] }
    ]
  }$$::jsonb
);
```

`style` is `macros` (targets only), `plan` (set meals) or `portions` (hand portions: `palms`, `fists`, `cupped`, `thumbs` per day).
Foods are matched to the shared food library by name; unbranded foods win a name clash.

## Class programmes (0018)

The 160 bodybuilding class programmes (8 classes x 5 focus areas x 3 to 6 days a week) are generated, not hand-written.
Edit the sessions in `src/men.py`, `src/women.py`, `src/mens_physique.py` or a class file, then run
`cd src && python3 build_programmes.py 0018 && python3 review_doc.py`. That rewrites `0018_class_programmes.sql`
(everything in one file) and `0018_class_programmes/` (the same, one file per class, easier to paste into the SQL Editor).

## Nutrition plans (0019)

56 plans: balanced, high protein, vegetarian and vegan, from 1,400 to 4,000 kcal in 200 kcal steps. Each has a training
day (with a post-workout meal) and a rest day, plus hand portions and swaps. Edit `src/nutrition.py`, then run
`cd src && python3 nutrition.py 0019`. Strom and Per4m products are added as foods in part 1, with where each value came from.
