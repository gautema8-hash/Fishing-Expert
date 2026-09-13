"""
Final BOSS fix: remove bottom water reflections.
In the bottom portion, only keep clearly golden dragon pixels.
"""
import os
from PIL import Image, ImageFilter
import numpy as np

SRC = r"D:\sofa\aiproject\Fishing-Expert-doubao\.tmp_fish_gen"
DST = r"D:\sofa\aiproject\Fishing-Expert-doubao\frontend\assets\fish"
BOSS = "boss-golden-dragon.png"

src = os.path.join(SRC, BOSS)
dst = os.path.join(DST, BOSS)

# Re-process from original source
img = Image.open(src).convert("RGBA")
arr = np.array(img).astype(np.float32)
r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
h, w = r.shape

warmth = r - b
brightness = (r + g + b) / 3.0
max_ch = np.maximum(np.maximum(r, g), b)
min_ch = np.minimum(np.minimum(r, g), b)
sat = max_ch - min_ch

# Base dragon mask: warm golden
dragon = (warmth > 15) & (brightness > 70)

# White background
white_bg = (brightness > 200) & (warmth < 25)

# Water (blue/dark)
water = (warmth <= 15) | (brightness < 50)

# In bottom 30%: require much stronger warmth to keep (remove reflections)
bottom_start = int(h * 0.70)
bottom_region = np.zeros_like(r, dtype=bool)
bottom_region[bottom_start:, :] = True
# Bottom reflections: warm but muted/blurry -> require higher threshold
bottom_reflections = bottom_region & (warmth > 15) & (warmth < 50) & (brightness < 180)

# Build alpha
alpha = np.full_like(r, 255.0)
alpha[white_bg] = 0
alpha[water & ~dragon] = 0
alpha[bottom_reflections] = 0

# Edge feather
edge = (warmth > 8) & (warmth <= 15) & (brightness > 50)
alpha[edge] = np.clip((warmth[edge] - 8) / 7.0, 0, 1) * 255.0

arr[:, :, 3] = alpha
result = Image.fromarray(arr.astype(np.uint8), mode="RGBA")

# Feather alpha
r2, g2, b2, a2 = result.split()
a2 = a2.filter(ImageFilter.GaussianBlur(radius=1.0))
result = Image.merge("RGBA", (r2, g2, b2, a2))

# Re-threshold
arr2 = np.array(result)
arr2[:,:,3][arr2[:,:,3] < 35] = 0

# Force corners
result = Image.fromarray(arr2, mode="RGBA").copy()
px = result.load()
for x in range(20):
    for y in range(20):
        px[x, y] = (px[x, y][0], px[x, y][1], px[x, y][2], 0)
        px[w-1-x, y] = (px[w-1-x, y][0], px[w-1-x, y][1], px[w-1-x, y][2], 0)
        px[x, h-1-y] = (px[x, h-1-y][0], px[x, h-1-y][1], px[x, h-1-y][2], 0)
        px[w-1-x, h-1-y] = (px[w-1-x, h-1-y][0], px[w-1-x, h-1-y][1], px[w-1-x, h-1-y][2], 0)

result.save(dst, "PNG")
corners = (px[0,0][3], px[w-1,0][3], px[0,h-1][3], px[w-1,h-1][3])
non_transparent = np.sum(arr2[:,:,3] > 0)
print(f"BOSS: size={result.size}, mode={result.mode}, corners={corners}")
print(f"Non-transparent: {non_transparent}/{h*w} ({100*non_transparent/(h*w):.1f}%)")
