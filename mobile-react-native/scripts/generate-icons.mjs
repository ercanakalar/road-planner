#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');
const store = join(root, 'store-assets');

const brand = {
  blue: '#1967D2',
  blueLight: '#4285F4',
  blueDeep: '#174EA6',
  red: '#EA4335',
  white: '#FFFFFF',
};

const MARK_SPAN = 512;

const mark = (stroke, node) => `
  <path d="M88 374 C88 276 184 300 256 256 C328 212 424 186 424 88"
        fill="none" stroke="${stroke}" stroke-width="46"
        stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="88" cy="424" r="36" fill="none" stroke="${stroke}" stroke-width="28"/>
  <circle cx="424" cy="88" r="50" fill="${node}"/>`;

const centred = (canvasW, canvasH, inner, body) =>
  `<g transform="translate(${(canvasW - inner) / 2} ${(canvasH - inner) / 2})
      scale(${inner / MARK_SPAN})">${body}</g>`;

const gradient = (id) => `
  <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${brand.blueLight}"/>
    <stop offset="1" stop-color="${brand.blueDeep}"/>
  </linearGradient>`;

const svg = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"
        viewBox="0 0 ${w} ${h}">
     <defs>${defs}</defs>${body}
   </svg>`;

const images = [
  {
    file: join(assets, 'icon.png'),
    w: 1024,
    h: 1024,
    svg: () =>
      svg(
        1024,
        1024,
        `<rect width="1024" height="1024" fill="url(#bg)"/>
         ${centred(1024, 1024, 660, mark(brand.white, brand.red))}`,
        gradient('bg'),
      ),
  },
  {
    file: join(assets, 'adaptive-icon.png'),
    w: 1024,
    h: 1024,
    alpha: true,
    masked: true,
    svg: () => svg(1024, 1024, centred(1024, 1024, 530, mark(brand.white, brand.red))),
  },
  {
    file: join(assets, 'adaptive-icon-background.png'),
    w: 1024,
    h: 1024,
    svg: () => svg(1024, 1024, `<rect width="1024" height="1024" fill="url(#bg)"/>`, gradient('bg')),
  },
  {
    file: join(assets, 'monochrome-icon.png'),
    w: 1024,
    h: 1024,
    alpha: true,
    masked: true,
    svg: () => svg(1024, 1024, centred(1024, 1024, 530, mark(brand.white, brand.white))),
  },
  {
    file: join(assets, 'splash-icon.png'),
    w: 1024,
    h: 1024,
    alpha: true,
    svg: () => svg(1024, 1024, centred(1024, 1024, 600, mark(brand.blue, brand.blue))),
  },
  {
    file: join(assets, 'splash-icon-dark.png'),
    w: 1024,
    h: 1024,
    alpha: true,
    svg: () => svg(1024, 1024, centred(1024, 1024, 600, mark(brand.white, brand.red))),
  },
  {
    file: join(assets, 'favicon.png'),
    w: 192,
    h: 192,
    alpha: true,
    svg: () =>
      svg(
        192,
        192,
        `<rect width="192" height="192" rx="42" fill="url(#bg)"/>
         ${centred(192, 192, 126, mark(brand.white, brand.red))}`,
        gradient('bg'),
      ),
  },
  {
    file: join(store, 'play-store-icon.png'),
    w: 512,
    h: 512,
    alpha: true,
    svg: () =>
      svg(
        512,
        512,
        `<rect width="512" height="512" fill="url(#bg)"/>
         ${centred(512, 512, 330, mark(brand.white, brand.red))}`,
        gradient('bg'),
      ),
  },
  {
    file: join(store, 'feature-graphic.png'),
    w: 1024,
    h: 500,
    svg: () =>
      svg(
        1024,
        500,
        `<rect width="1024" height="500" fill="url(#bg)"/>
         <g opacity="0.10" fill="${brand.white}">
           <circle cx="900" cy="40" r="230"/>
           <circle cx="90" cy="470" r="180"/>
         </g>
         ${centred(426, 500, 270, mark(brand.white, brand.red))}
         <text x="440" y="242" font-family="DejaVu Sans, Verdana, sans-serif"
               font-size="64" font-weight="700" fill="${brand.white}">Travel Routes</text>
         <text x="443" y="300" font-family="DejaVu Sans, Verdana, sans-serif"
               font-size="28" fill="${brand.white}" opacity="0.85">Plan every stop of the trip</text>`,
        gradient('bg'),
      ),
  },
];

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

const decodePng = (path) => {
  const file = readFileSync(path);
  const parts = [];
  let w = 0;
  let h = 0;
  let colorType = 0;
  let at = 8;

  while (at < file.length) {
    const length = file.readUInt32BE(at);
    const type = file.toString('ascii', at + 4, at + 8);
    const body = file.subarray(at + 8, at + 8 + length);

    if (type === 'IHDR') {
      w = body.readUInt32BE(0);
      h = body.readUInt32BE(4);
      if (body[8] !== 8) throw new Error(`${path}: expected 8-bit channels`);
      colorType = body[9];
    }
    if (type === 'IDAT') parts.push(body);
    at += 12 + length;
  }

  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`${path}: unsupported colour type ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(parts));
  const stride = w * channels;
  const px = Buffer.alloc(h * stride);
  let pos = 0;

  for (let y = 0; y < h; y += 1) {
    const filter = raw[pos];
    pos += 1;
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const row = px.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? row[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let v = line[x];

      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      row[x] = v & 0xff;
    }
  }

  return { w, h, channels, stride, px };
};

