export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export async function detectTransparentWindow(src) {
  const image = await loadImage(src);
  const scale = Math.min(1, 900 / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  const visited = new Uint8Array(width * height);
  const threshold = 12;

  let best = null;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (visited[index]) {
        continue;
      }
      const alpha = data[index * 4 + 3];
      if (alpha > threshold) {
        visited[index] = 1;
        continue;
      }

      const queue = [index];
      visited[index] = 1;
      let head = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      let area = 0;
      let touchesEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;

      while (head < queue.length) {
        const current = queue[head];
        head += 1;
        const currentY = Math.floor(current / width);
        const currentX = current % width;
        area += 1;
        minX = Math.min(minX, currentX);
        minY = Math.min(minY, currentY);
        maxX = Math.max(maxX, currentX);
        maxY = Math.max(maxY, currentY);
        if (currentX === 0 || currentY === 0 || currentX === width - 1 || currentY === height - 1) {
          touchesEdge = true;
        }

        const neighbors = [
          current - 1,
          current + 1,
          current - width,
          current + width,
          current - width - 1,
          current - width + 1,
          current + width - 1,
          current + width + 1
        ];

        for (const neighbor of neighbors) {
          if (neighbor < 0 || neighbor >= visited.length || visited[neighbor]) {
            continue;
          }
          const neighborY = Math.floor(neighbor / width);
          const neighborX = neighbor % width;
          const neighborAlpha = data[neighbor * 4 + 3];
          visited[neighbor] = 1;
          if (neighborAlpha <= threshold) {
            queue.push(neighbor);
          }
          if (neighborX === 0 || neighborY === 0 || neighborX === width - 1 || neighborY === height - 1) {
            touchesEdge = true;
          }
        }
      }

      if (!touchesEdge && area > 500) {
        if (!best || area > best.area) {
          best = {
            area,
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
          };
        }
      }
    }
  }

  if (!best) {
    return null;
  }

  const pad = 0.02;
  const paddedX = clamp(best.x - best.width * pad, 0, width - 1);
  const paddedY = clamp(best.y - best.height * pad, 0, height - 1);
  const paddedWidth = clamp(best.width * (1 + pad * 2), 1, width - paddedX);
  const paddedHeight = clamp(best.height * (1 + pad * 2), 1, height - paddedY);

  return {
    x: paddedX / scale,
    y: paddedY / scale,
    width: paddedWidth / scale,
    height: paddedHeight / scale,
    scaledWidth: width / scale,
    scaledHeight: height / scale
  };
}

export function clampEditorOffsets({ offsetX, offsetY, imageWidth, imageHeight, containerWidth, containerHeight, zoom }) {
  const baseScale = Math.max(containerWidth / imageWidth, containerHeight / imageHeight);
  const renderedWidth = imageWidth * baseScale * zoom;
  const renderedHeight = imageHeight * baseScale * zoom;
  const maxOffsetX = Math.max(0, (renderedWidth - containerWidth) / 2);
  const maxOffsetY = Math.max(0, (renderedHeight - containerHeight) / 2);
  return {
    offsetX: clamp(offsetX, -maxOffsetX, maxOffsetX),
    offsetY: clamp(offsetY, -maxOffsetY, maxOffsetY)
  };
}

export async function renderSelfieCanvas({ source, imageWidth, imageHeight, offsetX, offsetY, zoom, mirror, width, height }) {
  const image = await loadImage(source);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const baseScale = Math.max(width / imageWidth, height / imageHeight);
  const renderedWidth = imageWidth * baseScale * zoom;
  const renderedHeight = imageHeight * baseScale * zoom;
  const centerX = width / 2 + offsetX;
  const centerY = height / 2 + offsetY;
  const left = centerX - renderedWidth / 2;
  const top = centerY - renderedHeight / 2;

  ctx.save();
  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(image, width - left - renderedWidth, top, renderedWidth, renderedHeight);
  } else {
    ctx.drawImage(image, left, top, renderedWidth, renderedHeight);
  }
  ctx.restore();

  return canvas;
}

export async function renderFramedImage({
  selfieSource,
  selfieSize,
  editor,
  frameSource,
  frameRect,
  outputLongEdge = 2200
}) {
  const frameImage = await loadImage(frameSource);
  const scale = outputLongEdge / Math.max(frameImage.width, frameImage.height);
  const outputWidth = Math.round(frameImage.width * scale);
  const outputHeight = Math.round(frameImage.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');

  const selfieCanvas = await renderSelfieCanvas({
    source: selfieSource,
    imageWidth: selfieSize.width,
    imageHeight: selfieSize.height,
    offsetX: editor.offsetX * (Math.round(frameRect.width * scale) / Math.max(1, editor.viewportWidth || 1)),
    offsetY: editor.offsetY * (Math.round(frameRect.height * scale) / Math.max(1, editor.viewportHeight || 1)),
    zoom: editor.zoom,
    mirror: editor.mirror,
    width: Math.round(frameRect.width * scale),
    height: Math.round(frameRect.height * scale)
  });

  ctx.drawImage(
    selfieCanvas,
    Math.round(frameRect.x * scale),
    Math.round(frameRect.y * scale)
  );
  ctx.drawImage(frameImage, 0, 0, outputWidth, outputHeight);

  return canvas;
}
