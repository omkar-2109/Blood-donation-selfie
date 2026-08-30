import { ASSETS } from './assets.js';

export const FRAME_CONFIGS = [
  {
    id: 'frame-1',
    name: 'Photo Frame',
    subtitle: 'Classic Humanness Selfie Frame',
    description: 'Displays your photo inside the central Humanness Blood Drive campaign frame.',
    src: ASSETS.framePhotoOnly,
    aspectRatio: '1024 / 1536',
    aspectRatioValue: 1024 / 1536,
    sourceSize: { width: 1024, height: 1536 },
    hasNameArea: false,
    normalized: {
      photoArea: {
        x: 0.1396, // 143 / 1024
        y: 0.1667, // 256 / 1536
        width: 0.7227, // 740 / 1024
        height: 0.6263 // 962 / 1536
      }
    },
    pixelCoords: {
      photoArea: {
        x: 143,
        y: 256,
        width: 740,
        height: 962
      }
    }
  },
  {
    id: 'frame-2',
    name: 'Photo + Name Frame',
    subtitle: 'Selfie Frame with Personalized Name',
    description: 'Displays your photo in the central frame and renders your formatted name ([Name] Ji) inside the light-pink campaign banner.',
    src: ASSETS.frameWithName,
    aspectRatio: '682 / 1024',
    aspectRatioValue: 682 / 1024,
    sourceSize: { width: 682, height: 1024 },
    hasNameArea: true,
    normalized: {
      photoArea: {
        x: 0.1378, // 94 / 682
        y: 0.1670, // 171 / 1024
        width: 0.7273, // 496 / 682
        height: 0.5350 // from y=171 to y=718
      },
      nameArea: {
        x: 0.1686, // 115 / 682
        y: 0.7422, // 760 / 1024 -> EXACT VERTICAL CENTER OF THE PINK NAME BANNER!
        width: 0.6628, // 452 / 682
        height: 0.0840 // 86 / 1024
      }
    },
    pixelCoords: {
      photoArea: {
        x: 94,
        y: 171,
        width: 496,
        height: 547
      },
      nameArea: {
        x: 115,
        y: 760,
        width: 452,
        height: 86
      }
    },
    textStyle: {
      fontFamily: "'Outfit', 'Segoe UI', sans-serif",
      fontSizeRatio: 0.034,
      fontWeight: '700',
      color: '#8B0000',
      shadowColor: 'rgba(255, 255, 255, 0.7)',
      shadowBlur: 2,
      align: 'center',
      textBaseline: 'middle'
    }
  }
];

/**
 * Converts normalized frame area bounds (0.0 to 1.0) into actual pixel coordinates
 * for any rendered canvas width and height.
 */
export function getCanvasCoords(frameConfig, canvasWidth, canvasHeight) {
  const photo = frameConfig.normalized.photoArea;
  const photoArea = {
    x: Math.round(photo.x * canvasWidth),
    y: Math.round(photo.y * canvasHeight),
    width: Math.round(photo.width * canvasWidth),
    height: Math.round(photo.height * canvasHeight)
  };

  let nameArea = null;
  if (frameConfig.hasNameArea && frameConfig.normalized.nameArea) {
    const name = frameConfig.normalized.nameArea;
    nameArea = {
      x: Math.round(name.x * canvasWidth),
      y: Math.round(name.y * canvasHeight),
      width: Math.round(name.width * canvasWidth),
      height: Math.round(name.height * canvasHeight)
    };
  }

  return { photoArea, nameArea };
}

export default FRAME_CONFIGS;
