# Men's bodybuilding: size, thickness and conditioning everywhere, with the waist kept tight.
from common import ABS, build
from men import S, CH, BK, SH, AR, QD, HG, AB

CLASS, AUDIENCE, TAGS = "Men's bodybuilding", "male", ["mens bodybuilding"]
PROGRAMMES, WHY = build(S, [
    ("Back", "Width and thickness win the back poses, where shows are often decided.", BK, [SH, CH, QD, AR], None),
    ("Chest", "Thick pecs for the side chest and the most muscular.", CH, [SH, BK, QD, AR], None),
    ("Legs", "Quads, hamstrings and glutes in proportion with the upper body, from the front, side and back.", (QD[0], HG[0]), [SH, BK, CH, AR], None),
    ("Arms", "Full biceps and triceps for the double biceps and side triceps.", AR, [CH, BK, QD, SH], None),
    ("Abs and waist", "Detailed abs and a tight waist for the abs and thigh and the front poses.", None, [CH, BK, QD, SH, AR], AB),
])
