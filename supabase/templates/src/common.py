# Shared bits for the class programmes.
# ex(name, warm-up sets, work sets, reps from, reps to, tempo, RIR, rest s, intensifier, superset with previous, note)
# Adam (28 Nov): old school basics plus the best modern machines (pendulum, hack squat and so on). Machines can lead
# a session where that's the better choice. Abs are for looks, never core stability, and finish every session.


def ex(name, w, s, lo, hi, tempo, rir, rest, inten=None, ss=False, note=None):
    return dict(name=name, w=w, s=s, lo=lo, hi=hi, tempo=tempo, rir=rir, rest=rest, inten=inten, ss=ss, note=note)


DROP = {"type": "drop", "drops": 2, "pct": 20}
RP = {"type": "rp", "mini": 2, "rest": 15}
MYO = {"type": "myo", "mini": 4, "reps": 4, "rest": 10}
PART = {"type": "partials", "reps": 6}

# Abs finishers, rotated through the week. Each pair is a superset.
ABS = [
    [ex("Cable crunch", 0, 3, 10, 15, "2-1-1-1", "1", 0, DROP, note="Round the spine down to the floor, hips stay still"),
     ex("Hanging knee raise", 0, 3, 12, 15, "2-0-1-1", "1", 60, ss=True, note="Curl the pelvis up at the top")],
    [ex("Hanging leg raise", 0, 3, 10, 15, "2-0-1-1", "1", 0, note="Curl the pelvis up, no swinging"),
     ex("Decline crunch", 0, 3, 10, 15, "2-1-1-1", "1", 60, MYO, ss=True, note="Hold a plate on your chest once 15 is easy")],
    [ex("Decline crunch", 0, 3, 10, 12, "2-1-1-1", "1", 0, RP, note="Hold a plate on your chest"),
     ex("Reverse crunch", 0, 3, 12, 15, "2-1-1-1", "1", 60, ss=True)],
    [ex("Captain's chair knee raise", 0, 3, 12, 15, "2-0-1-1", "1", 0, note="Dumbbell between the feet once 15 is easy"),
     ex("Cable crunch", 0, 3, 12, 15, "2-1-1-1", "1", 60, DROP, ss=True)],
    [ex("Reverse crunch", 0, 3, 12, 15, "2-1-1-1", "1", 0),
     ex("Crunch", 0, 3, 15, 20, "2-1-1-1", "0-1", 60, MYO, ss=True, note="Plate on the chest, short range, squeeze hard")],
]


def _join(words):
    words = list(dict.fromkeys(words))
    return words[0] if len(words) == 1 else ", ".join(words[:-1]) + " and " + words[-1]


def day(S, *parts):
    """parts are (key, slice) or key. Returns (recipe, name, description or None)."""
    parts = [(p, "") if isinstance(p, str) else p for p in parts]
    recipe = "+".join(k + sl for k, sl in parts)
    if len(parts) == 1 and not parts[0][1]:
        return recipe, S[parts[0][0]][0], None
    shorts = [S[k][1] for k, _ in parts]
    lower = [s[0].lower() + s[1:] for s in dict.fromkeys(shorts)]
    name = _join([shorts[0]] + lower[1:])
    desc = f"{shorts[0]} first, then {_join(lower[1:])}." if len(lower) > 1 else None
    return recipe, name, desc


WD = {3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6]}


def weeks(S, P, O):
    """P = (session 1, session 2) for the focus. O = the other groups, each (session a, session b), 4 or 5 of them.
    The focus comes first in the week and is trained 2 to 3 times; everything else at least once."""
    p1, p2 = P
    o = [g if isinstance(g, tuple) else (g, g) for g in O]
    extra = len(o) == 5
    plans = {
        3: [day(S, p1, (o[0][0], "[:2]")), day(S, (o[1][0], "[:3]"), (o[2][0], "[:3]")),
            day(S, (p2, "[:4]"), (o[3][0], "[:2]"), (o[4][0], "[:2]")) if extra else day(S, p2, (o[3][0], "[:2]"))],
        4: ([day(S, p1, (o[0][0], "[:2]")), day(S, o[1][0]), day(S, o[2][0]), day(S, (p2, "[:3]"), (o[3][0], "[:2]"), (o[4][0], "[:3]"))] if extra else
            [day(S, p1), day(S, o[1][0]), day(S, o[2][0]), day(S, (p2, "[:3]"), (o[0][0], "[:2]"), (o[3][0], "[:3]"))]),
        5: [day(S, p1), day(S, o[1][0]), day(S, o[2][0]),
            day(S, (o[0][0], "[:3]"), (o[3][0], "[:3]"), (o[4][0], "[:2]")) if extra else day(S, (o[0][0], "[:4]"), (o[3][0], "[:4]")),
            day(S, p2)],
        6: [day(S, p1), day(S, o[1][0]), day(S, o[2][0]), day(S, p2), day(S, (o[1][1], "[:3]"), (o[3][0], "[:4]")),
            day(S, (o[0][1], "[:4]"), (o[4][0], "[:4]")) if extra else day(S, o[0][1])],
    }
    return {n: [(d, *x) for d, x in zip(WD[n], plan)] for n, plan in plans.items()}


def abs_weeks(S, A, O):
    """A = (abs session 1, abs session 2). O = 5 other groups. Abs get two heavy sessions of their own,
    and every other session still finishes with abs."""
    a1, a2 = A
    o = [g[0] if isinstance(g, tuple) else g for g in O]
    plans = {
        3: [day(S, a1, (o[0], "[:3]")), day(S, (o[1], "[:3]"), (o[2], "[:3]")), day(S, a2, (o[3], "[:2]"), (o[4], "[:3]"))],
        4: [day(S, a1, (o[0], "[:3]")), day(S, o[1]), day(S, o[2]), day(S, a2, (o[3], "[:2]"), (o[4], "[:3]"))],
        5: [day(S, o[0]), day(S, o[1]), day(S, a1), day(S, o[2]), day(S, a2, (o[3], "[:2]"), (o[4], "[:3]"))],
        6: [day(S, o[0]), day(S, o[1]), day(S, a1), day(S, o[2]), day(S, (o[3], "[:4]"), (o[4], "[:4]")), day(S, a2)],
    }
    return {n: [(d, *x) for d, x in zip(WD[n], plan)] for n, plan in plans.items()}


def build(S, focuses):
    """focuses: [(focus, why, P or None, O)] with P None for the abs focus (uses the class's abs sessions)."""
    progs, why = {}, {}
    for focus, reason, P, O, A in focuses:
        progs[focus] = abs_weeks(S, A, O) if A else weeks(S, P, O)
        why[focus] = reason
    return progs, why
