"""
Inspect background colors of all generated images.
"""
import os
from PIL import Image
import numpy as np

SRC = r"D:\sofa\aiproject\Fishing-Expert-doubao\.tmp_fish_gen"

FILES = [
    "anglerfish.png", "blackdragon.png", "goldendragon.png", "electriceel.png",
    "ghostfish.png", "splitfish.png", "shark.png", "swordfish.png",
    "tuna.png", "grouper.png", "discus.png", "lobster.png",
    "dolphin.png", "whale.png", "dragonking.png", "boss-golden-dragon.png",
]

for fname in FILES:
    img = Image.open(os.path.join(SRC, fname)).convert("RGB")
    arr = np.array(img)
    h, w, _ = arr.shape
    # Sample corners
    tl = arr[5, 5]
    tr = arr[5, w-6]
    bl = arr[h-6, 5]
    br = arr[h-6, w-6]
    # Also sample edge midpoints
    mt = arr[5, w//2]
    mb = arr[h-6, w//2]
    ml = arr[h//2, 5]
    mr = arr[h//2, w-6]
    print(f"{fname}:")
    print(f"  TL={tl} TR={tr} BL={bl} BR={br}")
    print(f"  MT={mt} MB={mb} ML={ml} MR={mr}")
