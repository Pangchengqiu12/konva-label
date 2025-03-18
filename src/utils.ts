import Konva from 'konva';
import Konvalabel from './types';
/**
 * 已知等腰三角形的底边长度、底边和腰的夹角，求顶点到底边的高。
 *
 * @param {number} baseLength 底边长度
 * @param {number} angle 夹角（角度制）
 * @returns {number} 顶点到底边的高
 */
export function calculateHeightFromBase(baseLength: number, angle: number) {
  // 将角度转换为弧度
  const radians = (angle * Math.PI) / 180;
  // 计算底边一半的长度
  const halfBase = baseLength / 2;
  // 使用正切函数计算高
  const height = halfBase * Math.tan(radians);
  return height;
}

// 获取相对于缩放的坐标
export const getRelativePointerPosition = (node) => {
  const transform = node.getAbsoluteTransform().copy();
  transform.invert();
  const pos = node.getStage().getPointerPosition();
  return transform.point(pos);
};

export function getStageAbsoluteDimensions(
  stage: Konva.Stage
): Konvalabel.XYWH {
  const [scaledStageWidth, scaledStageHeight] = [
    stage.width() * stage.scaleX(),
    stage.height() * stage.scaleY(),
  ];

  const [stageX, stageY] = [stage.x(), stage.y()];
  return {
    width: scaledStageWidth,
    height: scaledStageHeight,
    x: stageX,
    y: stageY,
  };
}
export function fitBBoxToScaledStage(
  box: Konvalabel.XYWH,
  stage: Konvalabel.XYWH
) {
  let { x, y, width, height } = box;

  const [realX, realY] = [box.x - stage.x, box.y - stage.y];

  if (realX < 0) {
    x = stage.x;
    width += realX;
  } else if (realX + box.width > stage.width) {
    width = stage.width - realX;
  }

  if (realY < 0) {
    y = stage.y;
    height += realY;
  } else if (realY + box.height > stage.height) {
    height = stage.height - realY;
  }

  return { ...box, x, y, width, height };
}

export function getBoundingBoxAfterChanges(
  rect: Konvalabel.XYWH,
  shiftPoint: { x: number; y: number },
  radRotation = 0
) {
  const transform = new Konva.Transform();

  transform.translate(shiftPoint.x, shiftPoint.y);
  transform.rotate(radRotation);
  return getBoundingBoxAfterTransform(rect, transform);
}
export function getBoundingBoxAfterTransform(
  rect: Konvalabel.XYWH,
  transform: Konva.Transform
): Konvalabel.XYWH {
  const points = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
  let minX: number;
  let minY: number;
  let maxX: number;
  let maxY: number;

  points.forEach((point) => {
    const transformed = transform.point(point);

    if (minX === undefined) {
      minX = maxX = transformed.x;
      minY = maxY = transformed.y;
    }
    minX = Math.min(minX, transformed.x);
    minY = Math.min(minY, transformed.y);
    maxX = Math.max(maxX, transformed.x);
    maxY = Math.max(maxY, transformed.y);
  });
  return {
    x: minX!,
    y: minY!,
    width: maxX! - minX!,
    height: maxY! - minY!,
  };
}
/**
 * 创建图片缓存
 * @param {string} url 图片地址
 */
export function imageOnLoad(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      resolve(img);
    };
    img.onerror = (error) => {
      reject(new Error(`图片加载失败${url}: ${JSON.stringify(error)}`));
    };
  });
}
// export function convertToRGBA(color: string, opacity: number): string {
//   // 创建一个临时 canvas 来解析颜色
//   const canvas = document.createElement('canvas');
//   const ctx = canvas.getContext('2d')!;

//   // 设置颜色
//   ctx.fillStyle = color;

//   // 获取颜色值
//   const [r, g, b] = ctx.fillStyle
//     .replace(/^#/, '')
//     .match(/.{2}/g)!
//     .map((x) => parseInt(x, 16));

//   // 确保透明度在 0-1 之间
//   const alpha = Math.max(0, Math.min(1, opacity));

//   return `rgba(${r}, ${g}, ${b}, ${alpha})`;
// }
export const toRgba = (color: string, alpha: number = 1) => {
  if (!color) return color;
  let r, g, b;
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((x) => x + x)
        .join('');
    }
    [r, g, b] = [0, 2, 4].map((start) =>
      parseInt(hex.slice(start, start + 2), 16)
    );
  } else if (color.startsWith('rgb')) {
    [r, g, b] = color.match(/\d+/g)!.map(Number);
  } else if (color.startsWith('hsl')) {
    const [h, s, l] = color.match(/\d+/g)!.map(Number);
    // 将 HSL 转换为 RGB
    const hue = h / 360;
    const saturation = s / 100;
    const lightness = l / 100;

    if (saturation === 0) {
      r = g = b = Math.round(lightness * 255);
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q =
        lightness < 0.5
          ? lightness * (1 + saturation)
          : lightness + saturation - lightness * saturation;
      const p = 2 * lightness - q;

      r = Math.round(hue2rgb(p, q, hue + 1 / 3) * 255);
      g = Math.round(hue2rgb(p, q, hue) * 255);
      b = Math.round(hue2rgb(p, q, hue - 1 / 3) * 255);
    }
  } else {
    throw new Error('Invalid color format');
  }
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
};
//js防抖
export function debounce(fn, delay) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
