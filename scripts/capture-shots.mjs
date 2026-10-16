// Captures the project screenshots shown in the dashboard galleries, from the live sites.
// Run by hand with `npm run shots`; it is deliberately not part of `npm run build`, because the
// sites change and a refresh should be looked at before it ships.
//
// Drives the installed Chrome headless over the DevTools protocol (no dependencies). Read-only:
// it navigates and scrolls; it never clicks, types, submits or accepts anything.
// Cookie banners and chat widgets are removed from the DOM before each capture.
//
//   node scripts/capture-shots.mjs                  capture everything
//   node scripts/capture-shots.mjs sneakerhead      only shots whose name contains the filter
//
// Writes src/assets/shots/<site>-<page>-{desktop,phone,thumb}.webp and manifest.json, an array of
// entries read by src/assets/shots.ts (merged, so a filtered run keeps the other entries). `site`
// is the role id in src/data/resume.ts and `page` the slide's page. Captures from an earlier run
// that no SHOTS entry produces any more are deleted, since the dashboard globs the folder; a WebP
// the manifest has never listed is reported and kept.
// CHROME_PATH overrides the browser executable.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src', 'assets', 'shots');
const manifestPath = path.join(outDir, 'manifest.json');

const SHOTS = [
  // Provenance's public ordination signup: the native intake flow. The frame shows the app's
  // own address (address) instead of wherever the page redirects.
  {
    site: 'provenance',
    page: 'signup',
    label: 'Signup, step 1 of 7',
    url: 'https://app.provenance.co/signup-step1',
    address: 'app.provenance.co',
  },
  { site: 'codriverhq', page: 'home', label: 'Home', url: 'https://codriverhq.com/' },
  { site: 'codriverhq', page: 'how-it-works', label: 'How it works', url: 'https://codriverhq.com/how' },
  // "Find My Car" (/signup) redirects signed-out visitors here; the buyer intake needs an account.
  { site: 'codriverhq', page: 'pricing', label: 'Pricing', url: 'https://codriverhq.com/pricing' },
  { site: 'sneakerhead', page: 'home', label: 'Home', url: 'https://sneakerheadmelrose.com/' },
  { site: 'sneakerhead', page: 'catalog', label: 'Shoe catalog with filters', url: 'https://sneakerheadmelrose.com/catalog' },
  {
    site: 'sneakerhead',
    page: 'product',
    label: 'Product detail',
    url: 'https://sneakerheadmelrose.com/catalog/jordan-1-high-off-white-unc-sz-12',
  },
];

// Screens of internal tools that cannot be captured from outside: supplied as screenshots, with
// every customer's details redacted by hand before they were added. The script never captures,
// overwrites or deletes these files, and keeps their manifest entries as they are.
const MANUAL = ['provenance-ordination-panel', 'provenance-checklist'];

// Per-site elements to remove besides the generic lists below.
const SITE_HIDE = {
  codriverhq: [],
  sneakerhead: [],
  // A site-wide announcement bar, and a testimonial card that quotes customers by name.
  provenance: ['.fixed.inset-x-0.top-0', '.QuoteCard'],
};

// Per-site CSS applied with the removals, for layout that made room for a removed element.
const SITE_CSS = {
  provenance: ':root, .root-content { --rebrand-banner-height: 0px !important; }',
};

// Common consent managers and chat launchers.
const GENERIC_HIDE = [
  '#onetrust-consent-sdk',
  '#CybotCookiebotDialog',
  '#usercentrics-root',
  '#qc-cmp2-container',
  '.cc-window',
  '.cky-consent-container',
  '.osano-cm-window',
  '#cookie-law-info-bar',
  '#intercom-container',
  '.intercom-lightweight-app',
  '#hubspot-messages-iframe-container',
  '.crisp-client',
  '#drift-widget-container',
  '#drift-frame-controller',
  '[id^="tawk-"]',
  'iframe#launcher',
  '#chat-widget-container',
  '#fc_frame',
  'iframe[src*="messenger.dixa.io"]',
];

const DEVICES = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, quality: 82 },
  phone: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, quality: 80 },
};
const THUMB_WIDTH = 480;
const THUMB_QUALITY = 80;
const PHONE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{v} Mobile Safari/537.36';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const shotName = (shot) => `${shot.site}-${shot.page}`;

