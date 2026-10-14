"""Generate the site's terrain art: topographic contours, the Mt. Hood dusk scene,
conifer treelines, ridgeline edges and the footer scene.

Writes src/data/terrain.json, which the Astro components read at build time.
Each run with the same seeds produces identical output.

Usage:  pip install numpy scipy scikit-image   then   npm run terrain
"""
import json
import numpy as np
from scipy.ndimage import gaussian_filter
from scipy.interpolate import CubicSpline
from skimage.measure import find_contours, approximate_polygon

OUT = {}


def fmt(v):
    return f"{v:.0f}" if abs(v - round(v)) < 0.05 else f"{v:.1f}"


def poly_d(pts, close=False):
    s = "M" + " L".join(f"{fmt(x)} {fmt(y)}" for x, y in pts)
    return s + (" Z" if close else "")


def noise1d(rng, n, ctrl, amp):
    xs = np.linspace(0, 1, ctrl)
    ys = rng.uniform(-1, 1, ctrl)
    cs = CubicSpline(xs, ys)
    return cs(np.linspace(0, 1, n)) * amp


def fractal1d(rng, n, base_ctrl=6, octaves=4, amp=1.0):
    total = np.zeros(n)
    a, c = amp, base_ctrl
    for _ in range(octaves):
        total += noise1d(rng, n, c, a)
        a *= 0.45
        c *= 2
    return total


# ---------- Topographic contours ----------
def topo(seed, w=1200, h=700, levels=22, hills=4):
    if h > 1000: levels, hills = 40, 9
    rng = np.random.default_rng(seed)
    gw, gh = 240, int(240 * h / w)
    yy, xx = np.mgrid[0:gh, 0:gw]
    z = np.zeros((gh, gw))
    for _ in range(hills):
        cx, cy = rng.uniform(0.1, 0.9) * gw, rng.uniform(0.15, 0.85) * gh
        sx, sy = rng.uniform(0.12, 0.3) * gw, rng.uniform(0.15, 0.35) * gh
        z += rng.uniform(0.6, 1.0) * np.exp(-(((xx - cx) / sx) ** 2 + ((yy - cy) / sy) ** 2))
    z += gaussian_filter(rng.normal(size=(gh, gw)), 9) * 2.2
    z += gaussian_filter(rng.normal(size=(gh, gw)), 4) * 0.35
    lv = np.linspace(z.min(), z.max(), levels + 2)[1:-1]
    sx_, sy_ = w / (gw - 1), h / (gh - 1)
    minor, index = [], []
    for i, L in enumerate(lv):
        for c in find_contours(z, L):
            if len(c) < 8:
                continue
            c = approximate_polygon(c, tolerance=0.35)
            pts = [(p[1] * sx_, p[0] * sy_) for p in c]
            (index if i % 5 == 2 else minor).append(poly_d(pts))
    return " ".join(minor), " ".join(index)


for name, seed, w, h in [("topo_a", 7, 1200, 700), ("topo_b", 21, 1200, 700), ("topo_c", 42, 1200, 500), ("topo_tall", 63, 1200, 1800)]:
    m, i = topo(seed, w, h)
    OUT[name] = {"w": w, "h": h, "minor": m, "index": i}


# ---------- Conifer silhouettes ----------
def tree(rng, x, base, h):
    w = h * rng.uniform(0.28, 0.36)
    tiers = rng.integers(4, 7)
    lean = rng.uniform(-0.04, 0.04) * h
    top = (x + lean, base - h)
    trunk = max(1.2, w * 0.06)
    left, right = [], []
    for i in range(1, tiers + 1):
        f = i / tiers
        y = base - h + h * 0.86 * f
        hw = w / 2 * (0.3 + 0.7 * f) * rng.uniform(0.9, 1.1)
        cx = x + lean * (1 - f)
        left += [(cx - hw, y), (cx - hw * 0.42, y - h * 0.015)]
        right += [(cx + hw * 0.42, y - h * 0.015), (cx + hw, y)]
    left = left[:-1]
    right = right[1:]
    ybot = base - h * 0.14
    pts = [top] + left + [(x - trunk, ybot), (x - trunk, base + 2), (x + trunk, base + 2), (x + trunk, ybot)] + right[::-1]
    return poly_d(pts, close=True)


