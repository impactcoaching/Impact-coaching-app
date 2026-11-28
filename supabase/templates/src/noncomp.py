"""Non-competitor programmes for free trial clients (Adam, 28 Nov 2026).
Women and men x Fat loss / Build muscle / Strength and fitness x 3 to 6 days x full gym and home.
Simpler than the class programmes: 6 exercises, RIR 2 on most sets, one intensifier a session, abs twice a week.
python3 noncomp.py 0021  ->  ../0021_noncomp_programmes.sql, ../0021_noncomp_programmes/*.sql, ../noncomp_programmes_review.md"""
import json, os, sys

num = sys.argv[1] if len(sys.argv) > 1 else "0021"
DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
WORDS = {3: "Three", 4: "Four", 5: "Five", 6: "Six"}
DOLLAR = "$" + "$"

DROP = {"type": "drop", "drops": 2, "pct": 20}
RP = {"type": "rp", "mini": 2, "rest": 15}
MYO = {"type": "myo", "mini": 4, "reps": 4, "rest": 10}
INTS = [DROP, MYO, RP, DROP, MYO, RP]
INT_TEXT = {
    "drop": lambda i: f"Drop set x{i['drops']}, {i['pct']}% lighter",
    "rp": lambda i: f"Rest-pause, {i['mini']} mini-sets, {i['rest']} s",
    "myo": lambda i: f"Myo-reps, {i['mini']} x {i['reps']}, {i['rest']} s",
}


def m(gym, home=None, note=None, home_note=None):
    """One slot: the gym exercise and its home swap (same if None)."""
    return (gym, home or gym, note, home_note if home_note is not None else note)


