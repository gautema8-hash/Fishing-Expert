"""
PIL post-processing for fish images:
1. Check four corners alpha
2. Threshold low-alpha pixels to fully transparent
3. Slight feather on alpha edge
4. Force corners to alpha=0
5. Save to target directory
"""
import os
from PIL import Image, ImageFilter
import numpy as np

SRC = r"D:\sofa\aiproject\Fishing-Expert-doubao\.tmp_fish_gen"
DST = r"D:\sofa\aiproject\Fishing-Expert-doubao\frontend\assets\fish"

FILES = [
    "anglerfish.png",
    "blackdragon.png",
    "goldendragon.png",
    "electriceel.png",
    "ghostfish.png",
    "splitfish.png",
    "shark.png",
    "swordfish.png",
    "tuna.png",
    "grouper.png",
    "discus.png",
    "lobster.png",
    "dolphin.png",
    "whale.png",
    "dragonking.png",
    "boss-golden-dragon.png",
]

def check_corners(img):
    """Return alpha values at 4 corners (TL, TR, BL, BR)."""
    w, h = img.size
    px = img.load()
    tl = px[0, 0][3]
    tr = px[w-1, 0][3]
    bl = px[0, h-1][3]
    br = px[w-1, h-1][3]
    return tl, tr, bl, br

def clean_alpha(img, threshold=30):
    """
    Clean alpha channel:
    - Set alpha < threshold to 0
    - Slight feather (Gaussian blur alpha 1px)
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    arr = np.array(img)
    alpha = arr[:, :, 3].astype(np.float32)

    # Threshold: low alpha -> 0
    alpha[alpha < threshold] = 0

    # Slight feather on edges via Gaussian blur on alpha
    alpha_img = Image.fromarray(alpha.astype(np.uint8), mode="L")
    alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(radius=1))
    alpha = np.array(alpha_img).astype(np.float32)

    # After blur, re-threshold very low to keep clean edges
    alpha[alpha < 15] = 0

    arr[:, :, 3] = alpha.astype(np.uint8)
    result = Image.fromarray(arr, mode="RGBA")

    # Force corners to fully transparent (5x5 area)
    result = result.copy()
    w, h = result.size
    px = result.load()
    for x in range(min(6, w)):
        for y in range(min(6, h)):
            px[x, y] = (px[x, y][0], px[x, y][1], px[x, y][2], 0)
            px[w-1-x, y] = (px[w-1-x, y][0], px[w-1-x, y][1], px[w-1-x, y][2], 0)
            px[x, h-1-y] = (px[x, h-1-y][0], px[x, h-1-y][1], px[x, h-1-y][2], 0)
            px[w-1-x, h-1-y] = (px[w-1-x, h-1-y][0], px[w-1-x, h-1-y][1], px[w-1-x, h-1-y][2], 0)

    return result

report = []
for fname in FILES:
    src_path = os.path.join(SRC, fname)
    dst_path = os.path.join(DST, fname)

    if not os.path.exists(src_path):
        report.append(f"MISSING: {fname}")
        continue

    img = Image.open(src_path)
    orig_mode = img.mode
    orig_size = img.size
    corners_before = check_corners(img.convert("RGBA"))

    # Clean up
    cleaned = clean_alpha(img, threshold=30)
    corners_after = check_corners(cleaned)

    cleaned.save(dst_path, "PNG")
    report.append(
        f"{fname}: size={orig_size}, mode={orig_mode}->RGBA, "
        f"corners_before={corners_before}, corners_after={corners_after}"
    )

print("=" * 80)
print("PIL POST-PROCESSING REPORT")
print("=" * 80)
for line in report:
    print(line)
