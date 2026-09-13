"""
Final BOSS fix v4: hard cutoff below 80% height to remove all water reflections.
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

warmth = r - b
brightness = (r + g + b) / 3.0

dragon = (warmth > 15) & (brightness > 70)
white_bg = (brightness > 200) & (warmth < 25)
water = (warmth <= 15) | (brightness < 50)

alpha = np.full_like(r, 255.0)
alpha[white_bg] = 0
alpha[water & ~dragon] = 0

# Hard cutoff: below 82% height, fully transparent (removes all water reflections)
cutoff = int(h * 0.82)
alpha[cutoff:, :] = 0

# Edge feather
edge = (warmth > 8) & (warmth <= 15) & (brightness > 50)
alpha[edge] = np.clip((warmth[edge] - 8) / 7.0, 0, 1) * 255.0

arr[:, :, 3] = alpha
result = Image.fromarray(arr.astype(np.uint8), mode="RGBA")

r2, g2, b2, a2 = result.split()
a2 = a2.filter(ImageFilter.GaussianBlur(radius=1.0))
result = Image.merge("RGBA", (r2, g2, b2, a2))

arr2 = np.array(result)
arr2[:,:,3][arr2[:,:,3] < 35] = 0

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
non_t = np.sum(arr2[:,:,3] > 0)
print(f"BOSS: size={result.size}, corners={corners}, non-transparent={100*non_t/(h*w):.1f}%")
