# Men's physique: weekly programmes, 5 focus areas x 3/4/5/6 days.
# Adam (28 Nov): old school basics balanced with the best modern machines (hack squat, pendulum, chest-supported T-bar). Abs (for looks, not core stability) finish every session.
# ex(name, warm-up sets, work sets, reps from, reps to, tempo, RIR, rest s, intensifier, superset with previous, note)
CLASS = "Men's physique"
AUDIENCE = "male"
TAGS = ["mens physique"]
LEGS_NOTE = "Legs are kept strong and in proportion, as board shorts cover them."


def ex(name, w, s, lo, hi, tempo, rir, rest, inten=None, ss=False, note=None):
    return dict(name=name, w=w, s=s, lo=lo, hi=hi, tempo=tempo, rir=rir, rest=rest, inten=inten, ss=ss, note=note)


DROP = {"type": "drop", "drops": 2, "pct": 20}
RP = {"type": "rp", "mini": 2, "rest": 15}
MYO = {"type": "myo", "mini": 4, "reps": 4, "rest": 10}
PART = {"type": "partials", "reps": 6}

from common import ABS  # shared abs finishers, same as every class

# Sessions. Key -> (short description, exercises). Programmes below use them whole or in parts.
S = {
    "CH1": ("Heavy incline barbell work first, then dumbbells and a stretch-focused fly.", [
        ex("Incline barbell bench press", 2, 4, 6, 8, "3-1-1-0", "1-2", 150, note="30 degree bench, bar to the upper chest, elbows slightly in"),
        ex("Incline dumbbell press", 1, 3, 8, 10, "3-1-1-0", "1", 120),
        ex("Incline dumbbell fly", 0, 3, 10, 12, "3-1-1-0", "1", 75, DROP, note="Deep stretch, stop just short of the dumbbells touching"),
        ex("Low-to-high cable fly", 0, 2, 12, 15, "2-1-1-1", "0-1", 60, MYO, note="Hands finish at chin height, squeeze for a second"),
        ex("Lateral raise", 0, 3, 12, 15, "2-0-1-1", "1", 60),
    ]),
    "CH2": ("Dumbbells and the landmine for a full stretch, then a plate-loaded press taken to failure.", [
        ex("Incline dumbbell press", 2, 4, 8, 10, "3-1-1-0", "1", 120, RP, note="Low incline, let the dumbbells sink to a full stretch"),
        ex("Landmine press", 0, 3, 8, 10, "2-1-1-0", "1", 90, note="Kneeling or standing, press up and slightly across"),
        ex("Incline machine press", 0, 3, 10, 12, "2-0-1-1", "0-1", 75, DROP),
        ex("Dumbbell pullover", 0, 2, 10, 12, "3-1-1-0", "1-2", 75, note="Big stretch across the chest and lats"),
        ex("Cable lateral raise", 0, 3, 15, 20, "2-0-1-1", "1", 45),
    ]),
    "SH1": ("The standing press, the old school shoulder builder, then heavy side delt work.", [
        ex("Standing barbell overhead press", 2, 4, 6, 8, "2-1-1-0", "1-2", 150, note="Glutes tight, bar over mid-foot, head through at the top"),
        ex("Lateral raise", 0, 4, 10, 12, "2-0-1-1", "1", 60, DROP, note="Lead with the elbows, slight lean forward"),
        ex("Dumbbell upright row", 0, 3, 10, 12, "2-0-1-1", "1-2", 75, note="Wide, elbows lead, stop at shoulder height"),
        ex("Bent-over rear delt raise", 0, 3, 12, 15, "2-0-1-1", "1", 60),
        ex("Cable lateral raise", 0, 2, 15, 20, "2-0-1-1", "0-1", 45, PART),
    ]),
    "SH2": ("Seated dumbbell press, then lots of lateral raises for width.", [
        ex("Seated dumbbell shoulder press", 2, 3, 8, 10, "2-1-1-0", "1-2", 120, note="Bench just short of upright, dumbbells in line with the ears"),
        ex("Lateral raise", 0, 3, 10, 12, "2-0-1-1", "1", 0, note="Heavier dumbbells, strict"),
        ex("Lateral raise", 0, 3, 15, 20, "1-0-1-0", "0-1", 60, PART, ss=True, note="Grab lighter dumbbells straight away"),
        ex("Machine lateral raise", 0, 3, 12, 15, "2-0-1-1", "1", 60, RP),
        ex("Reverse pec deck", 0, 3, 12, 15, "2-0-1-1", "1", 60),
    ]),
    "BK1": ("Weighted pull-ups and barbell rows, the basics that build a wide, thick back.", [
        ex("Pull-up", 2, 4, 6, 10, "2-1-1-0", "1-2", 150, note="Add weight once you can do 10. Use assisted if you can't do 6 yet"),
        ex("Barbell row", 1, 3, 8, 10, "2-1-1-0", "1-2", 120, note="Hinge to about 45 degrees, pull to the belly button"),
        ex("Wide-grip lat pulldown", 0, 3, 10, 12, "3-1-1-0", "1", 90, RP),
        ex("One-arm dumbbell row", 0, 3, 10, 12, "2-1-1-0", "1", 75, note="Pull the elbow towards the hip for the lower lats"),
        ex("Straight-arm cable pulldown", 0, 2, 12, 15, "2-1-1-1", "0-1", 60, DROP),
    ]),
    "BK2": ("Chin-ups and the chest-supported T-bar row, then pulldowns and Kroc rows for the lats.", [
        ex("Chin-up", 2, 3, 6, 10, "3-1-1-0", "1-2", 150, note="Full hang at the bottom every rep"),
        ex("Chest-supported T-bar row", 1, 3, 8, 10, "2-1-1-0", "1", 120, note="Chest stays on the pad, squeeze the shoulder blades"),
        ex("Close-grip lat pulldown", 0, 3, 10, 12, "3-1-1-0", "1", 90, DROP),
        ex("Kroc row", 0, 2, 12, 15, "2-0-1-0", "1", 90, note="Heavy, a little body English is fine"),
        ex("Dumbbell pullover (lats)", 0, 2, 12, 15, "3-1-1-0", "1", 60, PART),
    ]),
    "AR1": ("Heavy compounds for the arms first, then supersets for the pump.", [
        ex("Close-grip bench press", 2, 3, 6, 8, "2-1-1-0", "1-2", 120),
        ex("Barbell curl", 1, 3, 8, 10, "2-1-1-0", "1-2", 90, note="Strict, elbows pinned"),
        ex("Skull crusher", 0, 3, 8, 10, "3-1-1-0", "1", 0),
        ex("Incline dumbbell curl", 0, 3, 10, 12, "3-1-1-0", "1", 75, ss=True),
        ex("Rope pushdown", 0, 2, 12, 15, "2-0-1-1", "0-1", 0, DROP),
        ex("Hammer curl", 0, 2, 10, 12, "2-0-1-1", "0-1", 60, PART, ss=True),
    ]),
    "AR2": ("Weighted dips and EZ-bar work, then preacher curls and overhead extensions.", [
        ex("Dips", 1, 3, 8, 12, "2-1-1-0", "1-2", 120, note="Stay upright for triceps. Add weight once 12 is easy"),
        ex("EZ-bar curl", 1, 3, 8, 10, "2-1-1-0", "1-2", 90),
        ex("Overhead dumbbell extension", 0, 3, 10, 12, "3-1-1-0", "1", 75, RP),
        ex("Preacher curl", 0, 3, 10, 12, "3-1-1-0", "1", 75, MYO),
        ex("Cable kickback (triceps)", 0, 2, 15, 20, "2-0-1-1", "0-1", 0),
        ex("Cable curl", 0, 2, 12, 15, "2-0-1-1", "0-1", 60, DROP, ss=True),
    ]),
    "LG1": ("Hack squats and Romanian deadlifts, with the pendulum squat after, kept to working sets that build strength without chasing leg size.", [
        ex("Hack squat", 2, 3, 8, 10, "3-1-1-0", "2", 150, note="Full depth, feet mid-platform"),
        ex("Romanian deadlift", 1, 3, 8, 10, "3-1-1-0", "2", 120, note="Hinge until you feel the hamstrings, back flat"),
        ex("Pendulum squat", 0, 2, 10, 12, "3-1-1-0", "1", 90, RP),
        ex("Lying leg curl", 0, 3, 10, 12, "2-0-1-1", "1", 60, DROP),
        ex("Standing calf raise", 0, 3, 10, 15, "2-2-1-1", "1", 60, note="Pause at the bottom stretch"),
    ]),
    "AB1": ("Heavy ab work you can add weight to, then rear delts and upper back for the back pose.", [
        ex("Cable crunch", 1, 4, 10, 12, "2-1-1-1", "1", 60, DROP, note="Round the spine, hips stay still"),
        ex("Hanging leg raise", 0, 3, 10, 15, "2-0-1-1", "1", 60, note="Curl the pelvis up, no swinging"),
        ex("Decline crunch", 0, 3, 10, 12, "2-1-1-1", "1", 60, note="Plate on the chest"),
        ex("Bent-over rear delt raise", 0, 3, 12, 15, "2-0-1-1", "1", 60, DROP),
        ex("Barbell shrug", 0, 2, 10, 12, "1-2-1-0", "1", 75, note="Hold the top for 2 seconds. Keep the traps in proportion, not huge"),
        ex("Face pull", 0, 3, 12, 15, "2-1-1-0", "1", 60),
    ]),
    "AB2": ("Lower abs first, the last part to show, then upper abs and rear delts.", [
        ex("Hanging leg raise", 1, 4, 10, 15, "2-0-1-1", "1", 60, RP),
        ex("Reverse crunch", 0, 3, 12, 15, "2-1-1-1", "1", 60, note="Lift the hips off the floor, not just the knees in"),
        ex("Lying leg raise", 0, 3, 12, 15, "3-0-1-1", "1", 60),
        ex("Crunch", 0, 3, 15, 20, "2-1-1-1", "0-1", 45, MYO, note="Plate on the chest, short range, squeeze hard"),
        ex("Reverse pec deck", 0, 3, 15, 20, "2-0-1-1", "0-1", 45, PART),
        ex("Chest-supported dumbbell row", 0, 3, 10, 12, "2-1-1-0", "1", 75, note="Elbows out at 45 degrees for the upper back"),
    ]),
}

