# Shared sessions for classic physique and bodybuilding (men's bodybuilding, and women's bodybuilding).
# Key -> (session name, short name, description, exercises). Old school basics and modern machines, balanced.
from common import ex, DROP, RP, MYO, PART

S = {
    "MCH1": ("Chest, heavy", "Chest", "Barbell bench press first, the old school chest builder, then incline dumbbells and the chest press machine for the pump.", [
        ex("Barbell bench press", 2, 4, 6, 8, "3-1-1-0", "1-2", 150, note="Shoulder blades pinned, bar to the lower chest"),
        ex("Incline dumbbell press", 1, 3, 8, 10, "3-1-1-0", "1", 120),
        ex("Machine chest press", 0, 3, 10, 12, "2-0-1-1", "1", 90, DROP),
        ex("Chest dip", 0, 2, 8, 12, "2-1-1-0", "1-2", 90, note="Lean forward for the chest. Add weight once 12 is easy"),
        ex("Cable crossover", 0, 2, 12, 15, "2-1-1-1", "0-1", 60, MYO),
    ]),
    "MCH2": ("Chest, machines first", "Chest", "The plate-loaded incline press leads while you're fresh, then dumbbells, a deep stretch and the pec deck.", [
        ex("Incline machine press", 2, 4, 8, 10, "2-1-1-0", "1", 120, RP, note="Seat set so the handles line up with the upper chest"),
        ex("Dumbbell bench press", 1, 3, 8, 10, "3-1-1-0", "1-2", 120),
        ex("Incline dumbbell fly", 0, 3, 10, 12, "3-1-1-0", "1", 75, note="Deep stretch, stop just short of the dumbbells touching"),
        ex("Pec deck", 0, 3, 12, 15, "2-1-1-1", "0-1", 60, DROP),
        ex("Dumbbell pullover", 0, 2, 10, 12, "3-1-1-0", "1-2", 75),
    ]),
    "MBK1": ("Back width", "Back", "Weighted pull-ups and barbell rows, the basics that build a wide back, then pulldowns for the lats.", [
        ex("Pull-up", 2, 4, 6, 10, "2-1-1-0", "1-2", 150, note="Add weight once you can do 10. Use assisted if you can't do 6 yet"),
        ex("Barbell row", 1, 3, 8, 10, "2-1-1-0", "1-2", 120, note="Hinge to about 45 degrees, pull to the belly button"),
        ex("Wide-grip lat pulldown", 0, 3, 10, 12, "3-1-1-0", "1", 90, RP),
        ex("Single-arm cable row", 0, 3, 10, 12, "2-1-1-0", "1", 75, note="Pull the elbow towards the hip for the lower lats"),
        ex("Straight-arm cable pulldown", 0, 2, 12, 15, "2-1-1-1", "0-1", 60, DROP),
    ]),
    "MBK2": ("Back thickness", "Back", "Deadlifts and the chest-supported T-bar row for thickness, then cable rows for the upper back.", [
        ex("Conventional deadlift", 2, 3, 5, 6, "2-1-1-0", "2", 180, note="Every rep from a dead stop, back flat"),
        ex("Chest-supported T-bar row", 1, 3, 8, 10, "2-1-1-0", "1", 120, RP, note="Chest stays on the pad, squeeze the shoulder blades"),
        ex("Wide-grip seated cable row", 0, 3, 10, 12, "2-1-1-0", "1", 90, note="Elbows out for the upper back"),
        ex("Kroc row", 0, 2, 12, 15, "2-0-1-0", "1", 90, note="Heavy, a little body English is fine"),
        ex("Close-grip lat pulldown", 0, 2, 10, 12, "3-1-1-0", "0-1", 60, DROP),
    ]),
    "MSH1": ("Shoulders, heavy", "Shoulders", "The standing press, the old school shoulder builder, then heavy side delt work.", [
        ex("Standing barbell overhead press", 2, 4, 6, 8, "2-1-1-0", "1-2", 150, note="Glutes tight, bar over mid-foot, head through at the top"),
        ex("Lateral raise", 0, 4, 10, 12, "2-0-1-1", "1", 60, DROP, note="Lead with the elbows, slight lean forward"),
        ex("Dumbbell upright row", 0, 3, 10, 12, "2-0-1-1", "1-2", 75, note="Wide, elbows lead, stop at shoulder height"),
        ex("Bent-over rear delt raise", 0, 3, 12, 15, "2-0-1-1", "1", 60),
        ex("Cable lateral raise", 0, 2, 15, 20, "2-0-1-1", "0-1", 45, PART),
    ]),
    "MSH2": ("Shoulders, machines first", "Shoulders", "The shoulder press machine leads, then lots of lateral raises and rear delts.", [
        ex("Machine shoulder press", 2, 3, 8, 10, "2-1-1-0", "1", 120, RP),
        ex("Seated dumbbell shoulder press", 0, 2, 8, 10, "2-1-1-0", "1-2", 90),
        ex("Machine lateral raise", 0, 4, 12, 15, "2-0-1-1", "1", 60, DROP),
        ex("Lean-away lateral raise", 0, 2, 12, 15, "2-1-1-0", "1", 60),
        ex("Reverse pec deck", 0, 3, 12, 15, "2-0-1-1", "1", 60, MYO),
    ]),
    "MAR1": ("Arms, heavy", "Arms", "Heavy compounds for the arms first, then supersets for the pump.", [
        ex("Close-grip bench press", 2, 3, 6, 8, "2-1-1-0", "1-2", 120),
        ex("Barbell curl", 1, 3, 8, 10, "2-1-1-0", "1-2", 90, note="Strict, elbows pinned"),
        ex("Skull crusher", 0, 3, 8, 10, "3-1-1-0", "1", 0),
        ex("Incline dumbbell curl", 0, 3, 10, 12, "3-1-1-0", "1", 75, ss=True),
        ex("Rope pushdown", 0, 2, 12, 15, "2-0-1-1", "0-1", 0, DROP),
        ex("Hammer curl", 0, 2, 10, 12, "2-0-1-1", "0-1", 60, PART, ss=True),
    ]),
    "MAR2": ("Arms, dips and preachers", "Arms", "Weighted dips and EZ-bar curls, then preachers, overhead extensions and cables.", [
        ex("Dips", 1, 3, 8, 12, "2-1-1-0", "1-2", 120, note="Stay upright for triceps. Add weight once 12 is easy"),
        ex("EZ-bar curl", 1, 3, 8, 10, "2-1-1-0", "1-2", 90),
        ex("Overhead cable extension", 0, 3, 10, 12, "3-1-1-0", "1", 75, RP),
        ex("Preacher curl", 0, 3, 10, 12, "3-1-1-0", "1", 75, MYO),
        ex("Cable kickback (triceps)", 0, 2, 15, 20, "2-0-1-1", "0-1", 0),
        ex("Bayesian cable curl", 0, 2, 12, 15, "2-0-1-1", "0-1", 60, DROP, ss=True),
    ]),
    "MQD1": ("Legs, heavy squats", "Legs", "Back squats first, then the hack squat and leg extensions for the sweep, with leg curls to keep the hamstrings in step.", [
        ex("Barbell back squat", 2, 4, 6, 8, "3-1-1-0", "1-2", 180, note="Sit between the heels, as deep as you can hold good form"),
        ex("Hack squat", 1, 3, 8, 10, "3-1-1-0", "1", 150, RP, note="Feet low and fairly narrow for the outer quads"),
        ex("Leg extension", 0, 3, 12, 15, "2-1-1-1", "0-1", 60, DROP, note="Hold the top for a second"),
        ex("Lying leg curl", 0, 3, 10, 12, "3-0-1-1", "1", 60),
        ex("Standing calf raise", 0, 4, 10, 12, "2-2-1-1", "1", 60, note="Pause at the bottom stretch"),
    ]),
    "MQD2": ("Legs, pendulum first", "Legs", "Pendulum squats lead, deep and kind on the back, then the leg press, Bulgarians and leg curls.", [
        ex("Pendulum squat", 2, 4, 8, 10, "3-1-1-0", "1", 150, note="Let the knees travel well forward, full depth"),
        ex("Leg press", 1, 3, 10, 12, "3-1-1-0", "1", 120, RP),
        ex("Bulgarian split squat", 0, 2, 8, 10, "3-1-1-0", "1-2", 90, note="Reps each leg, upright for the quads"),
        ex("Seated leg curl", 0, 3, 10, 12, "2-1-1-1", "1", 60, MYO, note="Lean forward for a bigger stretch"),
        ex("Seated calf raise machine", 0, 4, 12, 15, "2-2-1-1", "1", 60),
    ]),
    "MHG1": ("Hamstrings and glutes", "Hamstrings", "Romanian deadlifts and leg curls for the hamstrings, then hip thrusts for the glutes.", [
        ex("Romanian deadlift", 2, 4, 6, 8, "3-1-1-0", "1-2", 150, note="Hinge until you feel the hamstrings, back flat"),
        ex("Seated leg curl", 0, 3, 10, 12, "2-1-1-1", "1", 75, RP, note="Lean forward for a bigger stretch"),
        ex("Barbell hip thrust", 1, 3, 8, 10, "2-1-1-1", "1", 120),
        ex("Lying leg curl", 0, 3, 10, 12, "3-0-1-1", "0-1", 60, DROP),
        ex("Standing calf raise", 0, 3, 10, 15, "2-2-1-1", "1", 60),
    ]),
    "MHG2": ("Hamstrings, stiff-leg", "Hamstrings", "Stiff-leg deadlifts, the old school hamstring builder, then curls and the reverse hack squat for the glutes.", [
        ex("Stiff-leg deadlift", 2, 3, 8, 10, "3-1-1-0", "1-2", 150),
        ex("Lying leg curl", 0, 4, 8, 10, "3-0-1-1", "1", 75, DROP),
        ex("Reverse hack squat", 0, 3, 10, 12, "3-1-1-0", "1", 90, note="Sit back into the pad for the glutes"),
        ex("Single-leg seated leg curl", 0, 2, 12, 15, "2-1-1-1", "0-1", 60, MYO),
        ex("Seated calf raise machine", 0, 3, 12, 15, "2-2-1-1", "1", 60),
    ]),
    "MAB1": ("Abs and waist, heavy", "Abs", "Weighted ab work you can add load to, then side delts, as wider shoulders make the waist look smaller.", [
        ex("Cable crunch", 1, 4, 10, 12, "2-1-1-1", "1", 60, DROP, note="Round the spine, hips stay still"),
        ex("Hanging leg raise", 0, 3, 10, 15, "2-0-1-1", "1", 60, note="Curl the pelvis up, no swinging"),
        ex("Decline crunch", 0, 3, 10, 12, "2-1-1-1", "1", 60, note="Plate on the chest"),
        ex("Lateral raise", 0, 3, 12, 15, "2-0-1-1", "1", 60),
        ex("Cable lateral raise", 0, 2, 15, 20, "2-0-1-1", "0-1", 45, PART),
    ]),
    "MAB2": ("Lower abs and side delts", "Abs", "Lower abs first, the last part to show, then upper abs and side delts.", [
        ex("Hanging leg raise", 1, 4, 10, 15, "2-0-1-1", "1", 60, RP),
        ex("Reverse crunch", 0, 3, 12, 15, "2-1-1-1", "1", 60, note="Lift the hips off the floor, not just the knees in"),
        ex("Crunch", 0, 3, 15, 20, "2-1-1-1", "0-1", 45, MYO, note="Plate on the chest, short range, squeeze hard"),
        ex("Machine lateral raise", 0, 3, 12, 15, "2-0-1-1", "1", 60, DROP),
        ex("Reverse pec deck", 0, 2, 15, 20, "2-0-1-1", "0-1", 45),
    ]),
}

CH, BK, SH, AR, QD, HG, AB = ("MCH1", "MCH2"), ("MBK1", "MBK2"), ("MSH1", "MSH2"), ("MAR1", "MAR2"), ("MQD1", "MQD2"), ("MHG1", "MHG2"), ("MAB1", "MAB2")
