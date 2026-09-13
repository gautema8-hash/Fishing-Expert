"""
Aggressive BOSS background removal - keep only warm golden dragon pixels.
"""
import os
from PIL import Image, ImageFilter
import numpy as np

SRC = r"D:\sofa\aiproject\Fishing-Expert-doubao\.tmp_fish_gen"
DST = r"D:\sofa\aiproject\Fishing-Expert-doubao\frontend\assets\fish"
BOSS = "boss-golden-dragon.png"

src = os.path.join(SRC, BOSS)
dst = os.path.join(DST, BOSS)

img = Image.open(src).convert("RGBA")
arr = np.array(img).astype(np.float32)
r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
h, w = r.shape

# Dragon is warm golden: R is the dominant channel
# Water is blue: B >= R
# White bg: all channels high and equal

# Alpha logic:
# - If pixel is warm (R > B + 15): keep (dragon)
# - If pixel is blue/neutral (B >= R or R ≈ B with low warmth): remove (water/bg)
# - Edge zone: partial transparency

warmth = r - b  # positive = warm (golden), ~0 = neutral, negative = blue
brightness = (r + g + b) / 3.0

# Dragon mask: warm AND reasonably bright
dragon = (warmth > 10) & (brightness > 60)

# White background: bright + low warmth
white_bg = (brightness > 200) & (warmth < 25)

# Water: blueish or dark
water = (warmth <= 10) | (brightness < 50)

# Start with full alpha
alpha = np.full_like(r, 255.0)

# Remove white bg
alpha[white_bg] = 0

# Remove water (non-dragon pixels in lower region)
# But be gentle: only remove water pixels where warmth is low
water_lower = water & ~dragon
alpha[water_lower] = 0

# Edge feather: pixels near the boundary get partial alpha
edge = (warmth > 5) & (warmth <= 15) & (brightness > 50)
alpha[edge] = np.clip((warmth[edge] - 5) / 10.0, 0, 1) * 255.0

arr[:, :, 3] = alpha
result = Image.fromarray(arr.astype(np.uint8), mode="RGBA")

# Feather alpha
r2, g2, b2, a2 = result.split()
a2 = a2.filter(ImageFilter.GaussianBlur(radius=1.2))
result = Image.merge("RGBA", (r2, g2, b2, a2))

# Re-threshold
arr2 = np.array(result)
arr2[:,:,3][arr2[:,:,3] < 30] = 0

# Force corners
result = Image.fromarray(arr2, mode="RGBA").copy()
px = result.load()
for x in range(15):
    for y in range(15):
        px[x, y] = (px[x, y][0], px[x, y][1], px[x, y][2], 0)
        px[w-1-x, y] = (px[w-1-x, y][0], px[w-1-x, y][1], px[w-1-x, y][2], 0)
        px[x, h-1-y] = (px[x, h-1-y][0], px[x, h-1-y][1], px[x, h-1-y][2], 0)
        px[w-1-x, h-1-y] = (px[w-1-x, h-1-y][0], px[w-1-x, h-1-y][1], px[w-1-x, h-1-y][2], 0)

result.save(dst, "PNG")

# Report
px = result.load()
corners = (px[0,0][3], px[w-1,0][3], px[0,h-1][3], px[w-1,h-1][3])
print(f"BOSS: size={result.size}, mode={result.mode}, corners={corners}")

# Also check how much non-transparent area remains
non_transparent = np.sum(arr2[:,:,3] > 0)
total = h * w
print(f"Non-transparent pixels: {non_transparent}/{total} ({100*non_transparent/total:.1f}%)")
