// Renders public/favicon.svg to the PNG icons the PWA manifest and iOS need.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Uses a project-local Playwright if installed, otherwise a global one.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const targets = [
  { file: 'pwa-192.png', size: 192, pad: 0, radius: true },
  { file: 'pwa-512.png', size: 512, pad: 0, radius: true },
  { file: 'apple-touch-icon.png', size: 180, pad: 0, radius: false },
  { file: 'pwa-maskable-512.png', size: 512, pad: 0.1, radius: false },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  // Maskable and Apple icons must be full-bleed squares (the OS rounds the corners).
  const body = t.radius ? svg : svg.replace('rx="112"', 'rx="0"');
  const inner = t.size * (1 - t.pad * 2);
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;background:#1f8fb0;display:grid;place-items:center;width:${t.size}px;height:${t.size}px">
      <div style="width:${inner}px;height:${inner}px">${body.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
    </body></html>`,
  );
  await page.screenshot({ path: new URL(`../public/${t.file}`, import.meta.url).pathname, omitBackground: t.radius });
  console.log('wrote', t.file);
}
await browser.close();