EACH = "Reps each leg"
ARM = "Reps each arm"
# Session: (name, [main, second, accessory, accessory, isolation], extra isolation used on non-abs days)
W = {
    "FA": ("Full body A", [m("Hack squat", "Goblet squat"), m("Barbell hip thrust", "Dumbbell hip thrust", "Squeeze for a second at the top"),
                           m("Lat pulldown", "One-arm dumbbell row", None, ARM), m("Seated dumbbell shoulder press"),
                           m("Seated leg curl", "Dumbbell leg curl")], m("Cable kickback", "Donkey kick")),
    "FB": ("Full body B", [m("Romanian deadlift", "Dumbbell Romanian deadlift", "Push the hips back, back flat"), m("Leg press", "Reverse lunge", None, EACH),
                           m("Machine chest press", "Dumbbell bench press"), m("Seated cable row", "Chest-supported dumbbell row"),
                           m("Cable lateral raise", "Lateral raise")], m("Hip abduction machine", "Banded seated abduction")),
    "FC": ("Full body C", [m("Pendulum squat", "Heel-elevated goblet squat"), m("Bulgarian split squat", note=EACH),
                           m("Assisted pull-up", "Banded lat pulldown"), m("Incline dumbbell press"),
                           m("Leg extension", "Single-leg hip thrust", "Hold the top for a second", EACH)], m("Cable lateral raise", "Seated lateral raise")),
    "UA": ("Upper A: shoulders and back", [m("Seated dumbbell shoulder press"), m("Lat pulldown", "One-arm dumbbell row", None, ARM),
                                           m("Incline dumbbell press"), m("Seated cable row", "Chest-supported dumbbell row"),
                                           m("Cable lateral raise", "Lateral raise")], m("Rope pushdown", "Overhead dumbbell extension")),
    "UB": ("Upper B: back and shoulders", [m("Machine shoulder press", "Arnold press"), m("Assisted pull-up", "Banded lat pulldown"),
                                           m("Machine chest press", "Dumbbell bench press"), m("Face pull", "Chest-supported rear delt raise"),
                                           m("Machine lateral raise", "Seated lateral raise")], m("Cable curl", "Dumbbell curl")),
    "LA": ("Lower A: quads", [m("Hack squat", "Goblet squat"), m("Romanian deadlift", "Dumbbell Romanian deadlift", "Push the hips back, back flat"),
                              m("Walking lunge", note=EACH), m("Seated leg curl", "Dumbbell leg curl"),
                              m("Leg extension", "Cyclist squat", "Hold the top for a second")], m("Leg press calf raise", "Single-leg calf raise")),
    "LB": ("Lower B: glutes", [m("Barbell hip thrust", "Dumbbell hip thrust", "Squeeze for a second at the top"), m("Pendulum squat", "Bulgarian split squat", None, EACH),
                               m("Bulgarian split squat", "Deficit reverse lunge", EACH), m("Lying leg curl", "Dumbbell leg curl"),
                               m("Hip abduction machine", "Banded seated abduction")], m("Glute-focused back extension", "Frog pumps")),
    "GL": ("Glutes", [m("Machine hip thrust", "Dumbbell hip thrust", "Squeeze for a second at the top"), m("Reverse hack squat", "Glute-focused step-up", "Sit back into the pad", EACH),
                      m("Glute-focused back extension", "Single-leg Romanian deadlift", "Round the upper back, push through the hips", EACH),
                      m("Cable kickback", "Donkey kick"), m("Seated hip abduction (leaning forward)", "Banded seated abduction")], m("Cable pull-through", "Frog pumps")),
}
M = {
    "FA": ("Full body A", [m("Hack squat", "Goblet squat"), m("Incline dumbbell press"), m("Lat pulldown", "One-arm dumbbell row", None, ARM),
                           m("Seated leg curl", "Dumbbell leg curl"), m("Cable lateral raise", "Lateral raise")], m("Cable curl", "Dumbbell curl")),
    "FB": ("Full body B", [m("Romanian deadlift", "Dumbbell Romanian deadlift", "Push the hips back, back flat"), m("Machine chest press", "Dumbbell bench press"),
                           m("Seated cable row", "Chest-supported dumbbell row"), m("Leg press", "Reverse lunge", None, EACH),
                           m("Rope pushdown", "Overhead dumbbell extension")], m("Face pull", "Chest-supported rear delt raise")),
    "FC": ("Full body C", [m("Pendulum squat", "Bulgarian split squat", None, EACH), m("Chest-supported T-bar row", "Seal row"),
                           m("Seated dumbbell shoulder press"), m("Pec deck", "Flat dumbbell fly"),
                           m("Leg extension", "Cyclist squat", "Hold the top for a second")], m("Hammer curl")),
    "UA": ("Upper A: chest and back", [m("Incline dumbbell press"), m("Lat pulldown", "One-arm dumbbell row", None, ARM),
                                       m("Machine chest press", "Dumbbell bench press"), m("Seated cable row", "Chest-supported dumbbell row"),
                                       m("Cable lateral raise", "Lateral raise")], m("Rope pushdown", "Dumbbell skull crusher")),
    "UB": ("Upper B: back and shoulders", [m("Chest-supported T-bar row", "Seal row"), m("Seated dumbbell shoulder press"),
                                           m("Wide-grip lat pulldown", "Banded lat pulldown"), m("Incline machine press", "Incline dumbbell fly"),
                                           m("Reverse pec deck", "Chest-supported rear delt raise")], m("Cable curl", "Incline dumbbell curl")),
    "LA": ("Lower A: quads", [m("Hack squat", "Goblet squat"), m("Romanian deadlift", "Dumbbell Romanian deadlift", "Push the hips back, back flat"),
                              m("Leg press", "Bulgarian split squat", None, EACH), m("Seated leg curl", "Dumbbell leg curl"),
                              m("Leg extension", "Cyclist squat", "Hold the top for a second")], m("Leg press calf raise", "Single-leg calf raise")),
    "LB": ("Lower B: hamstrings and glutes", [m("Pendulum squat", "Heel-elevated dumbbell squat"), m("Barbell hip thrust", "Dumbbell hip thrust"),
                                              m("Walking lunge", note=EACH), m("Lying leg curl", "Single-leg Romanian deadlift", None, EACH),
                                              m("Single-leg leg extension", "Cyclist squat", EACH, "Heels raised, knees forward")], m("Seated calf raise machine", "Seated calf raise")),
    "AR": ("Arms and shoulders", [m("Machine shoulder press", "Arnold press"), m("EZ-bar curl", "Dumbbell curl"), m("Assisted dip", "Bench dip"),
                                  m("Incline dumbbell curl"), m("Cable lateral raise", "Lateral raise")], m("Overhead cable extension", "Overhead dumbbell extension")),
    "PA": ("Push A", [m("Incline dumbbell press"), m("Machine chest press", "Dumbbell bench press"), m("Seated dumbbell shoulder press"),
                      m("Cable fly", "Flat dumbbell fly"), m("Cable lateral raise", "Lateral raise")], m("Rope pushdown", "Overhead dumbbell extension")),
    "PB": ("Push B", [m("Smith machine incline press", "Dumbbell bench press"), m("Machine shoulder press", "Arnold press"), m("Pec deck", "Incline dumbbell fly"),
                      m("Assisted dip", "Bench dip"), m("Machine lateral raise", "Seated lateral raise")], m("Overhead cable extension", "Dumbbell skull crusher")),
    "QA": ("Pull A", [m("Lat pulldown", "One-arm dumbbell row", None, ARM), m("Chest-supported T-bar row", "Seal row"),
                      m("Seated cable row", "Chest-supported dumbbell row"), m("Face pull", "Chest-supported rear delt raise"),
                      m("Cable curl", "Incline dumbbell curl")], m("Hammer curl")),
    "QB": ("Pull B", [m("Wide-grip lat pulldown", "Kroc row", None, ARM), m("Single-arm cable row", "Banded lat pulldown", ARM, None),
                      m("Straight-arm cable pulldown", "Dumbbell pullover (lats)"), m("Reverse pec deck", "Bent-over rear delt raise"),
                      m("Bayesian cable curl", "Spider curl")], m("Rope hammer curl", "Hammer curl")),
}
SPLITS = {
    "female": {3: ["FA", "FB", "FC"], 4: ["UA", "LA", "UB", "LB"], 5: ["UA", "LA", "UB", "LB", "GL"], 6: ["LA", "UA", "LB", "UB", "GL", "FB"]},
    "male": {3: ["FA", "FB", "FC"], 4: ["UA", "LA", "UB", "LB"], 5: ["UA", "LA", "UB", "LB", "AR"], 6: ["PA", "QA", "LA", "PB", "QB", "LB"]},
}
WD = {3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6]}
ABS_ON = {3: [0, 2], 4: [0, 2], 5: [0, 2], 6: [1, 4]}  # abs twice a week (Adam, 28 Nov)
ABS = {"gym": [("Cable crunch", "Round the spine down, hips stay still"), ("Hanging knee raise", "Curl the pelvis up at the top"),
               ("Reverse crunch", None), ("Decline crunch", None)],
       "home": [("Crunch", "Short range, squeeze hard"), ("Reverse crunch", None), ("Lying leg raise", "Lower back stays down"),
                ("Decline crunch", None)]}
