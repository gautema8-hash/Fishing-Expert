"""
Proper background removal for fish images.
- Regular fish: near-white/light-gray background -> transparent
- BOSS dragon: white background + blue water at bottom -> transparent
"""
import os
from PIL import Image, ImageFilter
import numpy as np

SRC = r"D:\sofa\aiproject\Fishing-Expert-doubao\.tmp_fish_gen"
DST = r"D:\sofa\aiproject\Fishing-Expert-doubao\frontend\assets\fish"

REGULAR = [
    "anglerfish.png", "blackdragon.png", "goldendragon.png", "electriceel.png",
    "ghostfish.png", "splitfish.png", "shark.png", "swordfish.png",
    "tuna.png", "grouper.png", "discus.png", "lobster.png",
    "dolphin.png", "whale.png", "dragonking.png",
]
BOSS = "boss-golden-dragon.png"

def remove_white_bg(img, white_thresh=200, feather=1.5):
    """
    Remove near-white background.
    Pixels where all channels > white_thresh become transparent.
    Creates a smooth alpha gradient for edge pixels.
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    arr = np.array(img).astype(np.float32)
    r, g, b, a = arr[:,:,0], arr[:,:,1], arr[:,:,2], arr[:,:,3]

    # "Whiteness" measure: how close to white
    # Use min channel value - high means all channels are bright = likely bg
    min_ch = np.minimum(np.minimum(r, g), b)
    # Also compute saturation - low saturation + bright = white bg
    max_ch = np.maximum(np.maximum(r, g), b)
    sat = max_ch - min_ch  # 0 = gray/white, high = colorful

    # Alpha: if min_ch > white_thresh and sat < 30 -> transparent
    # Edge zone: min_ch between white_thresh-40 and white_thresh -> partial
    bg_strength = np.clip((min_ch - (white_thresh - 50)) / 50.0, 0, 1)
    # Reduce transparency for colorful pixels (even if bright)
    color_factor = np.clip((sat - 15) / 30.0, 0, 1)
    # Final alpha reduction
    alpha = a * (1 - bg_strength * (1 - color_factor))

    # For very bright + low sat pixels, force transparent
    bg_mask = (min_ch > white_thresh) & (sat < 40)
    alpha[bg_mask] = 0

    arr[:, :, 3] = alpha
    result = Image.fromarray(arr.astype(np.uint8), mode="RGBA")

    # Feather alpha channel
    r2, g2, b2, a2 = result.split()
    a2 = a2.filter(ImageFilter.GaussianBlur(radius=feather))
    result = Image.merge("RGBA", (r2, g2, b2, a2))

    # Re-threshold very low
    arr2 = np.array(result)
    arr2[:,:,3][arr2[:,:,3] < 20] = 0
    return Image.fromarray(arr2, mode="RGBA")


def remove_boss_bg(img):
    """
    Remove white background (top) AND blue water (bottom) from BOSS dragon.
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    arr = np.array(img).astype(np.float32)
    r, g, b, a = arr[:,:,0], arr[:,:,1], arr[:,:,2], arr[:,:,3]

    h, w = r.shape

    # --- White background removal (top area) ---
    min_ch = np.minimum(np.minimum(r, g), b)
    max_ch = np.maximum(np.maximum(r, g), b)
    sat = max_ch - min_ch

    white_bg = (min_ch > 200) & (sat < 35)

    # --- Blue water removal (bottom area) ---
    # Water is dark blue: b > r, b > g, relatively dark
    blue_water = (b > r + 15) & (b > g + 5) & (max_ch < 200) & (min_ch < 150)
    # Also remove golden reflection on water (yellowish-brown in bottom area)
    # The reflection is at bottom ~20% of image
    bottom_region = np.zeros_like(r, dtype=bool)
    bottom_thresh = int(h * 0.78)
    bottom_region[bottom_thresh:, :] = True
    # Golden reflection on water: r > g > b, moderate brightness
    golden_reflection = bottom_region & (r > 100) & (r > b + 30) & (g > b + 10) & (g < 200)

    # Combined mask
    bg_mask = white_bg | blue_water | golden_reflection

    # Soft transition for white bg
    edge_zone = (min_ch > 180) & (sat < 50) & ~white_bg
    alpha = a.copy()
    alpha[edge_zone] *= 0.5
    alpha[bg_mask] = 0

    arr[:, :, 3] = alpha
    result = Image.fromarray(arr.astype(np.uint8), mode="RGBA")

    # Feather
    r2, g2, b2, a2 = result.split()
    a2 = a2.filter(ImageFilter.GaussianBlur(radius=1.5))
    result = Image.merge("RGBA", (r2, g2, b2, a2))

    # Re-threshold
    arr2 = np.array(result)
    arr2[:,:,3][arr2[:,:,3] < 25] = 0
    return Image.fromarray(arr2, mode="RGBA")


def force_corners_transparent(img, margin=8):
    """Force a small region at each corner to fully transparent."""
    result = img.copy()
    w, h = result.size
    px = result.load()
    for x in range(min(margin, w)):
        for y in range(min(margin, h)):
            px[x, y] = (px[x, y][0], px[x, y][1], px[x, y][2], 0)
            px[w-1-x, y] = (px[w-1-x, y][0], px[w-1-x, y][1], px[w-1-x, y][2], 0)
            px[x, h-1-y] = (px[x, h-1-y][0], px[x, h-1-y][1], px[x, h-1-y][2], 0)
            px[w-1-x, h-1-y] = (px[w-1-x, h-1-y][0], px[w-1-x, h-1-y][1], px[w-1-x, h-1-y][2], 0)
    return result


report = []

for fname in REGULAR:
    src = os.path.join(SRC, fname)
    dst = os.path.join(DST, fname)
    img = Image.open(src)
    cleaned = remove_white_bg(img, white_thresh=205, feather=1.2)
    cleaned = force_corners_transparent(cleaned, margin=8)
    cleaned.save(dst, "PNG")

    # Report corner alpha
    px = cleaned.load()
    w, h = cleaned.size
    corners = (px[0,0][3], px[w-1,0][3], px[0,h-1][3], px[w-1,h-1][3])
    report.append(f"{fname}: size={cleaned.size}, mode={cleaned.mode}, corners={corners}")

# BOSS
src = os.path.join(SRC, BOSS)
dst = os.path.join(DST, BOSS)
img = Image.open(src)
cleaned = remove_boss_bg(img)
cleaned = force_corners_transparent(cleaned, margin=12)
cleaned.save(dst, "PNG")
px = cleaned.load()
w, h = cleaned.size
corners = (px[0,0][3], px[w-1,0][3], px[0,h-1][3], px[w-1,h-1][3])
report.append(f"{BOSS}: size={cleaned.size}, mode={cleaned.mode}, corners={corners}")

print("=" * 80)
print("BACKGROUND REMOVAL REPORT")
print("=" * 80)
for line in report:
    print(line)
