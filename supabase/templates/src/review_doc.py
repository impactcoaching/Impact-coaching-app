"""Short review doc for Adam: python3 review_doc.py -> ../class_programmes_review.md"""
import importlib
from build_programmes import CLASSES, DAYS
import men, women, mens_physique as mp

MPN = {"CH1": "Upper chest, heavy", "CH2": "Upper chest, dumbbells", "SH1": "Shoulders, heavy", "SH2": "Shoulders, width",
       "BK1": "Back width", "BK2": "Back, chins and rows", "AR1": "Arms, heavy", "AR2": "Arms, dips and preachers",
       "LG1": "Legs", "AB1": "Abs and upper back", "AB2": "Lower abs and rear delts"}
SHORT = {"drop": "drop set", "rp": "rest-pause", "myo": "myo-reps", "partials": "partials", "cluster": "clusters"}


def line(e):
    s = f"{e['name']} {e['s']}x{e['lo']}-{e['hi']}"
    return s + (f" (**{SHORT[e['inten']['type']]}**)" if e["inten"] else "")


out = ["# Class programmes for all 8 classes",
       "",
       "160 programmes: 8 classes, 5 focus areas each, at 3, 4, 5 and 6 days a week.",
       "",
       "**Exercise choice:** a balance of old school free weights (barbell presses and rows, weighted pull-ups and dips, squats, deadlifts, RDLs, hip thrusts, barbell curls, skull crushers) and the best modern machines (pendulum squat, hack squat, reverse hack squat, hip thrust machine, chest-supported T-bar row, plate-loaded incline press, machine laterals). Most sessions come in two versions: one led by free weights and one led by machines, and the week uses both.",
       "",
       "**How it fits together:** the focus area comes first in the week and is trained 2 to 3 times. Short weeks join parts of two or three sessions so everything is still covered. Every session finishes with abs (aesthetic work only: cable and weighted crunches, leg and knee raises, reverse crunches) unless it's an abs session, and every session has at least 2 intensifiers. Abs and waist focus weeks get two hard ab sessions of their own, with side delts, as wider shoulders make the waist look smaller.",
       "",
       "**New in the library:** Chest-supported T-bar row. Every other exercise is already there.",
       "",
       "Men's physique is the set you've seen, with hack squats, the pendulum, the chest-supported T-bar and machine laterals swapped in. Women's bodybuilding uses the heavy bodybuilding sessions, as it trains like men's bodybuilding.",
       "", "## The weeks"]
for cls in CLASSES:
    mod = importlib.import_module(cls)
    out += ["", f"### {mod.CLASS}", "", "| Focus | Days | The week |", "|---|---|---|"]
    for focus, splits in mod.PROGRAMMES.items():
        for i, (days, plan) in enumerate(sorted(splits.items())):
            f = f"**{focus}**<br>{mod.WHY[focus]}" if i == 0 else ""
            out.append(f"| {f} | {days} | " + " · ".join(f"{DAYS[d - 1]} {n}" for d, _r, n, _x in plan) + " |")

out += ["", "## The sessions", "", "Short weeks use the first few exercises of a session. Intensifiers are on the last set.", ""]
for title, S in [("Women's sessions (bikini, wellness, figure, women's physique)", women.S),
                 ("Bodybuilding sessions (classic physique, men's and women's bodybuilding)", men.S),
                 ("Men's physique sessions", mp.S)]:
    out += [f"### {title}", "", "| Session | Exercises |", "|---|---|"]
    for k, v in S.items():
        if len(v) == 4:
            name, _short, desc, exs = v
        else:
            desc, exs = v
            name = MPN[k]
        out.append(f"| **{name}**<br>{desc} | " + "<br>".join(line(e) for e in exs) + " |")
    out.append("")
out += ["### Abs finishers (rotated, each a superset)", ""]
for i, pair in enumerate(men.ABS if hasattr(men, "ABS") else __import__("common").ABS, 1):
    out.append(f"{i}. " + " + ".join(line(e) for e in pair))
open("../class_programmes_review.md", "w").write("\n".join(out) + "\n")
print(len("\n".join(out)), "chars")
