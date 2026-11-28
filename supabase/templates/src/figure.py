# Figure: a wide, capped upper body and a narrow waist, with muscular, separated legs and glutes.
from common import ABS, build
from women import S, GH, QD, SH, BK, AR, AB

CLASS, AUDIENCE, TAGS = "Figure", "female", ["figure"]
PROGRAMMES, WHY = build(S, [
    ("Shoulders", "Wide, capped delts are the signature of figure.", SH, [AR, BK, QD, GH], None),
    ("Back width", "Lat width for the V-taper and the back pose.", BK, [AR, SH, QD, GH], None),
    ("Glutes and hamstrings", "Round glutes and hamstrings with a clear tie-in from the side and back.", GH, [SH, BK, QD, AR], None),
    ("Quads", "Separated quads with a sweep, more muscular than bikini or wellness.", QD, [SH, BK, GH, AR], None),
    ("Abs and waist", "A narrow waist and visible abs to finish the X-shape.", None, [SH, BK, QD, GH, AR], AB),
])
