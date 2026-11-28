# Shared sessions for bikini, wellness, figure and women's physique.
# Key -> (session name, short name, description, exercises). Old school basics and modern machines, balanced.
from common import ex, DROP, RP, MYO, PART

S = {
    "WGL1": ("Glutes, heavy", "Glutes", "Barbell hip thrusts and Romanian deadlifts, then split squats, cables and the abduction machine to finish the glutes off.", [
        ex("Barbell hip thrust", 2, 4, 8, 10, "2-1-1-1", "1", 120, RP, note="Ribs down, chin tucked, squeeze for a second at the top"),
        ex("Romanian deadlift", 1, 3, 8, 10, "3-1-1-0", "1-2", 120, note="Push the hips back, feel the stretch in the glutes and hamstrings"),
        ex("Bulgarian split squat", 0, 3, 8, 10, "3-1-1-0", "1-2", 90, note="Reps each leg. Lean forward a little for the glutes"),
        ex("Cable kickback", 0, 3, 12, 15, "2-1-1-1", "1", 45),
        ex("Hip abduction machine", 0, 3, 15, 20, "2-1-1-1", "0-1", 45, DROP),
    ]),
    "WGL2": ("Glutes, machines first", "Glutes", "The hip thrust machine and reverse hack squat lead, then deep lunges and glute-focused back extensions.", [
        ex("Machine hip thrust", 2, 4, 10, 12, "2-1-1-1", "1", 120, DROP),
        ex("Reverse hack squat", 1, 3, 10, 12, "3-1-1-0", "1", 120, note="Sit back into the pad for the glutes"),
        ex("Deficit reverse lunge", 0, 3, 8, 10, "3-1-1-0", "1-2", 90, note="Reps each leg, front foot on a low step"),
        ex("Glute-focused back extension", 0, 3, 12, 15, "2-1-1-1", "1", 60, RP, note="Round the upper back, push through the hips"),
        ex("Seated hip abduction (leaning forward)", 0, 3, 15, 20, "2-1-1-1", "0-1", 45, PART),
    ]),
    "WHM1": ("Hamstrings and glute tie-in", "Hamstrings", "Romanian deadlifts and leg curls build the line where the hamstrings meet the glutes, seen from the side and back.", [
        ex("Romanian deadlift", 2, 4, 8, 10, "3-1-1-0", "1-2", 120, note="Hinge until you feel the hamstrings, back flat"),
        ex("Seated leg curl", 0, 3, 10, 12, "2-1-1-1", "1", 75, RP, note="Lean forward for a bigger stretch"),
        ex("B-stance hip thrust", 0, 3, 10, 12, "2-1-1-1", "1", 75, note="Reps each side"),
        ex("Lying leg curl", 0, 3, 12, 15, "3-0-1-1", "0-1", 60, DROP),
        ex("Cable pull-through", 0, 2, 12, 15, "2-1-1-1", "1", 60),
    ]),
    "WHM2": ("Hamstrings, stiff-leg", "Hamstrings", "Stiff-leg deadlifts, then leg curls and back extensions for the hamstrings and lower glutes.", [
        ex("Stiff-leg deadlift", 2, 3, 8, 10, "3-1-1-0", "1-2", 120),
        ex("Lying leg curl", 0, 4, 10, 12, "3-0-1-1", "1", 75, DROP),
        ex("45° back extension", 0, 3, 12, 15, "2-1-1-1", "1", 60, note="Hold a plate to the chest once 15 is easy"),
        ex("Single-leg seated leg curl", 0, 2, 12, 15, "2-1-1-1", "0-1", 60, MYO),
        ex("Kas glute bridge", 0, 2, 12, 15, "1-2-1-0", "1", 60),
    ]),
    "WQD1": ("Quads, heavy squats", "Quads", "Back squats first, then the hack squat, lunges and leg extensions.", [
        ex("Barbell back squat", 2, 3, 8, 10, "3-1-1-0", "1-2", 150, note="As deep as you can hold good form"),
        ex("Hack squat", 1, 3, 10, 12, "3-1-1-0", "1", 120, RP),
        ex("Walking lunge", 0, 2, 10, 12, "2-0-1-0", "1-2", 90, note="Reps each leg"),
        ex("Leg extension", 0, 3, 12, 15, "2-1-1-1", "0-1", 60, DROP, note="Hold the top for a second"),
        ex("Standing calf raise", 0, 3, 12, 15, "2-2-1-1", "1", 60),
    ]),
    "WQD2": ("Quads, pendulum first", "Quads", "Pendulum squats lead, then the leg press, split squats and leg extensions.", [
        ex("Pendulum squat", 2, 4, 10, 12, "3-1-1-0", "1", 120, note="Let the knees travel well forward, full depth"),
        ex("Leg press", 1, 3, 12, 15, "3-1-1-0", "1", 120, RP),
        ex("Smith machine front-foot-elevated split squat", 0, 2, 10, 12, "3-1-1-0", "1-2", 90, note="Reps each leg"),
        ex("Leg extension", 0, 3, 15, 20, "2-0-1-1", "0-1", 60, MYO),
        ex("Hip adduction machine", 0, 2, 15, 20, "2-1-1-1", "1", 45),
    ]),
    "WLG1": ("Legs, heavy", "Legs", "Squats and Romanian deadlifts, then machines for the quads, hamstrings and glutes.", [
        ex("Barbell back squat", 2, 3, 8, 10, "3-1-1-0", "1-2", 150, note="As deep as you can hold good form"),
        ex("Romanian deadlift", 1, 3, 8, 10, "3-1-1-0", "1-2", 120),
        ex("Hack squat", 0, 3, 10, 12, "3-1-1-0", "1", 120, RP),
        ex("Lying leg curl", 0, 3, 10, 12, "3-0-1-1", "1", 60, DROP),
        ex("Leg extension", 0, 2, 15, 20, "2-0-1-1", "0-1", 60, MYO),
    ]),
    "WLG2": ("Legs, machines first", "Legs", "Pendulum squats and hip thrusts lead, then leg curls, the leg press and lunges.", [
        ex("Pendulum squat", 2, 3, 10, 12, "3-1-1-0", "1", 120),
        ex("Barbell hip thrust", 1, 3, 8, 10, "2-1-1-1", "1", 120, RP),
        ex("Seated leg curl", 0, 3, 10, 12, "2-1-1-1", "1", 75, DROP),
        ex("Leg press", 0, 3, 12, 15, "3-1-1-0", "1", 90),
        ex("Walking lunge", 0, 2, 10, 12, "2-0-1-0", "1-2", 90, PART, note="Reps each leg"),
    ]),
    "WSH1": ("Shoulders, heavy", "Shoulders", "Seated dumbbell press, then lateral raises from every angle for round shoulder caps.", [
        ex("Seated dumbbell shoulder press", 2, 3, 8, 10, "2-1-1-0", "1-2", 120, note="Bench just short of upright"),
        ex("Lateral raise", 0, 4, 12, 15, "2-0-1-1", "1", 60, DROP, note="Lead with the elbows, slight lean forward"),
        ex("Upright row (cable)", 0, 3, 12, 15, "2-0-1-1", "1", 60, note="Wide grip, stop at shoulder height"),
        ex("Cable lateral raise", 0, 3, 15, 20, "2-0-1-1", "0-1", 45, PART),
        ex("Reverse pec deck", 0, 3, 15, 20, "2-0-1-1", "1", 45),
    ]),
    "WSH2": ("Shoulders, machines first", "Shoulders", "The shoulder press machine and machine laterals lead, then rear delts for a balanced shoulder from every side.", [
        ex("Machine shoulder press", 1, 3, 10, 12, "2-1-1-0", "1", 90, RP),
        ex("Machine lateral raise", 0, 4, 12, 15, "2-0-1-1", "1", 60, DROP),
        ex("Lean-away lateral raise", 0, 3, 12, 15, "2-1-1-0", "1", 60),
        ex("Face pull", 0, 3, 12, 15, "2-1-1-0", "1", 60),
        ex("Bent-over rear delt raise", 0, 2, 15, 20, "2-0-1-1", "0-1", 45, MYO),
    ]),
    "WBK1": ("Back width", "Back", "Pull-ups and wide pulldowns, then rows, for the V-taper that makes the waist look smaller.", [
        ex("Pull-up", 1, 3, 6, 10, "2-1-1-0", "1-2", 120, note="Use assisted pull-up if you can't do 6 yet"),
        ex("Wide-grip lat pulldown", 0, 3, 10, 12, "3-1-1-0", "1", 90, RP),
        ex("Wide-grip seated cable row", 0, 3, 10, 12, "2-1-1-0", "1", 90),
        ex("Single-arm lat pulldown", 0, 2, 12, 15, "2-1-1-0", "1", 60),
        ex("Straight-arm cable pulldown", 0, 2, 12, 15, "2-1-1-1", "0-1", 60, DROP),
    ]),
    "WBK2": ("Back, rows", "Back", "One-arm dumbbell rows and the chest-supported T-bar, then pulldowns and pullovers for the lats.", [
        ex("One-arm dumbbell row", 1, 3, 8, 10, "2-1-1-0", "1-2", 90, note="Pull the elbow towards the hip"),
        ex("Chest-supported T-bar row", 0, 3, 10, 12, "2-1-1-0", "1", 90, RP),
        ex("Close-grip lat pulldown", 0, 3, 10, 12, "3-1-1-0", "1", 75, DROP),
        ex("Dumbbell pullover (lats)", 0, 2, 12, 15, "3-1-1-0", "1", 60, PART),
        ex("Single-arm cable row", 0, 2, 12, 15, "2-1-1-0", "1", 60),
    ]),
    "WAR1": ("Arms, heavy", "Arms", "Close-grip bench and EZ-bar curls first, then supersets for the pump.", [
        ex("Close-grip bench press", 1, 3, 8, 10, "2-1-1-0", "1-2", 120),
        ex("EZ-bar curl", 1, 3, 8, 10, "2-1-1-0", "1-2", 90, note="Strict, elbows pinned"),
        ex("Overhead cable extension", 0, 3, 10, 12, "3-1-1-0", "1", 0),
        ex("Incline dumbbell curl", 0, 3, 10, 12, "3-1-1-0", "1", 75, RP, ss=True),
        ex("Rope pushdown", 0, 2, 12, 15, "2-0-1-1", "0-1", 0, DROP),
        ex("Hammer curl", 0, 2, 10, 12, "2-0-1-1", "0-1", 60, PART, ss=True),
    ]),
    "WAR2": ("Arms, skulls and preachers", "Arms", "Skull crushers and preacher curls, then cables.", [
        ex("Skull crusher", 1, 3, 8, 10, "3-1-1-0", "1-2", 90),
        ex("Preacher curl", 1, 3, 8, 10, "3-1-1-0", "1", 90, MYO),
        ex("Cable kickback (triceps)", 0, 2, 15, 20, "2-0-1-1", "0-1", 0),
        ex("Bayesian cable curl", 0, 2, 12, 15, "2-0-1-1", "0-1", 60, DROP, ss=True),
        ex("Dips", 0, 2, 8, 12, "2-1-1-0", "1-2", 90, note="Use assisted dip if you need to"),
    ]),
    "WCH1": ("Chest, dumbbells", "Chest", "Incline dumbbells first, then the Smith incline and flyes for a full upper chest.", [
        ex("Incline dumbbell press", 2, 3, 8, 10, "3-1-1-0", "1-2", 120),
        ex("Smith machine incline press", 0, 3, 10, 12, "2-1-1-0", "1", 90, RP),
        ex("Pec deck", 0, 3, 12, 15, "2-1-1-1", "0-1", 60, DROP),
        ex("Low-to-high cable fly", 0, 2, 12, 15, "2-1-1-1", "0-1", 60, MYO),
    ]),
    "WCH2": ("Chest, machines first", "Chest", "The chest press machine leads, then dumbbells and cables.", [
        ex("Machine chest press", 1, 3, 10, 12, "2-1-1-0", "1", 90, RP),
        ex("Dumbbell bench press", 0, 3, 8, 10, "3-1-1-0", "1-2", 90),
        ex("Cable crossover", 0, 3, 12, 15, "2-1-1-1", "0-1", 60, DROP),
        ex("Incline dumbbell fly", 0, 2, 10, 12, "3-1-1-0", "1", 60),
    ]),
    "WAB1": ("Abs and waist, heavy", "Abs", "Weighted crunches and leg raises, then side delts, as rounder shoulders make the waist look smaller.", [
        ex("Cable crunch", 1, 4, 10, 12, "2-1-1-1", "1", 60, DROP, note="Round the spine, hips stay still"),
        ex("Hanging knee raise", 0, 3, 12, 15, "2-0-1-1", "1", 60, note="Curl the pelvis up at the top"),
        ex("Decline crunch", 0, 3, 10, 12, "2-1-1-1", "1", 60, note="Plate on the chest once 12 is easy"),
        ex("Lateral raise", 0, 3, 12, 15, "2-0-1-1", "1", 60),
        ex("Cable lateral raise", 0, 2, 15, 20, "2-0-1-1", "0-1", 45, PART),
    ]),
    "WAB2": ("Lower abs and side delts", "Abs", "Lower abs first, the last part to show, then upper abs and side delts.", [
        ex("Hanging leg raise", 0, 3, 10, 15, "2-0-1-1", "1", 60, RP, note="Use the captain's chair if hanging is hard on the grip"),
        ex("Reverse crunch", 0, 3, 12, 15, "2-1-1-1", "1", 60, note="Lift the hips off the floor, not just the knees in"),
        ex("Crunch", 0, 3, 15, 20, "2-1-1-1", "0-1", 45, MYO, note="Plate on the chest, short range, squeeze hard"),
        ex("Machine lateral raise", 0, 3, 12, 15, "2-0-1-1", "1", 60, DROP),
        ex("Reverse pec deck", 0, 2, 15, 20, "2-0-1-1", "0-1", 45),
    ]),
}

GL, HM, QD, LG, SH, BK = ("WGL1", "WGL2"), ("WHM1", "WHM2"), ("WQD1", "WQD2"), ("WLG1", "WLG2"), ("WSH1", "WSH2"), ("WBK1", "WBK2")
AR, CH, AB = ("WAR1", "WAR2"), ("WCH1", "WCH2"), ("WAB1", "WAB2")
GH = ("WGL1", "WHM1")  # glutes and hamstrings together (figure)