const encodePng = (img, { w, h, alpha }) => {
  const out = alpha ? 4 : 3;
  const stride = w * out;
  const raw = Buffer.alloc(h * (stride + 1));

  for (let y = 0; y < h; y += 1) {
    raw[y * (stride + 1)] = 0;
    for (let x = 0; x < w; x += 1) {
      const from = y * img.stride + x * img.channels;
      const to = y * (stride + 1) + 1 + x * out;
      const grey = img.channels <= 2;
      raw[to] = img.px[from];
      raw[to + 1] = grey ? img.px[from] : img.px[from + 1];
      raw[to + 2] = grey ? img.px[from] : img.px[from + 2];
      if (alpha) {
        raw[to + 3] =
          img.channels === 4 ? img.px[from + 3] : img.channels === 2 ? img.px[from + 1] : 255;
      }
    }
  }

  const chunk = (type, body) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length, 0);
    head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
    return Buffer.concat([head, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = alpha ? 6 : 2;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const assertInsideSafeZone = (img, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const safe = (w * 66) / 108 / 2;
  let furthest = 0;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (img.px[y * img.stride + x * img.channels + 3] <= 16) continue;
      furthest = Math.max(furthest, Math.hypot(x + 0.5 - cx, y + 0.5 - cy));
    }
  }

  if (furthest > safe) {
    throw new Error(
      `Artwork reaches ${furthest.toFixed(1)}px from the centre but Android ` +
        `only guarantees ${safe.toFixed(1)}px. Shrink the mark.`,
    );
  }

  return safe - furthest;
};

const findChrome = () => {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;

  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (existsSync(base)) {
    const dir = readdirSync(base)
      .filter((name) => name.startsWith('chromium-'))
      .sort()
      .pop();
    if (dir) {
      const bin = join(base, dir, 'chrome-linux', 'chrome');
      if (existsSync(bin)) return bin;
    }
  }

  for (const bin of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
    if (existsSync(bin)) return bin;
  }

  throw new Error('No Chromium found. Set CHROME_BIN to one.');
};

const chrome = findChrome();
const tmp = join(root, '.icon-build');

rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const shoot = (markup, w, h, transparent) => {
  const page = join(tmp, 'page.html');
  const shot = join(tmp, 'shot.png');

  writeFileSync(
    page,
    `<!doctype html><meta charset="utf-8">
     <style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style>
     ${markup}`,
  );
  rmSync(shot, { force: true });

  execFileSync(
    chrome,
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--default-background-color=${transparent ? '00000000' : 'FFFFFFFF'}`,
      `--screenshot=${shot}`,
      `--window-size=${w},${h}`,
      page,
    ],
    { stdio: ['ignore', 'ignore', 'ignore'] },
  );

  if (!existsSync(shot)) throw new Error('Chromium wrote no screenshot');
  return decodePng(shot);
};

const calibrate = () => {
  const probe = 400;
  const img = shoot(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="${probe}"
          viewBox="0 0 1 1" preserveAspectRatio="none">
       <rect width="1" height="1" fill="#FF0000"/></svg>`,
    64,
    probe,
    false,
  );

  let filled = 0;
  for (let y = 0; y < img.h; y += 1) {
    const o = y * img.stride + 32 * img.channels;
    if (img.px[o] > 200 && img.px[o + 1] < 80) filled = y + 1;
  }

  const gap = probe - filled;
  if (gap < 0 || gap > 200) throw new Error(`Unexpected viewport gap of ${gap}px`);
  return gap;
};

const gap = calibrate();
mkdirSync(assets, { recursive: true });
mkdirSync(store, { recursive: true });

for (const image of images) {
  const { w, h, alpha = false } = image;
  const shot = shoot(image.svg(), w, h + gap, alpha);

  if (shot.w !== w || shot.h < h) {
    throw new Error(`Chromium returned ${shot.w}x${shot.h}, wanted ${w}x${h}`);
  }

  const png = encodePng(shot, { w, h, alpha });
  writeFileSync(image.file, png);

  const note = image.masked
    ? `  (${assertInsideSafeZone(decodePng(image.file), w, h).toFixed(0)}px inside Android's safe circle)`
    : '';

  console.log(`  ${String(`${w}x${h}`).padEnd(9)} ${relative(root, image.file)}${note}`);
}

rmSync(tmp, { recursive: true, force: true });
console.log('\nDone.');
