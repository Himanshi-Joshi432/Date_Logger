import { Image } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.8;

/**
 * Shrinks a picked photo so its longest side is at most 2000px and re-encodes it as JPEG.
 * A 12-megapixel phone photo drops from several MB to a few hundred KB, which makes
 * uploads far faster with no visible loss on a phone screen.
 * Falls back to the original file if anything goes wrong.
 */
export async function prepareImageForUpload(asset, index = 0) {
  const fallback = {
    uri: asset.uri,
    name: asset.fileName || `date-memory-${Date.now()}-${index}.jpg`,
    type: asset.mimeType || 'image/jpeg',
  };

  try {
    const { width, height } = asset;
    const context = ImageManipulator.manipulate(asset.uri);
    if (width && height && Math.max(width, height) > MAX_DIMENSION) {
      context.resize(width >= height ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION });
    }
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
    return {
      uri: saved.uri,
      name: `date-memory-${Date.now()}-${index}.jpg`,
      type: 'image/jpeg',
    };
  } catch (err) {
    console.warn('Could not resize photo, uploading the original', err);
    return fallback;
  }
}

/** Resolves true if a local image file can still be read (used when restoring a draft). */
export function imageStillExists(uri) {
  return new Promise((resolve) => {
    if (!uri) return resolve(false);
    Image.getSize(
      uri,
      () => resolve(true),
      () => resolve(false)
    );
  });
}
