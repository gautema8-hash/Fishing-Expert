"""
背景去除脚本：从图片边缘泛洪填充，去除与边缘连通的背景色像素
保留鱼体内部的白色部分（如小丑鱼白纹、鲨鱼肚皮）
"""
from PIL import Image, ImageFilter
import numpy as np
from collections import deque
import os

def remove_background_floodfill(img_path, output_path, color_threshold=55, alpha_threshold=200):
    """
    从图片四周边缘泛洪填充，去除连通的背景色
    color_threshold: 与边缘采样颜色的距离阈值
    alpha_threshold: 原alpha通道低于此值的像素直接视为背景
    """
    img = Image.open(img_path).convert('RGBA')
    arr = np.array(img)
    h, w = arr.shape[:2]

    rgb = arr[:, :, :3].astype(np.int16)
    alpha = arr[:, :, 3]

    # 采样边缘颜色（取边缘5px范围内的点）
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
        # 边缘已经全透明，不需要处理
        img.save(output_path)
        return 0, 0

    bg_color = np.median(border_pixels, axis=0)
    print(f"  Background color sampled: {bg_color}")

    # 计算每个像素与背景色的距离
    color_dist = np.sqrt(np.sum((rgb - bg_color) ** 2, axis=2))

    # 背景候选：颜色接近背景 且 alpha较高（不是已透明的）
    bg_candidate = (color_dist < color_threshold) & (alpha > 50)

    # 也把已经半透明的像素视为背景候选
    bg_candidate = bg_candidate | (alpha < alpha_threshold)

    # 泛洪填充：从所有边缘像素开始，标记连通的背景区域
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()

    # 将所有边缘5px内的背景候选像素加入队列
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

    # BFS泛洪
    while queue:
        cy, cx = queue.popleft()
        for dy, dx in [(-1,0),(1,0),(0,-1),(0,1)]:
            ny, nx = cy+dy, cx+dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and bg_candidate[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

    # 标记为背景的像素设为完全透明
    removed = np.sum(visited)
    arr[visited, 3] = 0

    # 对边缘做轻微羽化（1px高斯模糊alpha通道）
    result = Image.fromarray(arr)
    alpha_channel = result.split()[3]
    alpha_channel = alpha_channel.filter(ImageFilter.GaussianBlur(radius=0.8))
    result.putalpha(alpha_channel)

    # 确保四角完全透明
    result_arr = np.array(result)
    result_arr[0:3, 0:3, 3] = 0
    result_arr[0:3, -3:, 3] = 0
    result_arr[-3:, 0:3, 3] = 0
    result_arr[-3:, -3:, 3] = 0
    result = Image.fromarray(result_arr)

    result.save(output_path)

    # 验证
    final = np.array(result)
    remaining_white = np.sum((final[:,:,0] > 230) & (final[:,:,1] > 230) & (final[:,:,2] > 230) & (final[:,:,3] > 30))
    return removed, remaining_white


def main():
    fish_dir = r'D:\sofa\aiproject\Fishing-Expert-doubao\frontend\assets\fish'
    results = []

    for fname in sorted(os.listdir(fish_dir)):
        if not fname.endswith('.png'):
            continue
        fpath = os.path.join(fish_dir, fname)
        img = Image.open(fpath).convert('RGBA')
        arr = np.array(img)
        alpha = arr[:, :, 3]
        rgb = arr[:, :, :3]

        # 检查是否有白底问题
        white_mask = (rgb[:,:,0] > 230) & (rgb[:,:,1] > 230) & (rgb[:,:,2] > 230)
        white_with_alpha = np.sum(white_mask & (alpha > 30))
        white_pct = white_with_alpha / alpha.size * 100

        if white_pct > 1:  # 超过1%白底就处理
            print(f"\nProcessing {fname}: {white_pct:.1f}% white background")
            removed, remaining = remove_background_floodfill(fpath, fpath)
            print(f"  Removed {removed} pixels, remaining white: {remaining}")
            results.append((fname, white_pct, removed, remaining))
        else:
            print(f"  OK {fname}: {white_pct:.1f}% white (no processing needed)")
            results.append((fname, white_pct, 0, white_with_alpha))

    print("\n" + "="*60)
    print("SUMMARY:")
    for fname, before, removed, after in results:
        status = "FIXED" if removed > 0 else "OK"
        print(f"  {status:6s} {fname:30s} before={before:5.1f}% removed={removed:7d} after_white={after}")


if __name__ == '__main__':
    main()