FINISH = {"gym": [("Sled push", 20, 30, "Metres, not reps. Push hard, walk back"), ("Farmer's walk", 30, 40, "Metres, not reps. Heavy, tall and steady"),
                  ("Kettlebell swing", 15, 20, "Snap the hips, arms just guide the bell")],
          "home": [("Thruster", 10, 12, "Squat and press in one go"), ("Farmer's walk", 30, 40, "Metres, not reps. Heavy dumbbells, tall and steady"),
                   ("Burpee", 8, 10, "Steady pace, step back if you need to")]}

# Prescription by goal and slot: (warm-up sets, sets, reps from, reps to, tempo, RIR, rest)
GOALS = {
    "Fat loss": {"label": "Fat loss", "goal": "Fat loss", "pair": True, "M": (1, 3, 10, 12, "3-1-1-0", "2", 90), "S": (0, 3, 10, 12, "2-1-1-1", "2", 75),
                 "A": (0, 3, 10, 15, "2-1-1-1", "2", 60), "I": (0, 3, 12, 15, "2-1-1-1", "1-2", 60)},
    "Build muscle": {"label": "Build muscle", "goal": "Muscle gain", "pair": False, "M": (2, 4, 6, 10, "3-1-1-0", "1-2", 150), "S": (1, 3, 8, 12, "3-1-1-0", "2", 120),
                     "A": (0, 3, 10, 12, "2-1-1-1", "1-2", 90), "I": (0, 3, 12, 15, "2-1-1-1", "1", 60)},
    "Strength and fitness": {"label": "Strength and fitness", "goal": "General fitness", "pair": False, "M": (2, 4, 5, 8, "2-1-1-0", "2", 180),
                             "S": (1, 3, 8, 10, "2-1-1-0", "2", 120), "A": (0, 3, 10, 12, "2-1-1-1", "2", 75), "I": (0, 2, 12, 15, "2-1-1-1", "1-2", 60)},
}
NOTES = {
    "Fat loss": "Lift to keep your muscle while the fat comes off. Accessories are in supersets to keep sessions short. Aim for 8,000 to 10,000 steps a day.",
    "Build muscle": "More sets and longer rests on the big lifts. Your first work set on the first exercise is the heaviest, then take about 10% off for the rest.",
    "Strength and fitness": "Fewer reps on the first lift to build strength, and a short conditioning finisher on the days without abs.",
}
SUMMARY = {
    "Fat loss": "{d}-day plan for fat loss: lifting to keep muscle, supersets to save time and a daily step target.",
    "Build muscle": "{d}-day plan to build muscle: more sets, longer rests and progressive overload on every lift.",
    "Strength and fitness": "{d}-day plan for strength and fitness: heavier first lifts and short conditioning finishers.",
}


