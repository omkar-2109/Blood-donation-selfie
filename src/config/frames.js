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
    aspectRatio: '1448 / 2048',
    aspectRatioValue: 1448 / 2048,
    sourceSize: { width: 1448, height: 2048 },
    hasNameArea: true,
    normalized: {
      photoArea: {
        x: 0.1575, // 228 / 1448
        y: 0.1670, // 342 / 2048
        width: 0.6865, // 994 / 1448
        height: 0.5654 // 1158 / 2048 (from y=342 to y=1500)
      },
      nameArea: {
        x: 0.1692, // 245 / 1448 (centered across the banner)
        y: 0.7400, // 1515 / 2048 -> EXACT VERTICAL CENTER OF THE PINK NAME BANNER!
        width: 0.6616, // 958 / 1448
        height: 0.0464 // 95 / 2048
      }
    },
    pixelCoords: {
      photoArea: {
        x: 228,
        y: 342,
        width: 994,
        height: 1158
      },
      nameArea: {
        x: 245,
        y: 1515,
        width: 958,
        height: 95
      }
    },
    textStyle: {
      fontFamily: "'Outfit', 'Segoe UI', sans-serif",
      fontSizeRatio: 0.030,
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
