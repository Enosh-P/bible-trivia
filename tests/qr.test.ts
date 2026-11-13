import { describe, expect, it } from 'vitest';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { inviteFromText } from '../src/online/account';

/** Draws a QR code into RGBA pixels, the way a camera frame arrives. */
function render(text: string, scale = 6, margin = 4) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const size = (n + margin * 2) * scale;
  const px = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (qr.modules.get(y, x))
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++) {
            const i = (((y + margin) * scale + dy) * size + (x + margin) * scale + dx) * 4;
            px[i] = px[i + 1] = px[i + 2] = 0;
          }
  return { px, size };
}

describe('friends by QR code', () => {
  it('a code made by the app is read back by the scanner', () => {
    const url = 'https://bible-trivia.pages.dev/?invite=3f2a9c0d4b7e4a1f8c6d2e9b0a7f5c3d';
    const { px, size } = render(url);
    const read = jsQR(px, size, size)?.data;
    expect(read).toBe(url);
    expect(inviteFromText(read!)).toBe('3f2a9c0d4b7e4a1f8c6d2e9b0a7f5c3d');
  });
  it('ignores codes that are not friend invites', () => {
    expect(inviteFromText('https://example.com/')).toBeNull();
    expect(inviteFromText('hello')).toBeNull();
    expect(inviteFromText('https://x.dev/?invite=<script>')).toBeNull();
  });
});