def ex(name, slot, rx, inten=None, ss=False, note=None, reps=None):
    w, s, lo, hi, tempo, rir, rest = rx
    if reps:
        lo, hi = reps
    return {"name": name, "slot": slot, "w": w, "s": s, "lo": lo, "hi": hi, "tempo": tempo, "rir": rir, "rest": rest, "inten": inten, "ss": ss, "note": note}


def session(S, key, where, goal, n, abs_day, n_abs, n_fin):
    g = GOALS[goal]
    title, slots, extra = S[key]
    h = 1 if where == "home" else 0
    out = []
    for i, (slot, sl) in enumerate(zip("MSAAI", slots)):
        name, note = sl[h], sl[2 + h]
        rx = (2, 4, 8, 10, "2-1-1-0", "2", 150) if slot == "M" and where == "home" and goal == "Strength and fitness" else g[slot]
        inten = INTS[n % len(INTS)] if slot == "I" else None
        if inten is DROP and name.startswith(("Banded", "Single-leg hip thrust")):
            inten = MYO  # no weight to drop
        out.append(ex(name, slot, rx, inten,
                      ss=(slot == "A" and i == 3 and g["pair"]), note=note))
    if g["pair"]:
        out[2]["rest"] = 0  # straight on to the paired accessory
    out[4]["rest"] = 0  # the isolation always pairs with what follows
    if abs_day:
        a, note = ABS[where][n_abs % len(ABS[where])]
        out.append(ex(a, "AB", (0, 3, 12, 15, "2-1-1-1", "1", 60), ss=True, note=note))
    elif goal == "Strength and fitness":
        f, lo, hi, note = FINISH[where][n_fin % len(FINISH[where])]
        out[4]["rest"] = 60
        out.append(ex(f, "F", (0, 3, lo, hi, "-", "2", 90), note=note))
    else:
        name, note = extra[h], extra[2 + h]
        out.append(ex(name, "I", g["I"], ss=True, note=note))
    return title, out


def as_json(e):
    d = {"exercise": e["name"], "linked_to_previous": e["ss"], "warmup_sets": e["w"], "work_sets": e["s"], "reps_type": "range",
         "reps_min": e["lo"], "reps_max": e["hi"], "tempo": None if e["tempo"] == "-" else e["tempo"], "effort_type": "RIR",
         "effort_value": e["rir"], "rest_seconds": e["rest"], "intensifier": e["inten"], "intensifier_on": "last", "notes": e["note"]}
    return {k: v for k, v in d.items() if v is not None}


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
    rows = ["| | Exercise | Sets x reps | RIR | Rest | Intensifier (last set) |", "|---|---|---|---|---|---|"]
    for l, e in zip(labels(exs), exs):
        sets = f"{e['s']} x {e['lo']}-{e['hi']}" + (f" (+{e['w']} warm-up)" if e["w"] else "")
        note = f" ({e['note']})" if e["note"] else ""
        rest = f"{e['rest']} s" if e["rest"] else "Straight on"
        inten = INT_TEXT[e["inten"]["type"]](e["inten"]) if e["inten"] else ""
        rows.append(f"| {l} | **{e['name']}**{note} | {sets} | {e['rir']} | {rest} | {inten} |")
    return "\n".join(rows)


