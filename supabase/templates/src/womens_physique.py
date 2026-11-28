# Women's physique: muscle, shape and symmetry, posed like men's classic. Back, shoulders and arms matter most.
from common import ABS, build
from women import S, LG, SH, BK, AR, CH, AB

CLASS, AUDIENCE, TAGS = "Women's physique", "female", ["womens physique"]
PROGRAMMES, WHY = build(S, [
    ("Back", "A wide, detailed back for the back double biceps and lat spread.", BK, [CH, SH, LG, AR], None),
    ("Shoulders", "Round, full delts that make the frame look wider.", SH, [CH, BK, LG, AR], None),
    ("Arms", "Biceps and triceps that stand out on the double biceps and side triceps.", AR, [CH, BK, LG, SH], None),
    ("Legs", "Quads, hamstrings and glutes in proportion with a muscular upper body.", LG, [SH, BK, CH, AR], None),
    ("Abs and waist", "Detailed abs and a small waist for the abs and thigh and front poses.", None, [CH, BK, LG, SH, AR], AB),
])
