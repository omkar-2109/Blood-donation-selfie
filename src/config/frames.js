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
        x: 0.1367, // 140 / 1024
        y: 0.1660, // 255 / 1536
        width: 0.7275, // 745 / 1024
        height: 0.6289 // 966 / 1536
      }
    },
    pixelCoords: {
      photoArea: {
        x: 140,
        y: 255,
        width: 745,
        height: 966
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
        y: 0.1660, // 170 / 1024
        width: 0.7243, // 494 / 682
        height: 0.5361 // 549 / 1024 (from y=170 to y=719)
      },
      nameArea: {
        x: 0.1452, // 99 / 682
        y: 0.7021, // 719 / 1024 -> TOP OF THE PINK NAME BANNER
        width: 0.7111, // 485 / 682
        height: 0.0879 // 90 / 1024 -> HEIGHT OF PINK BANNER (center at y=0.7461 / 764px)
      }
    },
    pixelCoords: {
      photoArea: {
        x: 94,
        y: 170,
        width: 494,
        height: 549
      },
      nameArea: {
        x: 99,
        y: 719,
        width: 485,
        height: 90
      }
    },
    textStyle: {
      fontFamily: "'Outfit', 'Segoe UI', sans-serif",
      fontSizeRatio: 0.033,
      fontWeight: '700',
      color: '#8B0000',
      shadowColor: 'rgba(255, 255, 255, 0.8)',
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
