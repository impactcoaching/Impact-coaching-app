# Wellness: the fullest lower body of the women's classes. Big glutes and quads, hamstrings, balanced upper body.
from common import ABS, build
from women import S, GL, HM, QD, SH, BK, AB

CLASS, AUDIENCE, TAGS = "Wellness", "female", ["wellness"]
PROGRAMMES, WHY = build(S, [
    ("Glutes", "Big, round glutes are the centre of the wellness look.", GL, [SH, BK, QD, HM], None),
    ("Quads", "Full quads with a sweep, more than in bikini.", QD, [SH, BK, GL, HM], None),
    ("Hamstrings and tie-in", "Hamstrings that tie into the glutes, for the side and back poses.", HM, [SH, BK, GL, QD], None),
    ("Shoulders", "Round shoulders balance the bigger lower body and keep the waist looking small.", SH, [QD, BK, GL, HM], None),
    ("Abs and waist", "A small, tight waist that makes the hips and glutes stand out.", None, [GL, BK, QD, SH, HM], AB),
])
