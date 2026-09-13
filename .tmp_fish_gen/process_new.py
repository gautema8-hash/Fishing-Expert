"""
Process newly generated fish images: flood-fill background removal.
Adapted from remove_bg.py in project root.
"""
from PIL import Image, ImageFilter
import numpy as np
from collections import deque
import os
import sys

def remove_background_floodfill(img_path, output_path, color_threshold=55, alpha_threshold=200):
    img = Image.open(img_path).convert('RGBA')
    arr = np.array(img)
    h, w = arr.shape[:2]

    rgb = arr[:, :, :3].astype(np.int16)
    alpha = arr[:, :, 3]

    border_pixels = []
    sample_width = 8
    for x in range(0, w, 10):
        for dy in range(sample_width):
            if alpha[dy, x] > alpha_threshold:
                border_pixels.append(rgb[dy, x])
                break
        for dy in range(sample_width):
            if alpha[h-1-dy, x] > alpha_threshold:
                border_pixels.append(rgb[h-1-dy, x])
                break
    for y in range(0, h, 10):
        for dx in range(sample_width):
            if alpha[y, dx] > alpha_threshold:
                border_pixels.append(rgb[y, dx])
                break
        for dx in range(sample_width):
            if alpha[y, w-1-dx] > alpha_threshold:
                border_pixels.append(rgb[y, w-1-dx])
                break

    if not border_pixels:
        img.save(output_path)
        return 0

    bg_color = np.median(border_pixels, axis=0)
    color_dist = np.sqrt(np.sum((rgb - bg_color) ** 2, axis=2))
    bg_candidate = (color_dist < color_threshold) & (alpha > 50)
    bg_candidate = bg_candidate | (alpha < alpha_threshold)

    visited = np.zeros((h, w), dtype=bool)
    queue = deque()

    border_width = 8
    for x in range(w):
        for dy in range(border_width):
            if bg_candidate[dy, x] and not visited[dy, x]:
                visited[dy, x] = True
                queue.append((dy, x))
            if bg_candidate[h-1-dy, x] and not visited[h-1-dy, x]:
                visited[h-1-dy, x] = True
                queue.append((h-1-dy, x))
    for y in range(h):
        for dx in range(border_width):
            if bg_candidate[y, dx] and not visited[y, dx]:
                visited[y, dx] = True
                queue.append((y, dx))
            if bg_candidate[y, w-1-dx] and not visited[y, w-1-dx]:
                visited[y, w-1-dx] = True
                queue.append((y, w-1-dx))

    while queue:
        cy, cx = queue.popleft()
        for dy, dx in [(-1,0),(1,0),(0,-1),(0,1)]:
            ny, nx = cy+dy, cx+dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and bg_candidate[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

    removed = int(np.sum(visited))
    arr[visited, 3] = 0

    result = Image.fromarray(arr)
    alpha_channel = result.split()[3]
    alpha_channel = alpha_channel.filter(ImageFilter.GaussianBlur(radius=0.8))
    result.putalpha(alpha_channel)

    result_arr = np.array(result)
    result_arr[0:3, 0:3, 3] = 0
    result_arr[0:3, -3:, 3] = 0
    result_arr[-3:, 0:3, 3] = 0
    result_arr[-3:, -3:, 3] = 0
    result = Image.fromarray(result_arr)
    result.save(output_path)
    return removed


def main():
    tmp_dir = r'D:\sofa\aiproject\Fishing-Expert-doubao\.tmp_fish_gen'
    out_dir = r'D:\sofa\aiproject\Fishing-Expert-doubao\frontend\assets\fish'

    new_files = [
        'boss-golden-dragon.png',
        'angelfish.png', 'betta.png', 'butterflyfish.png', 'lionfish.png',
        'parrotfish.png', 'tang.png',
        'red_arowana.png', 'luohan.png', 'viperfish.png', 'gulper_eel.png',
        'giant_isopod.png', 'glass_squid.png',
        'dumbo_octopus.png', 'seadragon.png', 'leafy_seadragon.png',
        'sea_rabbit.png', 'sea_urchin.png', 'sea_cucumber.png',
        'sea_snake.png', 'flying_fish.png', 'archerfish.png',
        'hatchetfish.png', 'barreleye.png', 'moray_eel.png',
        'stingray.png', 'nautilus.png', 'cuttlefish.png',
        'manatee.png', 'koi.png', 'oarfish.png'
    ]

    for fname in new_files:
        src = os.path.join(tmp_dir, fname)
        dst = os.path.join(out_dir, fname)
        if not os.path.exists(src):
            print(f"MISSING: {fname}")
            continue
        removed = remove_background_floodfill(src, dst)
        out_size = os.path.getsize(dst)
        print(f"  {fname:30s} removed={removed:7d}  output={out_size//1024}KB")

if __name__ == '__main__':
    main()
