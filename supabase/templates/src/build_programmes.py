"""Weekly programme templates (3 to 6 day splits) for the bodybuilding classes.
python3 build_programmes.py 0018  ->  ../0018_class_programmes.sql, ../class_programmes.md (full detail)
and ../class_programmes_review.md (short review version)."""
import importlib, json, re, sys

CLASSES = ["bikini", "wellness", "figure", "womens_physique", "womens_bodybuilding",
           "mens_physique", "classic_physique", "mens_bodybuilding"]
# Exercises the programmes use that aren't in the library yet (muscle, equipment).
NEW_EXERCISES = [("Chest-supported T-bar row", "Back", "{barbell,bench}")]

num = sys.argv[1] if len(sys.argv) > 1 else "0018"
INT = {
    "drop": lambda i: f"Drop set x{i['drops']}, {i['pct']}% lighter",
    "rp": lambda i: f"Rest-pause, {i['mini']} mini-sets, {i['rest']} s",
    "myo": lambda i: f"Myo-reps, {i['mini']} x {i['reps']}, {i['rest']} s",
    "partials": lambda i: f"Partials, about {i['reps']} half reps",
    "cluster": lambda i: f"Clusters {i['clusters']} x {i['reps']}",
}
DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
DOLLAR = "$" + "$"
WORDS = {3: "Three", 4: "Four", 5: "Five", 6: "Six"}


def q(s):
    return "'" + s.replace("'", "''") + "'"


def recipe(mod, r):
    """'BK1[:3]+LG1[:3]' -> exercises. Each part starts a fresh group and never ends mid-superset."""
    out, descs = [], []
    for part in r.split("+"):
        m = re.fullmatch(r"(\w+)(?:\[(\d*):(\d*)\])?", part)
        key, lo, hi = m.group(1), m.group(2), m.group(3)
        desc, exs = mod.S[key][-2:]
        sl = [dict(e) for e in exs[int(lo) if lo else 0:int(hi) if hi else None]]
        sl[0]["ss"] = False
        if sl[-1]["rest"] == 0:
            sl[-1]["rest"] = 60
        out += sl
        if not lo and not hi:
            descs.append(desc)
    return out, " ".join(descs)


def labels(exs):
    out, g = [], -1
    for i, e in enumerate(exs):
        if i == 0 or not e["ss"]:
            g += 1
        out.append(chr(65 + g))
    counts = {l: out.count(l) for l in out}
    seen = {}
    for i, l in enumerate(out):
        if counts[l] > 1:
            seen[l] = seen.get(l, 0) + 1
            out[i] = f"{l}{seen[l]}"
    return out


def table(exs):
    rows = ["| | Exercise | Sets x reps | Tempo | RIR | Rest | Intensifier (last set) |", "|---|---|---|---|---|---|---|"]
    for l, e in zip(labels(exs), exs):
        sets = f"{e['s']} x {e['lo']}-{e['hi']}" + (f" (+{e['w']} warm-up)" if e["w"] else "")
        inten = INT[e["inten"]["type"]](e["inten"]) if e["inten"] else ""
        note = f" ({e['note']})" if e["note"] else ""
        rest = f"{e['rest']} s" if e["rest"] else "Straight on"
        rows.append(f"| {l} | **{e['name']}**{note} | {sets} | {e['tempo']} | {e['rir']} | {rest} | {inten} |")
    return "\n".join(rows)


def as_json(e):
    d = {"exercise": e["name"], "linked_to_previous": e["ss"], "warmup_sets": e["w"], "work_sets": e["s"], "reps_type": "range",
         "reps_min": e["lo"], "reps_max": e["hi"], "tempo": e["tempo"], "effort_type": "RIR", "effort_value": e["rir"],
         "rest_seconds": e["rest"], "intensifier": e["inten"], "intensifier_on": "last", "notes": e["note"]}
    return {k: v for k, v in d.items() if v is not None}


def is_abs(focus):
    return focus.lower().startswith("abs")