def forest(rng, w, baseline_fn, hmin, hmax, spacing=(9, 20)):
    d = []
    x = -10
    while x < w + 10:
        h = rng.uniform(hmin, hmax)
        # occasional tall snag / clusters
        if rng.random() < 0.08:
            h *= 1.35
        d.append(tree(rng, x, baseline_fn(x), h))
        x += rng.uniform(*spacing)
    return " ".join(d)


# ---------- Hero scene (Mt. Hood at dusk) ----------
def hero_scene(seed=3, W=1440, H=640):
    rng = np.random.default_rng(seed)
    n = 289
    xs = np.linspace(0, W, n)
    # Mt. Hood profile
    px, py = 1060, 120
    base_l, base_r, base_y = 540, 1500, 470
    hood = []
    for t in np.linspace(0, 1, 60):
        x = base_l + (px - base_l) * t
        y = base_y - (base_y - py) * (t ** 2.1)
        y += np.sin(t * 17) * 4 + rng.uniform(-3, 3) * (1 - t)
        hood.append((x, y))
    for t in np.linspace(0, 1, 60)[1:]:
        x = px + (base_r - px) * t
        y = py + (base_y - py) * (t ** 0.55)
        y += np.sin(t * 13 + 1) * 5 + rng.uniform(-3, 3) * t
        hood.append((x, y))
    hood_d = poly_d([(base_l - 40, base_y + 40)] + hood + [(base_r + 40, base_y + 40)], close=True)

    # snowcap: outline above jagged snowline
    def outline_y(x):
        arr = np.array(hood)
        return np.interp(x, arr[:, 0], arr[:, 1])

    snow_top = [(x, y) for x, y in hood if y < 285]
    xl, xr = snow_top[0][0], snow_top[-1][0]
    bottom = []
    xs_s = np.linspace(xr, xl, 22)
    for j, x in enumerate(xs_s):
        oy = outline_y(x)
        if j % 2 == 0:
            depth = rng.uniform(45, 105) if rng.random() < 0.5 else rng.uniform(15, 40)
        else:
            depth = rng.uniform(0, 18)
        bottom.append((x, max(oy + 2, 285 + depth - abs(x - px) * 0.12)))
    snow_d = poly_d(snow_top + bottom, close=True)
    # rock ribs cutting through the snowfield
    ribs = []
    for k in range(7):
        ang = rng.uniform(-0.4, 0.4)
        sx = px + ang * 60
        sy = outline_y(sx) + rng.uniform(25, 60)
        length = rng.uniform(50, 110)
        ex = sx + ang * length * 0.9
        ey = sy + length
        wdt = rng.uniform(3, 7)
        ribs.append(poly_d([(sx, sy), (sx + wdt, sy + length * 0.4), (ex + wdt * 0.4, ey), (ex - wdt * 0.4, ey), (sx - wdt * 0.6, sy + length * 0.3)], close=True))
    ribs_d = " ".join(ribs)

    # shadow (east) face
    shadow = [(px, py)] + [(x, y) for x, y in hood if x > px] + [(base_r + 40, base_y + 40), (px + 80, base_y + 40)]
    mid = []
    for t in np.linspace(1, 0, 14):
        mid.append((px + 80 * t + rng.uniform(-14, 14) * t, py + (base_y + 40 - py) * t))
    shadow_d = poly_d(shadow + mid[1:], close=True)

    def ridge(baseline, amp, seed_off, octv=5):
        r = np.random.default_rng(seed + seed_off)
        y = baseline + fractal1d(r, n, base_ctrl=5, octaves=octv, amp=amp)
        return [(x, yy) for x, yy in zip(xs, y)]

    r1 = ridge(452, 38, 1)
    r2 = ridge(498, 30, 2)
    r3 = ridge(540, 24, 3)

    def fill(pts):
        return poly_d(pts + [(W, H), (0, H)], close=True)

    # foreground forest
    rf = np.random.default_rng(seed + 9)
    fg_base = 578 + fractal1d(rf, n, base_ctrl=4, octaves=3, amp=12)
    base_fn = lambda x: float(np.interp(x, xs, fg_base))
    trees_far = forest(np.random.default_rng(seed + 11), W, lambda x: float(np.interp(x, xs, np.array(r3)[:, 1])) + 6, 14, 30, (6, 11))
    trees_near = forest(np.random.default_rng(seed + 12), W, base_fn, 34, 96, (10, 22))
    ground = fill([(x, base_fn(x)) for x in xs])

    return {
        "W": W, "H": H,
        "hood": hood_d, "snow": snow_d, "shadow": shadow_d, "ribs": ribs_d,
        "r1": fill(r1), "r2": fill(r2), "r3": fill(r3),
        "trees_far": trees_far, "trees_near": trees_near, "ground": ground,
    }