// ---- DevTools protocol over the browser endpoint, with flattened target sessions ----

class Cdp {
  #ws;
  #nextId = 0;
  #pending = new Map();
  #listeners = new Set();

  static async connect(url) {
    const cdp = new Cdp();
    cdp.#ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      cdp.#ws.addEventListener('open', resolve, { once: true });
      cdp.#ws.addEventListener('error', () => reject(new Error(`cannot connect to ${url}`)), { once: true });
    });
    cdp.#ws.addEventListener('message', (event) => cdp.#receive(JSON.parse(event.data)));
    cdp.#ws.addEventListener('close', () => {
      for (const { reject } of cdp.#pending.values()) reject(new Error('DevTools connection closed'));
      cdp.#pending.clear();
    });
    return cdp;
  }

  #receive(message) {
    if (message.id === undefined) {
      for (const listener of this.#listeners) listener(message);
      return;
    }
    const call = this.#pending.get(message.id);
    if (!call) return;
    this.#pending.delete(message.id);
    clearTimeout(call.timer);
    if (message.error) call.reject(new Error(`${call.method}: ${message.error.message}`));
    else call.resolve(message.result);
  }

  send(method, params = {}, sessionId, timeout = 30_000) {
    const id = ++this.#nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`${method}: no reply in ${timeout} ms`));
      }, timeout);
      this.#pending.set(id, { method, resolve, reject, timer });
      this.#ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  listen(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  close() {
    this.#ws?.close();
  }
}

// One tab in its own browser context (fresh cookies and storage), emulating one device.
class Tab {
  #inflight = new Map();
  #waiters = new Set();
  #unlisten;
  documentStatus = 0;

  constructor(cdp, sessionId, targetId) {
    this.cdp = cdp;
    this.sessionId = sessionId;
    this.targetId = targetId;
    this.#unlisten = cdp.listen((message) => {
      if (message.sessionId === sessionId) this.#onEvent(message.method, message.params);
    });
  }

  static async open(cdp, browserContextId) {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const tab = new Tab(cdp, sessionId, targetId);
    await Promise.all([tab.send('Page.enable'), tab.send('Network.enable')]);
    return tab;
  }

  send(method, params, timeout) {
    return this.cdp.send(method, params, this.sessionId, timeout);
  }

  #onEvent(method, params) {
    if (method === 'Network.requestWillBeSent') {
      if (!['WebSocket', 'EventSource'].includes(params.type)) this.#inflight.set(params.requestId, Date.now());
    } else if (method === 'Network.loadingFinished' || method === 'Network.loadingFailed') {
      this.#inflight.delete(params.requestId);
    } else if (method === 'Network.responseReceived' && params.type === 'Document' && params.frameId === this.targetId) {
      this.documentStatus = params.response.status;
    } else if (method === 'Page.javascriptDialogOpening') {
      this.send('Page.handleJavaScriptDialog', { accept: false }).catch(() => {});
    }
    for (const waiter of this.#waiters) if (waiter.method === method) waiter.resolve(params);
  }

  waitForEvent(method, timeout) {
    let waiter;
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${method}: not fired in ${timeout} ms`)), timeout);
      waiter = { method, resolve: (params) => (clearTimeout(timer), resolve(params)) };
      this.#waiters.add(waiter);
    });
    return promise.finally(() => this.#waiters.delete(waiter));
  }

  async goto(url) {
    this.documentStatus = 0;
    const loaded = this.waitForEvent('Page.loadEventFired', 45_000);
    const { errorText } = await this.send('Page.navigate', { url });
    if (errorText) throw new Error(`navigating to ${url}: ${errorText}`);
    await loaded.catch(() => console.warn(`  ! ${url}: no load event after 45 s, continuing`));
    if (this.documentStatus >= 400) throw new Error(`${url} answered HTTP ${this.documentStatus}`);
  }

  // Resolves once no request has been in flight for `idle` ms. Requests open longer than 10 s
  // (long polls, streams) are ignored.
  async networkQuiet(idle = 700, timeout = 20_000) {
    const deadline = Date.now() + timeout;
    let quietSince = Date.now();
    while (Date.now() < deadline) {
      const now = Date.now();
      const busy = [...this.#inflight.values()].some((started) => now - started < 10_000);
      if (busy) quietSince = now;
      else if (now - quietSince >= idle) return true;
      await sleep(100);
    }
    return false;
  }

  async evaluate(fn, ...args) {
    const expression = `(${fn})(...${JSON.stringify(args)})`;
    const { result, exceptionDetails } = await this.send(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true },
      90_000,
    );
    if (exceptionDetails) throw new Error(`in page: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
    return result.value;
  }

  async screenshot(quality, clip) {
    const { data } = await this.send('Page.captureScreenshot', {
      format: 'webp',
      quality,
      captureBeyondViewport: false,
      ...(clip && { clip }),
    });
    return Buffer.from(data, 'base64');
  }

  close() {
    this.#unlisten();
  }
}

