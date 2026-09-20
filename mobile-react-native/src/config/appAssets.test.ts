import { readFileSync } from 'fs';
import { join } from 'path';

import appJson from '../../app.json';
import { darkColors, lightColors } from 'theme';

const root = join(__dirname, '..', '..');
const { expo } = appJson;

type SplashConfig = {
  image: string;
  backgroundColor: string;
  dark: { image: string; backgroundColor: string };
};

const splashPlugin = expo.plugins.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
) as [string, SplashConfig] | undefined;

if (!splashPlugin) {
  throw new Error('app.json no longer configures the expo-splash-screen plugin');
}

const splash = splashPlugin[1];

const header = (relativePath: string) => {
  const bytes = readFileSync(join(root, relativePath));

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!bytes.subarray(0, 8).equals(signature)) {
    throw new Error(`${relativePath} is not a PNG`);
  }

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    hasAlpha: bytes[25] === 6 || bytes[25] === 4,
  };
};

describe('launcher and store images', () => {
  const declared: [string, string][] = [
    ['icon', expo.icon],
    ['splash image', splash.image],
    ['dark splash image', splash.dark.image],
    ['adaptive foreground', expo.android.adaptiveIcon.foregroundImage],
    ['adaptive background', expo.android.adaptiveIcon.backgroundImage],
    ['adaptive monochrome', expo.android.adaptiveIcon.monochromeImage],
    ['web favicon', expo.web.favicon],
  ];

  it.each(declared)('%s is a PNG that exists', (_name, path) => {
    expect(path).toMatch(/\.png$/);
    expect(() => header(path)).not.toThrow();
  });

  it('ships the 1024x1024 sources Expo resizes from', () => {
    const square = [
      expo.icon,
      splash.image,
      splash.dark.image,
      expo.android.adaptiveIcon.foregroundImage,
      expo.android.adaptiveIcon.backgroundImage,
      expo.android.adaptiveIcon.monochromeImage,
    ];

    square.forEach((path) => {
      expect(header(path)).toMatchObject({ width: 1024, height: 1024 });
    });
  });

  it('keeps the iOS icon opaque', () => {
    expect(header(expo.icon).hasAlpha).toBe(false);
  });

  it('keeps every layer Android composites transparent', () => {
    [
      expo.android.adaptiveIcon.foregroundImage,
      expo.android.adaptiveIcon.monochromeImage,
      splash.image,
      splash.dark.image,
    ].forEach((path) => {
      expect(header(path).hasAlpha).toBe(true);
    });
  });

  it('has the two images the Play Console listing asks for', () => {
    expect(header('store-assets/play-store-icon.png')).toEqual({
      width: 512,
      height: 512,
      hasAlpha: true,
    });
    expect(header('store-assets/feature-graphic.png')).toMatchObject({
      width: 1024,
      height: 500,
    });
  });
});

describe('launch colours', () => {
  it('opens on the same background the app then draws', () => {
    expect(splash.backgroundColor.toUpperCase()).toBe(lightColors.background);
    expect(splash.dark.backgroundColor.toUpperCase()).toBe(darkColors.background);
  });

  it('falls back to the brand colour behind the adaptive icon', () => {
    expect(expo.android.adaptiveIcon.backgroundColor.toUpperCase()).toBe(lightColors.primary);
  });
});
