# Bikini: round glutes, a glute-ham tie-in, capped shoulders, a little back width, and a small, tight waist.
from common import ABS, build
from women import S, GL, HM, QD, SH, BK, AB

CLASS, AUDIENCE, TAGS = "Bikini", "female", ["bikini"]
PROGRAMMES, WHY = build(S, [
    ("Glutes", "Round, full glutes are what bikini is judged on most, from the back and side.", GL, [SH, BK, HM, QD], None),
    ("Glute-ham tie-in", "A clear line where the hamstrings meet the glutes shows on the side and back poses.", HM, [SH, BK, GL, QD], None),
    ("Shoulder caps", "Round shoulders give the upper body shape and make the waist look smaller.", SH, [QD, BK, GL, HM], None),
    ("Back width", "A little lat width finishes the V-taper on the back pose.", BK, [QD, SH, GL, HM], None),
    ("Abs and waist", "A small, tight waist with soft ab lines, not blocky abs.", None, [GL, BK, HM, SH, QD], AB),
])