OUT["hero"] = hero_scene()


# ---------- Treeline band (divider) ----------
def treeline(seed, W=1440, H=110):
    rng = np.random.default_rng(seed)
    n = 145
    xs = np.linspace(0, W, n)
    back_base = H - 22 + fractal1d(rng, n, 4, 3, 6)
    front_base = H - 4 + fractal1d(rng, n, 4, 3, 3)
    back = forest(np.random.default_rng(seed + 1), W, lambda x: float(np.interp(x, xs, back_base)), 20, 48, (7, 14))
    front = forest(np.random.default_rng(seed + 2), W, lambda x: float(np.interp(x, xs, front_base)), 26, 78, (11, 26))
    return {"W": W, "H": H, "back": back, "front": front,
            "ground": poly_d([(x, y) for x, y in zip(xs, front_base)] + [(W, H + 4), (0, H + 4)], close=True)}


OUT["treeline_a"] = treeline(101)
OUT["treeline_b"] = treeline(202)


# ---------- Ridge edges (section transitions) ----------
def ridge_edge(seed, W=1440, H=90):
    rng = np.random.default_rng(seed)
    n = 145
    xs = np.linspace(0, W, n)
    y1 = 34 + fractal1d(rng, n, 5, 5, 22)
    y2 = 58 + fractal1d(rng, n, 4, 4, 14)
    back = poly_d([(x, y) for x, y in zip(xs, y1)] + [(W, H), (0, H)], close=True)
    front = poly_d([(x, y) for x, y in zip(xs, y2)] + [(W, H), (0, H)], close=True)
    return {"W": W, "H": H, "back": back, "front": front}


OUT["ridge_a"] = ridge_edge(5)
OUT["ridge_b"] = ridge_edge(9)


# ---------- Footer scene: Hood silhouette + treeline ----------
def footer_scene(seed=17, W=1440, H=220):
    rng = np.random.default_rng(seed)
    px, py, by = 1040, 30, 170
    hood = []
    for t in np.linspace(0, 1, 40):
        hood.append((640 + (px - 640) * t, by - (by - py) * t ** 1.5 + rng.uniform(-1.5, 1.5)))
    for t in np.linspace(0, 1, 40)[1:]:
        hood.append((px + (1380 - px) * t, py + (by - py) * t ** 0.75 + rng.uniform(-1.5, 1.5)))
    hood_d = poly_d([(600, by + 30)] + hood + [(1420, by + 30)], close=True)
    snow = [(x, y) for x, y in hood if y < 82]
    xl, xr = snow[0][0], snow[-1][0]
    bot = [(x, 82 + (rng.uniform(4, 22) if rng.random() < 0.6 else rng.uniform(0, 6))) for x in np.linspace(xr, xl, 16)]
    snow_d = poly_d(snow + bot, close=True)
    n = 145
    xs = np.linspace(0, W, n)
    rb = 150 + fractal1d(rng, n, 5, 4, 14)
    ridge = poly_d([(x, y) for x, y in zip(xs, rb)] + [(W, H), (0, H)], close=True)
    fb = H - 6 + fractal1d(rng, n, 4, 3, 4)
    trees = forest(np.random.default_rng(seed + 3), W, lambda x: float(np.interp(x, xs, fb)), 24, 70, (9, 20))
    ground = poly_d([(x, y) for x, y in zip(xs, fb)] + [(W, H + 4), (0, H + 4)], close=True)
    return {"W": W, "H": H, "hood": hood_d, "snow": snow_d, "ridge": ridge, "trees": trees, "ground": ground}


OUT["footer"] = footer_scene()

from pathlib import Path
out = Path(__file__).resolve().parent.parent / "src" / "data" / "terrain.json"
with open(out, "w") as f:
    json.dump(OUT, f, separators=(",", ":"))
for k, v in OUT.items():
    print(k, sum(len(s) for s in v.values() if isinstance(s, str)))