// ---- Functions evaluated inside the page (serialized, so they must be self-contained) ----

function scrollThrough() {
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  return (async () => {
    const step = Math.max(200, Math.round(innerHeight * 0.75));
    for (let i = 0; i < 60; i++) {
      const before = scrollY;
      scrollTo({ top: before + step, behavior: 'instant' });
      await pause(220);
      if (scrollY === before) break;
    }
    await pause(500);
    scrollTo({ top: 0, behavior: 'instant' });
    await pause(300);
    return scrollY;
  })();
}

// Waits for fonts and for every rendered <img> to finish, decodes the ones in view, and returns how
// many in-view images are still incomplete.
function imagesReady(timeout) {
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const rendered = (el) => el.getClientRects().length > 0;
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  };
  return (async () => {
    const deadline = Date.now() + timeout;
    await Promise.race([document.fonts?.ready, pause(5000)]);
    const pending = () => [...document.images].filter((img) => !img.complete && rendered(img));
    while (pending().length && Date.now() < deadline) await pause(150);
    await Promise.all([...document.images].filter(inView).map((img) => img.decode().catch(() => {})));
    return pending().filter(inView).length;
  })();
}

// Waits for loading skeletons in view to go away; returns how many are left.
function skeletonsGone(timeout) {
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const pattern = /(^|[\s_-])(skeleton|shimmer|animate-pulse)/i;
  const visible = () =>
    [...document.querySelectorAll('body *')].filter((el) => {
      const cls = typeof el.className === 'string' ? el.className : el.getAttribute('class') ?? '';
      if (!pattern.test(cls) && el.getAttribute('aria-busy') !== 'true') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
    }).length;
  return (async () => {
    const deadline = Date.now() + timeout;
    while (visible() && Date.now() < deadline) await pause(200);
    return visible();
  })();
}

