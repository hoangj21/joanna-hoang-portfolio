/**
 * Records the looped video previews for the Live & published cards.
 *
 *   npm run record              # every enabled preview
 *   npm run record -- copilot   # just the ones named
 *
 * Each preview drives the live site in Chromium at 1280×720 along a scripted path, with a
 * visible cursor, then encodes public/videos/<id>.mp4, .webm and a .jpg poster with
 * ffmpeg-static. Edit the paths in PREVIEWS below; selectors are Playwright locators.
 *
 * Steps:
 *   { pause: ms }                       hold on the current view
 *   { scroll: px }                      smooth wheel scroll (negative scrolls up)
 *   { click: selector }                 glide the cursor to the element, then click it
 *   { type: selector, text }            click into a field and type like a person
 *   { waitForGrowth: selector, chars }  wait until the element's text grows by `chars`
 *                                       (a slow reply); the wait is cut from the video
 */
import { chromium } from 'playwright';
import ffmpeg from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PREVIEWS = [
  {
    id: 'art-portfolio',
    url: 'https://www.artsfromjoanna.com/',
    enabled: true,
    steps: [
      { pause: 1000 },
      { scroll: 520 },
      { pause: 700 },
      { scroll: 700 },
      { pause: 600 },
      { scroll: -700 },
      { click: 'button:has-text("INK & TRADITIONAL")' },
      { pause: 1100 },
      { click: 'button:has-text("SEQUENTIAL ART")' },
      { pause: 1100 },
      { click: 'button:has-text("ALL")' },
      { pause: 800 },
      { click: 'a[href="/commissions"]' },
      { pause: 1300 },
    ],
  },
  {
    id: 'copilot',
    url: 'https://investment-intelligence.si',
    enabled: true,
    steps: [
      { pause: 900 },
      { click: 'a[href="/compare"]' },
      { pause: 400 },
      { click: 'button:has-text("Explain the Differences")' },
      { waitForGrowth: 'main', chars: 200 },
      { pause: 1500 },
      { click: 'a[href="/portfolio"]' },
      { pause: 800 },
      { scroll: 300 },
      { pause: 600 },
      { click: 'a[href="/copilot"]' },
      { type: 'input[placeholder="Ask an investment question"]', text: 'What are the biggest risks here?' },
      { click: 'button:text-is("Ask")' },
      { waitForGrowth: 'main', chars: 250 },
      { scroll: 400 },
      { pause: 2200 },
    ],
  },
  {
    // In preview awaiting client approval: keep the screenshot until Joanna confirms
    id: 'kgh-site',
    url: 'https://kghpreview.com',
    enabled: false,
    steps: [{ pause: 1000 }, { scroll: 900 }, { pause: 800 }, { click: 'a:has-text("Capabilities")' }, { pause: 1200 }],
  },
];

const SIZE = { width: 1280, height: 720 };
const FPS = 25;
const MAX_SECONDS = 12; // longer recordings are sped up to fit
const OUT = path.resolve('public/videos');

// A visible cursor: a dot that follows the mouse and pulses on click. It survives page
// navigations by remembering its last position.
const CURSOR = `
addEventListener('DOMContentLoaded', () => {
  const dot = document.createElement('div');
  dot.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(255,255,255,.9);border:2px solid rgba(20,20,20,.75);box-shadow:0 1px 4px rgba(0,0,0,.4);transition:transform .12s ease';
  const ring = document.createElement('div');
  ring.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:2px solid rgba(255,255,255,.85);opacity:0';
  const at = (x, y) => { for (const el of [dot, ring]) { el.style.left = x + 'px'; el.style.top = y + 'px'; } sessionStorage.cursor = x + ',' + y; };
  const [x, y] = (sessionStorage.cursor || '640,360').split(',');
  at(x, y);
  document.body.append(ring, dot);
  addEventListener('mousemove', (e) => at(e.clientX, e.clientY), true);
  addEventListener('mousedown', () => {
    dot.style.transform = 'scale(.75)';
    ring.animate([{ opacity: 1, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(1)' }], { duration: 450, easing: 'ease-out' });
  }, true);
  addEventListener('mouseup', () => (dot.style.transform = ''), true);
});`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let mouse = { x: SIZE.width / 2, y: SIZE.height / 2 };

async function glide(page, x, y) {
  const steps = Math.max(12, Math.round(Math.hypot(x - mouse.x, y - mouse.y) / 18));
  await page.mouse.move(x, y, { steps });
  mouse = { x, y };
}

async function smoothScroll(page, px) {
  const step = px > 0 ? 90 : -90;
  for (let done = 0; Math.abs(done) < Math.abs(px); done += step) {
    await page.mouse.wheel(0, step);
    await sleep(45);
  }
  await sleep(250);
}

/**
 * Wheel-scrolls until the element is comfortably on screen (clear of a sticky header),
 * then returns its center. Fixed elements, which scrolling doesn't move, are taken as is.
 */
