// Renders the cover's engine poster: the image shown before the 3D model loads, without
// JavaScript, and where WebGL is unavailable. It is the real scene's first frame, cropped to the
// framed extents, so the crossfade to the live canvas does not jump.
//
// Run by hand after changing the model, with the dev server up (`npm run dev`):
//   npm run poster                 (POSTER_ORIGIN overrides http://localhost:5173)
//
// Drives the installed Chrome headless over the DevTools protocol (no dependencies) and writes
// src/assets/model/engine-poster-{1x,2x}.webp with a transparent background, and poster.json
// (the 1x size, for the <img> width and height).
// CHROME_PATH overrides the browser executable.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src', 'assets', 'model');
const origin = process.env.POSTER_ORIGIN ?? 'http://localhost:5173';
/** CSS width of the engine's framed extents; the 2x image doubles it. */
const WIDTH = 900;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function launch() {
  const executable = CHROME_CANDIDATES.find((c) => existsSync(c));
  if (!executable) throw new Error('no Chrome found; set CHROME_PATH');
  const profile = await mkdtemp(path.join(os.tmpdir(), 'engine-poster-'));
  const child = spawn(executable, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--hide-scrollbars',
    '--enable-unsafe-swiftshader',
    'about:blank',
  ]);
  const wsUrl = await new Promise((resolve, reject) => {
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) resolve(match[1]);
    });
    child.on('exit', (code) => reject(new Error(`Chrome exited (${code}):\n${stderr}`)));
  });
  return { child, profile, wsUrl };
}

async function connect(browserWs) {
  const ws = new WebSocket(browserWs);
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params, sessionId }));
    });
  return { ws, send };
}

const { child, profile, wsUrl } = await launch();
try {
  const { ws, send } = await connect(wsUrl);
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => send(method, params, sessionId);
  await page('Page.enable');
  await page('Runtime.enable');
  await page('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await mkdir(outDir, { recursive: true });
  let size = null;

  for (const scale of [1, 2]) {
    await page('Emulation.setDeviceMetricsOverride', {
      width: WIDTH + 100,
      height: Math.round(WIDTH * 1.5),
      deviceScaleFactor: scale,
      mobile: false,
    });
    await page('Page.navigate', { url: `${origin}/scripts/engine-poster.html?width=${WIDTH}` });
    let box = null;
    for (let i = 0; i < 300 && !box; i++) {
      await sleep(100);
      const { result } = await page('Runtime.evaluate', { expression: 'JSON.stringify(window.__poster ?? null)', returnByValue: true });
      box = JSON.parse(result.value);
    }
    if (!box) throw new Error(`the poster page did not finish; is the dev server up at ${origin}?`);
    const { data } = await page('Page.captureScreenshot', {
      format: 'webp',
      quality: 80,
      clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 },
    });
    if (scale === 1) size = { width: Math.round(box.width), height: Math.round(box.height) };
    const file = path.join(outDir, `engine-poster-${scale}x.webp`);
    await writeFile(file, Buffer.from(data, 'base64'));
    console.log(`${path.relative(root, file)}  ${Math.round(box.width * scale)}x${Math.round(box.height * scale)}  ${Math.round(Buffer.from(data, 'base64').length / 1024)} kB`);
  }
  await writeFile(path.join(outDir, 'poster.json'), `${JSON.stringify(size)}
`);
  ws.close();
} finally {
  child.kill();
  await sleep(300);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