md, sql_parts, names, stats = ["# Class programmes\n"], [], set(), []
for cls in CLASSES:
    mod = importlib.import_module(cls)
    md.append(f"\n# {mod.CLASS}\n")
    rows = []
    for focus, splits in mod.PROGRAMMES.items():
        md.append(f"\n## {focus}\n\n{mod.WHY[focus]}\n")
        for days, plan in sorted(splits.items()):
            name = f"{mod.CLASS}: {focus}, {days} days"
            week = " · ".join(f"{DAYS[d - 1]} {n}" for d, _r, n, _x in plan)
            md.append(f"\n### {focus}, {days} days\n\n**The week:** {week}. Rest on the other days.\n")
            workouts, n_abs = [], 0
            for i, (d, r, sname, desc) in enumerate(plan):
                exs, auto = recipe(mod, r)
                if "AB" not in r:
                    exs += [dict(e) for e in mod.ABS[n_abs % len(mod.ABS)]]
                    n_abs += 1
                stats.append((name, sname, len(exs), sum(1 for e in exs if e["inten"])))
                names.update(e["name"] for e in exs)
                md.append(f"\n#### {DAYS[d - 1]}: {sname}\n\n{desc or auto}\n\n{table(exs)}\n")
                workouts.append({"name": f"Day {i + 1}: {sname}", "weekdays": [d], "exercises": [as_json(e) for e in exs]})
            if is_abs(focus):
                note = (f"{WORDS[days]} sessions a week. Abs get two hard sessions of their own and still finish every other session. "
                        "Add a rep each week until you reach the top of the range, then add a little weight.")
            else:
                note = (f"{WORDS[days]} sessions a week. {focus} comes first in the week and gets the most work, and abs finish every session. "
                        "Add a rep each week until you reach the top of the range, then add a little weight.")
            body = {"notes": note, "workouts": workouts, "cardio": None}
            tags = "{" + ",".join(json.dumps(t) for t in mod.TAGS + [focus.lower(), f"{days} day split"]) + "}"
            summary = f"{days}-day split with {focus[0].lower() + focus[1:]} as the priority. Old school basics and the best machines, abs every session."
            rows.append(f"({q(name)}, {q(summary)}, {q(tags)}, {DOLLAR}{json.dumps(body, ensure_ascii=False, separators=(",", ":"))}{DOLLAR}::jsonb)")
    sql_parts.append(f"""
-- {mod.CLASS}: {len(rows)} programmes.
delete from public.templates where kind = 'training' and name like {q(mod.CLASS + ': %')};
insert into public.templates (kind, name, summary, goal, level, location, audience, competitor, tags, body)
select 'training', v.name, v.summary, 'Contest prep', 'Intermediate', 'Gym', '{mod.AUDIENCE}', 'yes', v.tags::text[], v.body
from (values
{(',' + chr(10)).join(rows)}
) as v(name, summary, tags, body);
""")

open("../class_programmes.md", "w").write("\n".join(md) + "\n")
new = ",\n".join(f"  ({q(n)}, {q(m)}, '{e}')" for n, m, e in NEW_EXERCISES)
total = sum(s.count("::jsonb") for s in sql_parts)
sql = f"""-- {num}: weekly programme templates for the 8 bodybuilding classes ({total} programmes).
-- Each class has 5 focus areas at 3, 4, 5 and 6 days a week. Abs finish every session.
-- Loads into Library, Programmes. Safe to run twice: programmes with the same names are replaced.
insert into public.exercises (name, muscle, equipment) values
{new}
on conflict (name) do nothing;
{''.join(sql_parts)}"""
open(f"../{num}_class_programmes.sql", "w").write(sql)
# The same, one file per class, small enough to paste into the Supabase SQL Editor one at a time.
import os
os.makedirs(f"../{num}_class_programmes", exist_ok=True)
for i, (cls, part) in enumerate(zip(CLASSES, sql_parts), 1):
    head = f"-- {num} part {i} of {len(CLASSES)}. Run the parts in order (part 1 adds the new exercise).\n"
    extra = f"insert into public.exercises (name, muscle, equipment) values\n{new}\non conflict (name) do nothing;\n" if i == 1 else ""
    open(f"../{num}_class_programmes/{num}_{i}_{cls}.sql", "w").write(head + extra + part)
open("/tmp/claude-0/prog_stats.json", "w").write(json.dumps({"stats": stats, "names": sorted(names)}))
print(total, "programmes,", len(stats), "sessions, longest", max(s[2] for s in stats), "exercises, fewest intensifiers", min(s[3] for s in stats))
