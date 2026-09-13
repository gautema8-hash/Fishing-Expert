"""
Final verification of all 16 fish images.
Check: RGBA mode, corner alpha=0, expected dimensions.
"""
import os
from PIL import Image

DST = r"D:\sofa\aiproject\Fishing-Expert-doubao\frontend\assets\fish"

EXPECTED = {
    "anglerfish.png": (1024, 1024),
    "blackdragon.png": (1024, 1024),
    "goldendragon.png": (1024, 1024),
    "electriceel.png": (1024, 1024),
    "ghostfish.png": (1024, 1024),
    "splitfish.png": (1024, 1024),
    "shark.png": (1024, 1024),
    "swordfish.png": (1024, 1024),
    "tuna.png": (1024, 1024),
    "grouper.png": (1024, 1024),
    "discus.png": (1024, 1024),
    "lobster.png": (1024, 1024),
    "dolphin.png": (1024, 1024),
    "whale.png": (1024, 1024),
    "dragonking.png": (1024, 1024),
    "boss-golden-dragon.png": (2048, 2048),
}

print(f"{'File':<30} {'Mode':<6} {'Size':<14} {'TL':>4} {'TR':>4} {'BL':>4} {'BR':>4} {'Status'}")
print("=" * 90)

all_pass = True
for fname, (ew, eh) in sorted(EXPECTED.items()):
    path = os.path.join(DST, fname)
    if not os.path.exists(path):
        print(f"{fname:<30} MISSING FILE")
        all_pass = False
        continue

    img = Image.open(path)
    mode = img.mode
    w, h = img.size

    # Get corner alpha (sample 3x3 area at each corner)
    if mode == "RGBA":
        px = img.load()
        tl = px[1, 1][3]
        tr = px[w-2, 1][3]
        bl = px[1, h-2][3]
        br = px[w-2, h-2][3]
    else:
        tl = tr = bl = br = "N/A"

    size_ok = (w == ew and h == eh)
    mode_ok = (mode == "RGBA")
    corners_ok = all(c == 0 for c in [tl, tr, bl, br]) if isinstance(tl, int) else False

    status = "PASS" if (size_ok and mode_ok and corners_ok) else "FAIL"
    if status == "FAIL":
        all_pass = False

    print(f"{fname:<30} {mode:<6} {w}x{h:<8} {tl:>4} {tr:>4} {bl:>4} {br:>4} {status}")

print("=" * 90)
print(f"\nOverall: {'ALL 16 IMAGES PASS' if all_pass else 'SOME IMAGES FAILED'}")
