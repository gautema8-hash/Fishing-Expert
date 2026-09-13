/**
 * ImageSlicer.js - 图片切片工具
 * 将整鱼/整生物图片按骨骼部位切片，用于骨骼驱动的网格变形渲染
 *
 * 核心技术：垂直条带切片（Vertical Strip Slicing）
 * 将头朝右的生物图片沿身体长轴切成 N 个垂直条带，
 * 每个条带绑定一节脊椎骨骼，渲染时按骨骼位置/角度独立绘制，
 * 条带间重叠几像素掩盖接缝，实现身体连续弯曲效果。
 *
 * 缓存策略：按 imageSrc + sliceCount + overlap 缓存到静态 Map，
 * 同种鱼只切一次，所有实例共享切片画布。
 */
export class ImageSlicer {
    static _cache = new Map();

    /**
     * 将图片垂直切成 N 个条带（头朝右图片：slice[0]=最左=尾部，slice[N-1]=最右=头部）
     * @param {HTMLImageElement} image - 源图片
     * @param {number} numSlices - 切片数量（通常 8~12）
     * @param {number} overlapPx - 条带间重叠像素（掩盖接缝，默认3）
     * @returns {Array<{canvas:HTMLCanvasElement, width:number, height:number, srcX:number}>}
     */
    static sliceVertical(image, numSlices, overlapPx = 3) {
        if (!image || !image.naturalWidth || !image.naturalHeight) return [];

        const srcKey = image.src || `img_${image.naturalWidth}x${image.naturalHeight}`;
        const key = `${srcKey}|v|${numSlices}|${overlapPx}`;
        const cached = ImageSlicer._cache.get(key);
        if (cached) return cached;

        const slices = [];
        const imgW = image.naturalWidth;
        const imgH = image.naturalHeight;
        const sliceW = imgW / numSlices;

        for (let i = 0; i < numSlices; i++) {
            // 每条带左右各扩展 overlapPx 用于重叠
            const srcX = Math.max(0, i * sliceW - overlapPx);
            const srcRight = Math.min(imgW, (i + 1) * sliceW + overlapPx);
            const srcW = srcRight - srcX;

            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(srcW));
            canvas.height = imgH;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, srcX, 0, srcW, imgH, 0, 0, canvas.width, imgH);

            slices.push({
                canvas,
                width: canvas.width,
                height: imgH,
                srcX,
                srcW,
                centerX: (i + 0.5) * sliceW  // 条带中心在原图中的 x 坐标
            });
        }

        ImageSlicer._cache.set(key, slices);
        return slices;
    }

    /**
     * 按区域裁剪图片（用于提取鱼头、龟壳、章鱼触手等独立部位）
     * @param {HTMLImageElement} image
     * @param {number} sx - 源x
     * @param {number} sy - 源y
     * @param {number} sw - 源宽
     * @param {number} sh - 源高
     * @returns {HTMLCanvasElement}
     */
    static crop(image, sx, sy, sw, sh) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(sw));
        canvas.height = Math.max(1, Math.round(sh));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        return canvas;
    }

    /**
     * 清除缓存（切换资源/内存紧张时调用）
     */
    static clearCache() {
        ImageSlicer._cache.clear();
    }

    /**
     * 获取缓存统计
     */
    static getCacheStats() {
        return {
            entries: ImageSlicer._cache.size,
            keys: Array.from(ImageSlicer._cache.keys())
        };
    }
}