# focus -> days a week -> [(weekday 1 Mon .. 7 Sun, recipe, session name, description or None)]
# A recipe joins sessions or parts of them, e.g. "BK1[:3]+LG1[:3]" = first 3 of BK1 then first 3 of LG1.
PROGRAMMES = {
    "Upper chest": {
        3: [(1, "CH1+SH1[1:3]", "Upper chest and shoulders", None), (3, "BK1[:3]+LG1[:3]", "Back and legs", "Pull-ups and rows, then hack squats and RDLs, so a 3-day week still covers everything."),
            (5, "CH2[:3]+AR1[:4]", "Upper chest and arms", "A second chest session, then heavy arm work.")],
        4: [(1, "CH1", "Upper chest heavy", None), (2, "BK1", "Back", None), (4, "LG1", "Legs", None),
            (5, "CH2[:3]+SH1[1:3]+AR1[2:4]", "Upper chest, shoulders and arms", "A second chest session, side delts and an arm superset.")],
        5: [(1, "CH1", "Upper chest heavy", None), (2, "BK1", "Back", None), (3, "LG1", "Legs", None),
            (4, "SH1[:4]+AR1[2:6]", "Shoulders and arms", "Standing press and laterals, then arm supersets."), (5, "CH2", "Upper chest, dumbbells", None)],
        6: [(1, "CH1", "Push, upper chest heavy", None), (2, "BK1", "Pull", None), (3, "LG1", "Legs", None),
            (4, "CH2", "Push, upper chest dumbbells", None), (5, "BK2[:3]+AR1[:4]", "Pull and arms", "Chins and rows, then arms."),
            (6, "SH2", "Shoulders", None)],
    },
    "Shoulder width": {
        3: [(1, "SH1+CH1[:2]", "Shoulders and chest", None), (3, "BK1[:3]+LG1[:3]", "Back and legs", "Pull-ups and rows, then hack squats and RDLs, so a 3-day week still covers everything."),
            (5, "SH2+AR1[:2]", "Shoulders and arms", "A second shoulder session, then heavy arm basics.")],
        4: [(1, "SH1", "Shoulders heavy", None), (2, "BK1", "Back", None), (4, "LG1", "Legs", None),
            (5, "SH2[1:]+CH1[:2]+AR1[2:4]", "Side delts, chest and arms", "Lateral raises first while fresh, then chest and an arm superset.")],
        5: [(1, "SH1", "Shoulders heavy", None), (2, "BK1", "Back", None), (3, "LG1", "Legs", None),
            (4, "CH1[:3]+AR1[2:6]", "Chest and arms", "Incline pressing, then arm supersets."), (5, "SH2", "Shoulders, width", None)],
        6: [(1, "SH1", "Push, shoulders heavy", None), (2, "BK1", "Pull", None), (3, "LG1", "Legs", None),
            (4, "SH2+CH2[:2]", "Push, shoulders and chest", "Side delt volume, then upper chest dumbbells."), (5, "BK2[:3]+AR1[:4]", "Pull and arms", "Chins and rows, then arms."),
            (6, "CH1[:3]+SH1[1:4]", "Chest and side delts", "Upper chest, then a third hit for the side delts.")],
    },
    "Back width": {
        3: [(1, "BK1+SH1[1:3]", "Back and side delts", None), (3, "CH1[:3]+LG1[:3]", "Chest and legs", "Incline pressing, then hack squats and RDLs, so a 3-day week still covers everything."),
            (5, "BK2+AR1[:2]", "Back and arms", "A second back session, then heavy arm basics.")],
        4: [(1, "BK1", "Back width heavy", None), (2, "CH1", "Chest and shoulders", None), (4, "LG1", "Legs", None),
            (5, "BK2[:4]+AR1[2:6]", "Back and arms", "A second back session, then arm supersets.")],
        5: [(1, "BK1", "Back width heavy", None), (2, "CH1", "Chest", None), (3, "LG1", "Legs", None),
            (4, "SH1[:4]+AR1[2:6]", "Shoulders and arms", "Standing press and laterals, then arm supersets."), (5, "BK2", "Back, chins and rows", None)],
        6: [(1, "BK1", "Pull, back width heavy", None), (2, "CH1", "Push", None), (3, "LG1", "Legs", None),
            (4, "BK2", "Pull, chins and rows", None), (5, "SH2+AR2[2:4]", "Shoulders and arms", "Side delts, then preacher curls and extensions."),
            (6, "BK1[2:5]+AR1[:4]", "Lats and arms", "A third lat session, lighter, then arms.")],
    },
    "Arms": {
        3: [(1, "AR1+CH1[:2]", "Arms and chest", None), (3, "BK1[:3]+LG1[:3]", "Back and legs", "Pull-ups and rows, then hack squats and RDLs, so a 3-day week still covers everything."),
            (5, "AR2+SH1[1:3]", "Arms and shoulders", "A second arm session, then side delts.")],
        4: [(1, "AR1", "Arms heavy", None), (2, "BK1", "Back", None), (4, "LG1", "Legs", None),
            (5, "CH1[:3]+AR2[2:6]", "Chest and arms", "Incline pressing, then preacher curls and extensions.")],
        5: [(1, "AR1", "Arms heavy", None), (2, "BK1", "Back", None), (3, "LG1", "Legs", None),
            (4, "CH1[:3]+SH1[:3]", "Chest and shoulders", "Incline pressing, then the standing press and laterals."), (5, "AR2", "Arms, dips and preachers", None)],
        6: [(1, "AR1", "Arms heavy", None), (2, "BK1", "Pull", None), (3, "LG1", "Legs", None),
            (4, "CH1[:3]+SH2[:3]", "Push", "Incline pressing, then shoulders."), (5, "AR2", "Arms, dips and preachers", None),
            (6, "BK2[:3]+SH1[1:3]", "Back and side delts", "Chins and rows, then laterals.")],
    },
    "Abs and upper back detail": {
        3: [(1, "AB1+CH1[:3]", "Abs, rear delts and chest", None), (3, "BK1[:3]+LG1[:3]", "Back and legs", "Pull-ups and rows, then hack squats and RDLs, so a 3-day week still covers everything."),
            (5, "AB2+SH1[:2]+AR1[2:4]", "Abs, shoulders and arms", "Lower abs first, then the press, laterals and an arm superset.")],
        4: [(1, "AB1+CH1[:3]", "Abs and chest", None), (2, "BK1", "Back", None), (4, "LG1", "Legs", None),
            (5, "AB2+SH1[:2]+AR1[2:4]", "Abs, shoulders and arms", "Lower abs first, then the press, laterals and an arm superset.")],
        5: [(1, "CH1", "Chest", None), (2, "BK1", "Back", None), (3, "AB1", "Abs and upper back", None),
            (4, "LG1", "Legs", None), (5, "AB2+SH1[:2]+AR1[2:4]", "Abs, shoulders and arms", "Lower abs first, then the press, laterals and an arm superset.")],
        6: [(1, "CH1", "Push", None), (2, "BK1", "Pull", None), (3, "AB1", "Abs and upper back", None),
            (4, "LG1", "Legs", None), (5, "SH2+AR1[2:4]", "Shoulders and arms", "Side delts, then an arm superset."), (6, "AB2", "Lower abs and rear delts", None)],
    },
}

WHY = {
    "Upper chest": "A full upper chest is the first thing judges see on the front pose, and the shelf most men lack.",
    "Shoulder width": "Wide, capped shoulders make the V-taper and the waist look smaller.",
    "Back width": "Lat width gives the V-shape from the front and back.",
    "Arms": "Full arms that match the shoulders, without looking blocky.",
    "Abs and upper back detail": "Abs are on show the whole time in board shorts, and rear delts and upper back detail finish the back pose.",
}
