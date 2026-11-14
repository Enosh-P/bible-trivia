/** Pictures in posts are shrunk on the phone before upload, so storage lasts. */
export const MAX_SIDE = 1600;
export const TARGET_BYTES = 300 * 1024;

/** The size a picture is drawn at: longest side at most `max`, same shape, never enlarged. */
export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * The tries made to get under the target size: first lower the quality step by
 * step, then make the picture smaller as well.
 */
export function compressionSteps(max = MAX_SIDE): { max: number; quality: number }[] {
  return [
    { max, quality: 0.82 },
    { max, quality: 0.72 },
    { max, quality: 0.62 },
    { max, quality: 0.5 },
    { max: Math.round(max * 0.8), quality: 0.6 },
    { max: Math.round(max * 0.64), quality: 0.55 },
    { max: Math.round(max * 0.5), quality: 0.5 },
  ];
}

/** 'image/webp' → 'webp' (file ending for the upload). */
export function extensionFor(mime: string): string {
  return mime === 'image/webp' ? 'webp' : mime === 'image/png' ? 'png' : 'jpg';
}
