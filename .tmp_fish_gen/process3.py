"""
Final background removal for all 16 fish images.
Handles:
- Regular fish: near-white background
- ghostfish: dark navy background
- BOSS: white top + blue water bottom
"""
import os
from PIL import Image, ImageFilter
import numpy as np

SRC = r"D:\sofa\aiproject\Fishing-Expert-doubao\.tmp_fish_gen"
DST = r"D:\sofa\aiproject\Fishing-Expert-doubao\frontend\assets\fish"

REGULAR = [
    "anglerfish.png", "blackdragon.png", "goldendragon.png", "electriceel.png",
    "splitfish.png", "shark.png", "swordfish.png",
    "tuna.png", "grouper.png", "discus.png", "lobster.png",
    "dolphin.png", "whale.png", "dragonking.png",
]
GHOST = "ghostfish.png"
BOSS = "boss-golden-dragon.png"


def remove_white_bg(img, white_thresh=205, feather=1.2):
    """Remove near-white/light-gray background."""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    arr = np.array(img).astype(np.float32)
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]

    min_ch = np.minimum(np.minimum(r, g), b)
    max_ch = np.maximum(np.maximum(r, g), b)
    sat = max_ch - min_ch

    # Background: bright + low saturation
    bg_strength = np.clip((min_ch - (white_thresh - 50)) / 50.0, 0, 1)
    color_factor = np.clip((sat - 15) / 30.0, 0, 1)
    alpha = 255.0 * (1 - bg_strength * (1 - color_factor))

    bg_mask = (min_ch > white_thresh) & (sat < 40)
    alpha[bg_mask] = 0

    arr[:, :, 3] = alpha
    result = Image.fromarray(arr.astype(np.uint8), mode="RGBA")
    r2, g2, b2, a2 = result.split()
    a2 = a2.filter(ImageFilter.GaussianBlur(radius=feather))
    result = Image.merge("RGBA", (r2, g2, b2, a2))
    arr2 = np.array(result)
    arr2[:,:,3][arr2[:,:,3] < 20] = 0
    return Image.fromarray(arr2, mode="RGBA")


def remove_dark_bg(img, dark_thresh=60, feather=1.0):
    """Remove dark navy/black background (for ghostfish)."""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    arr = np.array(img).astype(np.float32)
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]

    # Brightness: how bright the pixel is
    brightness = (r + g + b) / 3.0
    # Also check if it's blueish dark (the bg is dark navy)
    is_dark_navy = (b > r) & (brightness < 100)

    # Alpha based on brightness: dark -> transparent, bright -> opaque
    # Transition zone: brightness 30-100
    alpha = np.clip((brightness - 20) / 80.0, 0, 1) * 255.0
    # Force dark navy to fully transparent
    alpha[is_dark_navy] = 0
    # Also force very dark pixels
    alpha[brightness < 25] = 0

    arr[:, :, 3] = alpha
    result = Image.fromarray(arr.astype(np.uint8), mode="RGBA")
    r2, g2, b2, a2 = result.split()
    a2 = a2.filter(ImageFilter.GaussianBlur(radius=feather))
    result = Image.merge("RGBA", (r2, g2, b2, a2))
    arr2 = np.array(result)
    arr2[:,:,3][arr2[:,:,3] < 25] = 0
    return Image.fromarray(arr2, mode="RGBA")


def remove_boss_bg(img):
    """
    Remove white background (top) + blue water (bottom) from BOSS dragon.
    The dragon is golden (high R, medium G, low B).
    Water is dark blue/teal (low R, medium G, high B).
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    arr = np.array(img).astype(np.float32)
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    h, w = r.shape

    min_ch = np.minimum(np.minimum(r, g), b)
    max_ch = np.maximum(np.maximum(r, g), b)
    sat = max_ch - min_ch

    # 1. White background (top area)
    white_bg = (min_ch > 200) & (sat < 35)

    # 2. Water: blue-teal dark pixels
    # Water has b >= g > r, relatively dark
    water_mask = (b >= r - 5) & (r < 180) & (max_ch < 210) & ~((r > 150) & (g > 100) & (b < 100))
    # Also remove white water splashes/foam (bright white in water area)
    bottom_start = int(h * 0.65)
    bottom_mask = np.zeros_like(r, dtype=bool)
    bottom_mask[bottom_start:, :] = True
    water_foam = bottom_mask & (min_ch > 180) & (sat < 50)
    # Golden reflection on water: bottom area, yellowish but on water surface
    golden_reflection = bottom_mask & (r > 100) & (r > b + 20) & (g < 190) & (b < 130) & (min_ch < 140)

    # Combined
    bg_mask = white_bg | water_mask | water_foam | golden_reflection

    # Soft edges for white bg
    alpha = np.full_like(r, 255.0)
    edge_zone = (min_ch > 180) & (sat < 50) & ~white_bg
    alpha[edge_zone] *= 0.4
    alpha[bg_mask] = 0

    arr[:, :, 3] = alpha
    result = Image.fromarray(arr.astype(np.uint8), mode="RGBA")
    r2, g2, b2, a2 = result.split()
    a2 = a2.filter(ImageFilter.GaussianBlur(radius=1.5))
    result = Image.merge("RGBA", (r2, g2, b2, a2))
    arr2 = np.array(result)
    arr2[:,:,3][arr2[:,:,3] < 25] = 0
    return Image.fromarray(arr2, mode="RGBA")


def force_corners(img, margin=8):
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

# Regular fish
for fname in REGULAR:
    src = os.path.join(SRC, fname)
    dst = os.path.join(DST, fname)
    img = Image.open(src)
    cleaned = remove_white_bg(img, white_thresh=205, feather=1.2)
    cleaned = force_corners(cleaned, margin=8)
    cleaned.save(dst, "PNG")
    px = cleaned.load()
    w, h = cleaned.size
    corners = (px[0,0][3], px[w-1,0][3], px[0,h-1][3], px[w-1,h-1][3])
    report.append(f"{fname}: size={cleaned.size}, mode={cleaned.mode}, corners={corners}")

# Ghostfish (dark bg)
src = os.path.join(SRC, GHOST)
dst = os.path.join(DST, GHOST)
img = Image.open(src)
cleaned = remove_dark_bg(img)
cleaned = force_corners(cleaned, margin=8)
cleaned.save(dst, "PNG")
px = cleaned.load()
w, h = cleaned.size
corners = (px[0,0][3], px[w-1,0][3], px[0,h-1][3], px[w-1,h-1][3])
report.append(f"{GHOST}: size={cleaned.size}, mode={cleaned.mode}, corners={corners}")

# BOSS
src = os.path.join(SRC, BOSS)
dst = os.path.join(DST, BOSS)
img = Image.open(src)
cleaned = remove_boss_bg(img)
cleaned = force_corners(cleaned, margin=12)
cleaned.save(dst, "PNG")
px = cleaned.load()
w, h = cleaned.size
corners = (px[0,0][3], px[w-1,0][3], px[0,h-1][3], px[w-1,h-1][3])
report.append(f"{BOSS}: size={cleaned.size}, mode={cleaned.mode}, corners={corners}")

print("=" * 80)
for line in report:
    print(line)
