import { getCanvasCoords } from '../config/frames.js';

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image at ${src}`));
    img.src = src;
  });
}

/**
 * Calculates scale and position for fitting user image into photo window
 */
export function clampOffsets({ offsetX, offsetY, imageWidth, imageHeight, containerWidth, containerHeight, zoom }) {
  const minScale = Math.max(containerWidth / imageWidth, containerHeight / imageHeight);
  const effectiveWidth = imageWidth * minScale * zoom;
  const effectiveHeight = imageHeight * minScale * zoom;

  const maxOffsetX = Math.max(0, (effectiveWidth - containerWidth) / 2);
  const maxOffsetY = Math.max(0, (effectiveHeight - containerHeight) / 2);

  return {
    offsetX: Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX)),
    offsetY: Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY))
  };
}

/**
 * Main rendering engine for composing the framed selfie canvas
 */
export async function renderFramedSelfie({
  selfieSrc,
  selfieSize,
  editorState,
  frameConfig,
  formattedName = '',
  targetWidth = 1448
}) {
  if (!selfieSrc || !frameConfig) {
    throw new Error('Selfie source and Frame configuration are required.');
  }

  // Load frame image
  const frameImg = await loadImage(frameConfig.src);
  const frameWidth = frameImg.width || frameConfig.sourceSize.width;
  const frameHeight = frameImg.height || frameConfig.sourceSize.height;

  // Scale target canvas proportionally
  const outputScale = targetWidth / frameWidth;
  const outputWidth = Math.round(targetWidth);
  const outputHeight = Math.round(frameHeight * outputScale);

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d', { alpha: true });

  // Clear canvas
  ctx.clearRect(0, 0, outputWidth, outputHeight);

  // Get dynamic canvas pixel coordinates for photo and name areas
  const { photoArea, nameArea } = getCanvasCoords(frameConfig, outputWidth, outputHeight);

  // Load user selfie image
  const selfieImg = await loadImage(selfieSrc);
  const origSelfieWidth = selfieImg.width || selfieSize?.width || 800;
  const origSelfieHeight = selfieImg.height || selfieSize?.height || 800;

  // Render Layer 1: User Photo clipped to photoArea
  ctx.save();
  ctx.beginPath();
  ctx.rect(photoArea.x, photoArea.y, photoArea.width, photoArea.height);
  ctx.clip();

  // Background fill inside photo area (soft dark warm backdrop)
  ctx.fillStyle = '#1A1818';
  ctx.fillRect(photoArea.x, photoArea.y, photoArea.width, photoArea.height);

  // Calculate base scale to fill photoArea
  const coverScale = Math.max(photoArea.width / origSelfieWidth, photoArea.height / origSelfieHeight);
  const zoom = editorState.zoom || 1;
  const renderedWidth = origSelfieWidth * coverScale * zoom;
  const renderedHeight = origSelfieHeight * coverScale * zoom;

  // Base scale ratio from interactive cutout in DOM to high-res canvas cutout
  const cutoutWidth = photoArea.width;
  const domCutoutWidth = editorState.cutoutWidthPx || (editorState.viewportWidth ? editorState.viewportWidth * (frameConfig.normalized?.photoArea?.width || 0.72) : 280);
  const scaleRatio = cutoutWidth / Math.max(1, domCutoutWidth);
  const adjustedOffsetX = (editorState.offsetX || 0) * scaleRatio;
  const adjustedOffsetY = (editorState.offsetY || 0) * scaleRatio;

  const photoCenterX = photoArea.x + photoArea.width / 2 + adjustedOffsetX;
  const photoCenterY = photoArea.y + photoArea.height / 2 + adjustedOffsetY;

  ctx.translate(photoCenterX, photoCenterY);

  if (editorState.rotationDeg) {
    ctx.rotate((editorState.rotationDeg * Math.PI) / 180);
  }

  if (editorState.mirror) {
    ctx.scale(-1, 1);
  }

  ctx.drawImage(
    selfieImg,
    -renderedWidth / 2,
    -renderedHeight / 2,
    renderedWidth,
    renderedHeight
  );

  ctx.restore();

  // Render Layer 2: Frame Overlay
  ctx.drawImage(frameImg, 0, 0, outputWidth, outputHeight);

  // Render Layer 3: Formatted Name (Frame 2)
  if (frameConfig.hasNameArea && nameArea && formattedName) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(nameArea.x, nameArea.y, nameArea.width, nameArea.height);
    ctx.clip();

    const textStyle = frameConfig.textStyle || {};
    let fontSize = Math.round(outputHeight * (textStyle.fontSizeRatio || 0.038));
    const fontFamily = textStyle.fontFamily || "'Outfit', sans-serif";
    const color = textStyle.color || '#8B0000';

    ctx.font = `${textStyle.fontWeight || 'bold'} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = textStyle.align || 'center';
    ctx.textBaseline = textStyle.textBaseline || 'middle';

    // Auto-fit long names by decreasing font size if text exceeds box width
    const maxWidth = nameArea.width * 0.9;
    let textWidth = ctx.measureText(formattedName).width;
    while (textWidth > maxWidth && fontSize > 14) {
      fontSize -= 2;
      ctx.font = `${textStyle.fontWeight || 'bold'} ${fontSize}px ${fontFamily}`;
      textWidth = ctx.measureText(formattedName).width;
    }

    const centerX = nameArea.x + nameArea.width / 2;
    const centerY = nameArea.y + nameArea.height / 2;

    // Optional text shadow/glow for maximum contrast
    if (textStyle.shadowColor) {
      ctx.shadowColor = textStyle.shadowColor;
      ctx.shadowBlur = textStyle.shadowBlur || 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;
    }

    ctx.fillStyle = color;
    ctx.fillText(formattedName, centerX, centerY);
    ctx.restore();
  }

  return canvas;
}

/**
 * Converts canvas to Blob helper
 */
export function canvasToBlob(canvas, mimeType = 'image/png', quality = 0.95) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas export failed.'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}