async function bringIntoView(page, locator) {
  let lastY;
  for (let i = 0; i < 30; i++) {
    const box = await locator.boundingBox();
    if (!box) throw new Error(`not found: ${locator}`);
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    if (box.y === lastY) return center;
    lastY = box.y;
    if (box.y < 70) await smoothScroll(page, Math.max(box.y - 160, -900));
    else if (box.y + box.height > SIZE.height - 40) await smoothScroll(page, Math.min(box.y + box.height - SIZE.height + 160, 900));
    else return center;
  }
  throw new Error(`couldn't scroll to: ${locator}`);
}

async function clickLike(page, selector) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  const { x, y } = await bringIntoView(page, locator);
  await glide(page, x, y);
  await sleep(220);
  await page.mouse.down();
  await sleep(90);
  await page.mouse.up();
  await page.waitForLoadState('networkidle').catch(() => {});
  await sleep(250);
}

/**
 * Captures frames with Chromium's screencast rather than Playwright's recordVideo, which
 * shells out to an unsigned ffmpeg that Windows Smart App Control blocks. Frames arrive
 * only when the page changes; each carries a timestamp, so stills are filled in later.
 */
async function startScreencast(page) {
  const frames = [];
  const cdp = await page.context().newCDPSession(page);
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    frames.push({ t: metadata.timestamp, jpeg: Buffer.from(data, 'base64') });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: SIZE.width, maxHeight: SIZE.height });
  return { frames, stop: () => cdp.send('Page.stopScreencast').catch(() => {}) };
}

async function record(preview) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `preview-${preview.id}-`));
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: SIZE });
  await context.addInitScript(CURSOR);
  const page = await context.newPage();
  const screencast = await startScreencast(page);
  const now = () => Date.now() / 1000;
  mouse = { x: SIZE.width / 2, y: SIZE.height / 2 };
  await page.goto(preview.url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.mouse.move(mouse.x, mouse.y);
  await sleep(400);

  // Keep [start, end] spans of the recording; waits for slow replies are left out
  const keep = [[now(), null]];
  for (const step of preview.steps) {
    if (step.pause) await sleep(step.pause);
    else if (step.scroll) await smoothScroll(page, step.scroll);
    else if (step.click) await clickLike(page, step.click);
    else if (step.type) {
      await clickLike(page, step.type);
      await page.keyboard.type(step.text, { delay: 55 });
      await sleep(400);
    } else if (step.waitForGrowth) {
      const el = page.locator(step.waitForGrowth).first();
      const before = (await el.innerText()).length;
      keep.at(-1)[1] = now() + 0.6;
      await page.waitForFunction(
        ([sel, n]) => document.querySelector(sel).innerText.length >= n,
        [step.waitForGrowth, before + step.chars],
        { timeout: 60000, polling: 100 },
      );
      keep.push([now() - 0.4, null]);
    }
  }
  keep.at(-1)[1] = now();
  await screencast.stop();
  await browser.close();

  // Lay the kept spans end to end at a constant 25 fps, sped up if they run long. Each
  // output frame repeats the latest capture at or before its moment.
  const { frames } = screencast;
  const kept = keep.reduce((sum, [a, b]) => sum + (b - a), 0);
  const speed = Math.max(1, kept / MAX_SECONDS);
  let n = 0;
  for (const [a, b] of keep) {
    for (let t = a; t < b; t += speed / FPS) {
      const frame = frames.findLast((f) => f.t <= t) ?? frames[0];
      fs.writeFileSync(path.join(tmp, `${String(n++).padStart(5, '0')}.jpg`), frame.jpeg);
    }
  }

  const base = path.join(OUT, preview.id);
  const input = ['-framerate', String(FPS), '-i', path.join(tmp, '%05d.jpg')];
  const run = (args) => execFileSync(ffmpeg, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  run([...input, '-c:v', 'libx264', '-crf', '26', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', `${base}.mp4`]);
  run([...input, '-c:v', 'libvpx-vp9', '-crf', '36', '-b:v', '0', '-an', `${base}.webm`]);
  run(['-ss', '0.3', '-i', `${base}.mp4`, '-frames:v', '1', '-q:v', '3', `${base}.jpg`]);
  fs.rmSync(tmp, { recursive: true, force: true });

  const mb = (ext) => (fs.statSync(`${base}.${ext}`).size / 1e6).toFixed(2);
  console.log(`${preview.id}: ${(kept / speed).toFixed(1)}s (${speed.toFixed(2)}× speed) · mp4 ${mb('mp4')} MB · webm ${mb('webm')} MB`);
}

const only = process.argv.slice(2);
const queue = PREVIEWS.filter((p) => (only.length ? only.includes(p.id) : p.enabled));
if (!queue.length) console.log(`Nothing to record. Previews: ${PREVIEWS.map((p) => p.id).join(', ')}`);
fs.mkdirSync(OUT, { recursive: true });
for (const preview of queue) await record(preview);
