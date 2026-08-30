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
        x: 0.1416, // 145 / 1024
        y: 0.1953, // 300 / 1536
        width: 0.7178, // 735 / 1024
        height: 0.5859 // 900 / 1536
      }
    },
    pixelCoords: {
      photoArea: {
        x: 145,
        y: 300,
        width: 735,
        height: 900
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
        x: 0.1105, // 160 / 1448
        y: 0.1196, // 245 / 2048
        width: 0.7735, // 1120 / 1448
        height: 0.4346 // 890 / 2048
      },
      nameArea: {
        x: 0.1830, // 265 / 1448
        y: 0.5029, // 1030 / 2048 -> Places text precisely inside the pink banner box at Y=1030px!
        width: 0.6215, // 900 / 1448
        height: 0.0562 // 115 / 2048
      }
    },
    pixelCoords: {
      photoArea: {
        x: 160,
        y: 245,
        width: 1120,
        height: 890
      },
      nameArea: {
        x: 265,
        y: 1030,
        width: 900,
        height: 115
      }
    },
    textStyle: {
      fontFamily: "'Outfit', 'Segoe UI', sans-serif",
      fontSizeRatio: 0.034,
      fontWeight: '700',
      color: '#8B0000',
      shadowColor: 'rgba(255, 255, 255, 0.8)',
      shadowBlur: 3,
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
