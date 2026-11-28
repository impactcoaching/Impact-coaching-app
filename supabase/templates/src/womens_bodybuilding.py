# Women's bodybuilding: the most muscle of the women's classes. Uses the heavy bodybuilding sessions.
from common import ABS, build
from men import S, CH, BK, SH, AR, QD, HG, AB

CLASS, AUDIENCE, TAGS = "Women's bodybuilding", "female", ["womens bodybuilding"]
PROGRAMMES, WHY = build(S, [
    ("Back", "Width and thickness for the back poses, where shows are often decided.", BK, [CH, SH, QD, AR, HG], None),
    ("Shoulders", "Big, round delts for width and the side poses.", SH, [CH, BK, QD, AR, HG], None),
    ("Quads", "Full, separated quads with a sweep, from the front and side.", QD, [SH, BK, HG, AR, CH], None),
    ("Glutes and hamstrings", "Hamstrings, glutes and the tie-in for the side and back poses.", HG, [SH, BK, QD, AR, CH], None),
    ("Abs and waist", "Detailed abs and a tight waist for the abs and thigh and front poses.", None, [CH, BK, QD, SH, AR], AB),
])