def q(s):
    return "'" + s.replace("'", "''") + "'"


WHO = {"female": ("Women", W), "male": ("Men", M)}
md, parts, names, count = ["# Non-competitor programmes\n"], [], set(), 0
for sex, (who, S) in WHO.items():
    for where in ["gym", "home"]:
        rows = []
        md.append(f"\n# {who}, {'full gym' if where == 'gym' else 'home or small gym'}\n")
        for goal in GOALS:
            md.append(f"\n## {goal}\n\n{NOTES[goal]}\n")
            for days, keys in SPLITS[sex].items():
                name = f"{who}: {goal}, {days} days" + (", home" if where == "home" else "")
                workouts, n_abs, n_fin, week = [], 0, 0, []
                md.append(f"\n### {name}\n")
                for i, (key, d) in enumerate(zip(keys, WD[days])):
                    abs_day = i in ABS_ON[days]
                    title, exs = session(S, key, where, goal, i, abs_day, n_abs, n_fin)
                    n_abs += abs_day
                    n_fin += (not abs_day and goal == "Strength and fitness")
                    names.update(e["name"] for e in exs)
                    week.append(f"{DAYS[d - 1]} {title}")
                    md.append(f"\n#### {DAYS[d - 1]}: {title}\n\n{table(exs)}\n")
                    workouts.append({"name": f"Day {i + 1}: {title}", "weekdays": [d], "exercises": [as_json(e) for e in exs]})
                md.insert(len(md) - len(keys), f"\n**The week:** {' · '.join(week)}. Rest on the other days.\n")
                note = (f"{WORDS[days]} sessions a week. {NOTES[goal]} Abs twice a week. "
                        "Add a rep each week until you reach the top of the range, then add a little weight.")
                body = {"notes": note, "workouts": workouts, "cardio": None}
                tags = "{" + ",".join(json.dumps(t) for t in ["non-competitor", "trial", goal.lower(), f"{days} day split"]) + "}"
                rows.append(f"({q(name)}, {q(SUMMARY[goal].format(d=days))}, '{GOALS[goal]['goal']}', {q(tags)}, "
                            f"{DOLLAR}{json.dumps(body, ensure_ascii=False, separators=(',', ':'))}{DOLLAR}::jsonb)")
                count += 1
        like = f"{who}: %" + (", home" if where == "home" else "")
        cond = f"name like {q(like)}" if where == "home" else f"name like {q(who + ': %')} and name not like '%, home'"
        parts.append((f"{sex}_{where}", f"""
-- {who}, {where}: {len(rows)} programmes.
delete from public.templates where kind = 'training' and competitor = 'no' and {cond};
insert into public.templates (kind, name, summary, goal, level, location, audience, competitor, tags, body)
select 'training', v.name, v.summary, v.goal, 'Beginner', '{'Home' if where == 'home' else 'Gym'}', '{sex}', 'no', v.tags::text[], v.body
from (values
{(',' + chr(10)).join(rows)}
) as v(name, summary, goal, tags, body);
"""))

open("../noncomp_programmes_review.md", "w").write("\n".join(md) + "\n")
head = f"-- {num}: programmes for non-competitor trial clients ({count}). Women and men, fat loss, build muscle, strength and fitness,\n-- 3 to 6 days, full gym and home. Loads into Library, Programmes. Safe to run twice.\n"
open(f"../{num}_noncomp_programmes.sql", "w").write(head + "".join(p for _, p in parts))
os.makedirs(f"../{num}_noncomp_programmes", exist_ok=True)
for i, (key, p) in enumerate(parts, 1):
    open(f"../{num}_noncomp_programmes/{num}_{i}_{key}.sql", "w").write(f"-- {num} part {i} of {len(parts)}.\n" + p)
open("/tmp/claude-0/noncomp_names.json", "w").write(json.dumps(sorted(names)))
print(count, "programmes")
