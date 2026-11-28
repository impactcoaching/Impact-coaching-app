# Classic physique: the X-frame. Full chest, wide back, big legs with sweep, arms, and a small waist.
from common import ABS, build
from men import S, CH, BK, SH, AR, QD, AB

CLASS, AUDIENCE, TAGS = "Classic physique", "male", ["classic physique"]
PROGRAMMES, WHY = build(S, [
    ("Chest", "A full chest from top to bottom fills out the front poses.", CH, [SH, BK, QD, AR], None),
    ("Back width", "Width from the lats is half the X-frame and makes the waist look tiny.", BK, [SH, CH, QD, AR], None),
    ("Quad sweep", "Outer quad sweep is the other half of the X-frame, and legs are judged here, unlike men's physique.", QD, [SH, CH, BK, AR], None),
    ("Arms", "Arms that match the chest and calves, for the classic proportions.", AR, [CH, BK, QD, SH], None),
    ("Abs and waist", "A small, detailed waist is what classic is judged on, in the vacuum and the abs and thigh.", None, [CH, BK, QD, SH, AR], AB),
])
