// Regenerate the static sharing card with: node scripts/generate-social-preview.mjs
// Uses the existing landscape, fonts and content; no remote assets are requested.
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import yaml from 'js-yaml';

const root = new URL('../', import.meta.url);
const { hero: h } = JSON.parse(await readFile(new URL('src/data/terrain.json', root), 'utf8'));
const { profile } = yaml.load(await readFile(new URL('src/content/site.yaml', root), 'utf8'));
const fontDir = new URL('node_modules/@fontsource-variable/fraunces/files/', root);
const fontName = (await readdir(fontDir)).find(name => name.startsWith('fraunces-latin-') && name.endsWith('-normal.woff2'));
if (!fontName) throw new Error('Fraunces font not found; install project dependencies first.');
const font = (await readFile(new URL(fontName, fontDir))).toString('base64');
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: Fraunces; src: url(data:font/woff2;base64,${font}); font-weight: 100 900; }
    * { box-sizing: border-box; } body { margin: 0; background: #12291D; color: #F4F0E6; }
    .copy { position: absolute; z-index: 1; top: 65px; left: 64px; width: 580px; }
    h1 { margin: 0 0 28px; font: 400 92px/1.03 Fraunces, Georgia, serif; letter-spacing: -4px; }
    h1 span { display: block; color: #F0C9A4; }
    p { max-width: 450px; font: 18px/1.7 monospace; text-transform: uppercase; letter-spacing: 1px; color: #F0B98A; }
    svg { position: absolute; bottom: 0; right: 0; width: 1200px; height: 534px; }
    footer { position: absolute; bottom: 30px; left: 64px; font: 15px monospace; color: #DCE6DC; }
  </style></head><body>
    <div class="copy"><h1>${escape(profile.name.split(' ')[0])}<span>${escape(profile.name.split(' ').slice(1).join(' '))}</span></h1><p>${escape(profile.role)}</p></div>
    <svg viewBox="0 0 ${h.W} ${h.H}" aria-hidden="true">
      <defs><clipPath id="hood"><path d="${h.hood}" /></clipPath></defs>
      <path d="${h.hood}" fill="#5B7A72" />
      <g clip-path="url(#hood)"><path d="${h.snow}" fill="#EEE9DF" /><path d="${h.ribs}" fill="#4E6B66" opacity=".7" /><path d="${h.shadow}" fill="#10242C" opacity=".34" /></g>
      <path d="${h.r1}" fill="#3A5A4D" /><path d="${h.r2}" fill="#2B4A3D" />
      <path d="${h.r3}" fill="#1F3A2E" /><path d="${h.trees_far}" fill="#1F3A2E" />
      <path d="${h.ground}" fill="#12271C" /><path d="${h.trees_near}" fill="#12271C" />
    </svg><footer>joannahoang.me</footer>
  </body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: fileURLToPath(new URL('public/images/social-preview.png', root)) });
} finally { await browser.close(); }
