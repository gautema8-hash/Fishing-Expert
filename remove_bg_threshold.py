"""
Color threshold background removal for game assets.
Samples corner background color, computes Euclidean distance,
sets near-background pixels transparent, then feathers alpha edges.
"""
from PIL import Image, ImageFilter
import numpy as np
import os

TMP_DIR = r"D:\sofa\aiproject\Fishing-Expert-doubao\.tmp_gen"
CANNON_DIR = r"D:\sofa\aiproject\Fishing-Expert-doubao\frontend\assets\cannon"
FISH_DIR = r"D:\sofa\aiproject\Fishing-Expert-doubao\frontend\assets\fish"

# (temp_filename, output_path, target_size, threshold)
JOBS = [
    ("cannon-lv1.png", os.path.join(CANNON_DIR, "cannon-lv1.png"), (512, 512), 70),
    ("cannon-lv2.png", os.path.join(CANNON_DIR, "cannon-lv2.png"), (512, 512), 70),
    ("cannon-lv3.png", os.path.join(CANNON_DIR, "cannon-lv3.png"), (512, 512), 70),
    ("cannon-lv4.png", os.path.join(CANNON_DIR, "cannon-lv4.png"), (512, 512), 70),
    ("cannon-lv5.png", os.path.join(CANNON_DIR, "cannon-lv5.png"), (512, 512), 70),
    ("boss-golden-dragon.png", os.path.join(FISH_DIR, "boss-golden-dragon.png"), (2048, 2048), 70),
]


def remove_bg_color_threshold(input_path, output_path, target_size, threshold=70):
    img = Image.open(input_path).convert("RGBA")
    # Resize to target size first
    if img.size != target_size:
        img = img.resize(target_size, Image.LANCZOS)

    arr = np.array(img)
    rgb = arr[:, :, :3].astype(np.int16)
    h, w = rgb.shape[:2]

    # Sample corners and edges (10px strips)
    margin = 10
    corners = np.vstack([
        rgb[0:margin, 0:margin].reshape(-1, 3),
        rgb[0:margin, -margin:].reshape(-1, 3),
        rgb[-margin:, 0:margin].reshape(-1, 3),
        rgb[-margin:, -margin:].reshape(-1, 3),
        # Also sample edge strips
        rgb[0:margin, :].reshape(-1, 3),
        rgb[-margin:, :].reshape(-1, 3),
        rgb[:, 0:margin].reshape(-1, 3),
        rgb[:, -margin:].reshape(-1, 3),
    ])
    bg_color = np.median(corners, axis=0)
    print(f"  BG color median: {bg_color}")

    dist = np.sqrt(np.sum((rgb - bg_color) ** 2, axis=2))
    mask = dist < threshold
    arr[mask, 3] = 0

    # Ensure corners are fully transparent
    corner_size = 5
    arr[0:corner_size, 0:corner_size, 3] = 0
    arr[0:corner_size, -corner_size:, 3] = 0
    arr[-corner_size:, 0:corner_size, 3] = 0
    arr[-corner_size:, -corner_size:, 3] = 0

    result = Image.fromarray(arr)
    # Feather alpha edges
    alpha = result.split()[3].filter(ImageFilter.GaussianBlur(radius=0.8))
    result.putalpha(alpha)

    result.save(output_path, "PNG")
    return output_path


def verify_corners(path):
    """Check that all 4 corners have alpha=0"""
    img = Image.open(path).convert("RGBA")
    arr = np.array(img)
    h, w = arr.shape[:2]
    margins = [
        arr[0:3, 0:3, 3].mean(),
        arr[0:3, -3:, 3].mean(),
        arr[-3:, 0:3, 3].mean(),
        arr[-3:, -3:, 3].mean(),
    ]
    return all(m < 1.0 for m in margins), margins


results = []
for tmp_name, out_path, size, thresh in JOBS:
    tmp_path = os.path.join(TMP_DIR, tmp_name)
    if not os.path.exists(tmp_path):
        print(f"[MISSING] {tmp_name}")
        results.append((tmp_name, "MISSING", 0, False))
        continue

    print(f"\nProcessing: {tmp_name} -> {out_path}")
    remove_bg_color_threshold(tmp_path, out_path, size, threshold=thresh)

    file_size = os.path.getsize(out_path)
    ok, corners = verify_corners(out_path)
    img = Image.open(out_path)
    print(f"  Output: {out_path}")
    print(f"  Size: {img.size}, File: {file_size/1024:.1f} KB")
    print(f"  Corner alpha means: {[f'{m:.1f}' for m in corners]}")
    print(f"  Corners transparent: {ok}")
    results.append((tmp_name, "OK" if ok else "WARN", file_size, ok))

print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
for name, status, fsize, ok in results:
    print(f"  {name:30s}  {status:8s}  {fsize/1024:8.1f} KB  corners_ok={ok}")
