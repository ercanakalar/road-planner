#!/usr/bin/env node
/**
 * Walks the constraints written at the top of `src/theme/palettes.ts`.
 *
 * A palette is easy to nudge and hard to eyeball: darkening one token by a
 * step can drop a label under 4.5:1 on one of three backgrounds, or slide two
 * map pins into the same hue, and neither shows up until someone is squinting
 * at a screen outdoors. This reads every palette straight out of the source
 * and fails loudly instead.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const PALETTES = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/theme/palettes.ts',
);

const channel = (value) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  );
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const hue = (hex) => {
  const [r, g, b] = [1, 3, 5].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  const h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

/** Degrees between two hues, the short way round the wheel. */
const apart = (a, b) => {
  const d = Math.abs(hue(a) - hue(b));
  return Math.min(d, 360 - d);
};

/**
 * Every palette in the file, not only the one the app currently wears: a
 * family sitting unused is one someone will switch to, and it should not have
 * been allowed to rot in the meantime.
 */
const readPalettes = () => {
  const source = readFileSync(PALETTES, 'utf8');
  const out = {};

  for (const [, name, body] of source.matchAll(
    /export const (\w+): ThemeColors = \{([\s\S]*?)\n\};/g,
  )) {
    out[name] = Object.fromEntries(
      [...body.matchAll(/(\w+):\s*'(#[0-9A-Fa-f]{6})'/g)].map((m) => [
        m[1],
        m[2],
      ]),
    );
  }

  if (Object.keys(out).length === 0) {
    throw new Error(`No ThemeColors palettes found in ${PALETTES}`);
  }
  return out;
};

const GROUNDS = ['surface', 'background', 'surfaceAlt'];
const PINS = ['success', 'accent', 'route', 'place', 'selection'];
const MODES = [
  ['route', 'routeCasing'],
  ['transitRoute', 'transitRouteCasing'],
  ['walkingRoute', 'walkingRouteCasing'],
];

const palettes = readPalettes();
const failures = [];

const check = (ok, message) => {
  if (!ok) failures.push(message);
  if (process.env.VERBOSE) console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
};

for (const [scheme, colors] of Object.entries(palettes)) {
  const missing = ['brand', ...PINS, ...MODES.flat()].filter(
    (token) => !colors[token],
  );
  if (missing.length) {
    check(false, `${scheme}: missing tokens ${missing.join(', ')}`);
    continue;
  }

  // Body text and anything read at label size.
  for (const fg of ['text', 'textMuted']) {
    for (const bg of GROUNDS) {
      const ratio = contrast(colors[fg], colors[bg]);
      check(ratio >= 4.5, `${scheme}: ${fg} on ${bg} ${ratio.toFixed(2)}:1`);
    }
  }

  // `primary` labels links and secondary buttons, including on primarySoft.
  for (const bg of [...GROUNDS, 'primarySoft']) {
    const ratio = contrast(colors.primary, colors[bg]);
    check(ratio >= 4.5, `${scheme}: primary on ${bg} ${ratio.toFixed(2)}:1`);
  }

  // `brand` is the wordmark and the app mark — display sizes only, so 3:1.
  for (const bg of GROUNDS) {
    const ratio = contrast(colors.brand, colors[bg]);
    check(ratio >= 3, `${scheme}: brand on ${bg} ${ratio.toFixed(2)}:1`);
  }

  for (const [fg, bg] of [
    ['danger', 'surface'],
    ['danger', 'dangerSoft'],
    ['success', 'surface'],
    ['success', 'successSoft'],
    ['warning', 'surface'],
    ['textInverse', 'primary'],
    ['textInverse', 'accent'],
  ]) {
    const ratio = contrast(colors[fg], colors[bg]);
    check(ratio >= 4.5, `${scheme}: ${fg} on ${bg} ${ratio.toFixed(2)}:1`);
  }

  // Never the only carrier of meaning, so the lower bar applies.
  for (const bg of GROUNDS) {
    const ratio = contrast(colors.textSubtle, colors[bg]);
    check(ratio >= 3, `${scheme}: textSubtle on ${bg} ${ratio.toFixed(2)}:1`);
  }

  // Every pin colour can be on the map at the same time.
  for (let i = 0; i < PINS.length; i += 1) {
    for (let j = i + 1; j < PINS.length; j += 1) {
      const degrees = apart(colors[PINS[i]], colors[PINS[j]]);
      check(
        degrees >= 45,
        `${scheme}: pins ${PINS[i]}/${PINS[j]} only ${degrees.toFixed(0)}° apart`,
      );
    }
  }

  // A casing is a halo, and a halo you cannot see is not one.
  for (const [line, casing] of MODES) {
    const ratio = contrast(colors[line], colors[casing]);
    check(ratio >= 3, `${scheme}: ${line} vs ${casing} ${ratio.toFixed(2)}:1`);
  }

  // The coast has to read, and so does a route drawn across a lake.
  const coast = contrast(colors.water, colors.background);
  check(coast >= 1.15, `${scheme}: water vs background ${coast.toFixed(2)}:1`);
  const overWater = contrast(colors.route, colors.water);
  check(overWater >= 3, `${scheme}: route over water ${overWater.toFixed(2)}:1`);
}

if (failures.length) {
  console.error('Palette constraints broken:\n');
  failures.forEach((line) => console.error(`  ${line}`));
  console.error(
    '\nSee the constraints documented at the top of src/theme/palettes.ts.',
  );
  process.exit(1);
}

console.log(
  `Palette constraints hold across ${Object.keys(palettes).length} palettes: ` +
    `${Object.keys(palettes).join(', ')}.`,
);