// Removes consent banners and chat widgets: the given selectors (also hidden by a style rule, in
// case a script re-inserts them), plus any fixed or sticky wide bar along the bottom of the
// viewport that talks about cookies or consent. Returns a description of what it removed.
function removeOverlays({ selectors, css }) {
  const removed = [];
  const describe = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls ? `.${cls}` : ''}`;
  };
  const valid = selectors.filter((selector) => {
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  });
  if (valid.length && !document.getElementById('capture-shots-hide')) {
    const style = document.createElement('style');
    style.id = 'capture-shots-hide';
    style.textContent = `${valid.join(',\n')} { display: none !important; }\n${css}`;
    document.head.append(style);
  }
  for (const el of valid.length ? document.querySelectorAll(valid.join(',')) : []) {
    if (!el.isConnected) continue;
    removed.push(describe(el));
    el.remove();
  }
  const consent = /\bcookies?\b|consent|gdpr/i;
  for (const el of document.querySelectorAll('body *')) {
    if (!el.isConnected) continue;
    const { position } = getComputedStyle(el);
    if (position !== 'fixed' && position !== 'sticky') continue;
    const r = el.getBoundingClientRect();
    const bottomBar = r.bottom >= innerHeight - 48 && r.top > innerHeight * 0.25 && r.width >= innerWidth * 0.5;
    if (bottomBar && consent.test(el.textContent ?? '')) {
      removed.push(`${describe(el)} (bottom-banner heuristic)`);
      el.remove();
    }
  }
  return removed;
}

// ---- Capture ----

async function captureShot(cdp, browserVersion, shot, deviceName) {
  const device = DEVICES[deviceName];
  const { browserContextId } = await cdp.send('Target.createBrowserContext', { disposeOnDetach: true });
  let tab;
  try {
    tab = await Tab.open(cdp, browserContextId);
    const { width, height, deviceScaleFactor, mobile } = device;
    await tab.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile,
      screenWidth: width,
      screenHeight: height,
    });
    await tab.send('Emulation.setScrollbarsHidden', { hidden: true });
    await tab.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    if (mobile) await tab.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const userAgent = mobile
      ? PHONE_UA.replace('{v}', browserVersion.product.split('/')[1])
      : browserVersion.userAgent.replace('HeadlessChrome', 'Chrome');
    await tab.send('Emulation.setUserAgentOverride', {
      userAgent,
      acceptLanguage: 'en-US,en',
      platform: mobile ? 'Linux armv8l' : 'Win32',
    });

    await tab.goto(shot.url);
    await tab.networkQuiet();
    await tab.evaluate(scrollThrough);
    await tab.networkQuiet();
    const warnings = [];
    const images = await tab.evaluate(imagesReady, 20_000);
    if (images) warnings.push(`${images} image(s) in view never finished loading`);
    const skeletons = await tab.evaluate(skeletonsGone, 10_000);
    if (skeletons) warnings.push(`${skeletons} loading skeleton(s) still in view`);

    const selectors = [...GENERIC_HIDE, ...(SITE_HIDE[shot.site] ?? [])];
    const hide = { selectors, css: SITE_CSS[shot.site] ?? '' };
    const removed = await tab.evaluate(removeOverlays, hide);
    // Let entrance animations settle and late widgets arrive, then sweep again.
    await sleep(1500);
    removed.push(...(await tab.evaluate(removeOverlays, hide)));
    await tab.networkQuiet(500, 8_000);
    await sleep(300);

    const finalUrl = await tab.evaluate(() => location.href);
    const shots = [{ device: deviceName, data: await tab.screenshot(device.quality) }];
    if (deviceName === 'desktop') {
      const { cssVisualViewport: vp } = await tab.send('Page.getLayoutMetrics');
      const clip = { x: vp.pageX, y: vp.pageY, width, height, scale: THUMB_WIDTH / width };
      shots.push({ device: 'thumb', data: await tab.screenshot(THUMB_QUALITY, clip) });
    }
    return { finalUrl, shots, removed, warnings };
  } finally {
    tab?.close();
    await cdp.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  }
}

// Width and height from a WebP header (lossy, lossless or extended).
function webpSize(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') throw new Error('not a WebP file');
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  throw new Error(`unknown WebP chunk ${chunk}`);
}

// ---- Browser lifecycle ----

async function readManifest() {
  if (!existsSync(manifestPath)) return [];
  const where = path.relative(root, manifestPath);
  let parsed;
  try {
    parsed = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`${where} is not valid JSON (${error.message}); fix it before capturing`);
  }
  if (!Array.isArray(parsed)) throw new Error(`${where} must be an array of entries`);
  return parsed;
}

function findChrome() {
  const found = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('no Chrome or Edge found; set CHROME_PATH');
  return found;
}

async function launchChrome(executable, profileDir) {
  const child = spawn(
    executable,
    [
      '--headless',
      '--remote-debugging-port=0',
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--hide-scrollbars',
      '--mute-audio',
      '--force-color-profile=srgb',
      '--lang=en-US',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  const wsUrl = await new Promise((resolve, reject) => {
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Chrome did not start:\n${stderr}`));
    }, 30_000);
    const onData = (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        child.stderr.off('data', onData);
        resolve(match[1]);
      }
    };
    child.stderr.on('data', onData);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited with code ${code}:\n${stderr}`));
    });
  });
  child.stderr.resume();
  return { child, wsUrl };
}

async function stopChrome(child, cdp) {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  await cdp?.send('Browser.close', {}, undefined, 5_000).catch(() => {});
  cdp?.close();
  const closed = await Promise.race([exited.then(() => true), sleep(5_000).then(() => false)]);
  if (closed) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGKILL');
  await Promise.race([exited, sleep(3_000)]);
}

// ---- Main ----

const filter = process.argv[2] ?? '';
// Read the manifest before capturing anything: if it cannot be read, rewriting it would drop
// every entry this run does not capture, the hand-supplied ones included.
const previous = await readManifest();
for (const name of MANUAL)
  if (!previous.some((entry) => entry.file === `${name}-desktop.webp`))
    console.warn(`! MANUAL ${name} has no manifest entry, so its gallery slide will not show`);
const selected = SHOTS.filter((shot) => shotName(shot).includes(filter));
if (!selected.length) {
  console.error(`no shots match "${filter}"; names: ${SHOTS.map(shotName).join(', ')}`);
  process.exit(1);
}

const executable = findChrome();
const profileDir = await mkdtemp(path.join(os.tmpdir(), 'capture-shots-'));
let chrome;
let cdp;
let cleaning;
const cleanup = () =>
  (cleaning ??= (async () => {
    await stopChrome(chrome, cdp);
    await rm(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }).catch((error) =>
      console.warn(`could not delete ${profileDir}: ${error.message}`),
    );
  })());
process.once('SIGINT', () => cleanup().finally(() => process.exit(130)));

const captured = new Map();
const failures = [];
try {
  const launched = await launchChrome(executable, profileDir);
  chrome = launched.child;
  cdp = await Cdp.connect(launched.wsUrl);
  const browserVersion = await cdp.send('Browser.getVersion');
  console.log(`${browserVersion.product} (${executable})`);
  await mkdir(outDir, { recursive: true });

  for (const shot of selected) {
    for (const deviceName of Object.keys(DEVICES)) {
      const name = `${shotName(shot)}-${deviceName}`;
      const started = Date.now();
      try {
        const result = await captureShot(cdp, browserVersion, shot, deviceName);
        const today = new Date().toISOString().slice(0, 10);
        for (const { device, data } of result.shots) {
          const file = `${shotName(shot)}-${device}.webp`;
          await writeFile(path.join(outDir, file), data);
          const { width, height } = webpSize(data);
          captured.set(file, {
            file,
            site: shot.site,
            page: shot.page,
            label: shot.label,
            device,
            width,
            height,
            bytes: data.length,
            // With an address set, the page's own URL is the one on record, not a redirect's.
            url: shot.address ? shot.url : result.finalUrl,
            ...(shot.address && { address: shot.address }),
            captured: today,
          });
          console.log(`  ${file}  ${width}x${height}  ${(data.length / 1024).toFixed(0)} KB`);
        }
        const seconds = ((Date.now() - started) / 1000).toFixed(1);
        console.log(`ok ${name} in ${seconds} s <- ${result.finalUrl}`);
        if (result.removed.length) console.log(`  removed: ${result.removed.join(', ')}`);
        for (const warning of result.warnings) console.warn(`  ! ${warning}`);
      } catch (error) {
        failures.push(`${name}: ${error.message}`);
        console.error(`FAILED ${name}: ${error.message}`);
      }
    }
  }
} finally {
  await cleanup();
}

// Merge into the existing manifest so a filtered run keeps the other shots, in SHOTS order.
const previousByFile = new Map(
  previous.filter((entry) => existsSync(path.join(outDir, entry.file))).map((entry) => [entry.file, entry]),
);
const order = [
  ...SHOTS.flatMap((shot) => ['desktop', 'phone', 'thumb'].map((device) => `${shotName(shot)}-${device}.webp`)),
  ...MANUAL.flatMap((name) => ['desktop', 'phone', 'thumb'].map((device) => `${name}-${device}.webp`)),
];
const entries = order.map((file) => captured.get(file) ?? previousByFile.get(file)).filter(Boolean);
await writeFile(manifestPath, `${JSON.stringify(entries, null, 2)}\n`);
console.log(`wrote ${path.relative(root, manifestPath)} (${entries.length} entries, ${captured.size} new)`);
// Delete only captures an earlier run recorded and no entry produces any more. A WebP the
// manifest has never listed (a screenshot just added by hand, say) is reported and kept.
const known = new Set(previous.map((entry) => entry.file));
for (const file of await readdir(outDir)) {
  if (!file.endsWith('.webp') || order.includes(file)) continue;
  if (known.has(file)) {
    await rm(path.join(outDir, file));
    console.log(`deleted stale ${file}`);
  } else console.warn(`! ${file} is in no SHOTS or MANUAL entry and not in the manifest; left in place`);
}

if (failures.length) {
  console.error(`\n${failures.length} capture(s) failed:\n  ${failures.join('\n  ')}`);
  process.exitCode = 1;
}
