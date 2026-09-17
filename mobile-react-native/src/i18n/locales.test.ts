import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import en from './locales/en';
import tr from './locales/tr';
import { SUPPORTED_LANGUAGES } from 'types/i18n';

/**
 * A key with no entry renders as the key itself — `favorites.ownRoutes` in the
 * middle of a screen — and nothing else fails. These check that no such key
 * exists, and that the two dictionaries say the same things.
 */

type Node = Record<string, unknown>;

const DICTIONARIES: Record<string, Node> = { en, tr };

/**
 * i18next selects `_one` or `_other` from the count, so both are one key as far
 * as the code is concerned. Collapsed here, or every plural sentence would look
 * like a key nothing emits.
 */
const withoutPluralSuffix = (path: string): string =>
  path.replace(/_(zero|one|two|few|many|other)$/, '');

const pathsOf = (node: Node, prefix = ''): Map<string, Set<string>> => {
  const paths = new Map<string, Set<string>>();

  for (const [name, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${name}` : name;

    if (typeof value === 'string') {
      paths.set(path, argumentsIn(value));
      continue;
    }

    for (const [nested, args] of pathsOf(value as Node, path)) {
      paths.set(nested, args);
    }
  }

  return paths;
};

const argumentsIn = (sentence: string): Set<string> =>
  new Set([...sentence.matchAll(/{{\s*(\w+)\s*}}/g)].map(([, name]) => name));

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) return sourceFiles(path);
    if (!/\.tsx?$/.test(path) || /\.test\.tsx?$/.test(path)) return [];
    if (path.includes(join('src', 'i18n'))) return [];

    return [path];
  });

/**
 * Keys as the code writes them: a quoted `namespace.key` whose namespace is one
 * the dictionary actually has. Bounded that way because plenty of quoted
 * strings look like a dotted path and are not keys.
 */
const emittedKeys = (): Map<string, string[]> => {
  const namespaces = Object.keys(en).join('|');
  const pattern = new RegExp(
    `'((?:${namespaces})\\.[A-Za-z][A-Za-z0-9]*)'`,
    'g',
  );

  const found = new Map<string, string[]>();

  for (const path of sourceFiles('src')) {
    for (const [, key] of readFileSync(path, 'utf8').matchAll(pattern)) {
      found.set(key, [...(found.get(key) ?? []), path]);
    }
  }

  return found;
};

describe('locales', () => {
  const english = pathsOf(en as unknown as Node);
  const englishKeys = new Set(
    [...english.keys()].map(withoutPluralSuffix),
  );

  it('has a dictionary for every supported language', () => {
    expect(Object.keys(DICTIONARIES).sort()).toEqual(
      [...SUPPORTED_LANGUAGES].sort(),
    );
  });

  it.each(Object.keys(DICTIONARIES))(
    '%s says everything English says',
    (language) => {
      expect([...pathsOf(DICTIONARIES[language]).keys()].sort()).toEqual(
        [...english.keys()].sort(),
      );
    },
  );

  it.each(Object.keys(DICTIONARIES))(
    '%s interpolates the same values English does',
    (language) => {
      const mismatched = [...pathsOf(DICTIONARIES[language])]
        .filter(([path, args]) => {
          const expected = english.get(path);

          return (
            expected !== undefined &&
            [...args].some((name) => !expected.has(name))
          );
        })
        .map(([path]) => path);

      expect(mismatched).toEqual([]);
    },
  );

  it('translates every key the code emits', () => {
    const orphans = [...emittedKeys()]
      .filter(([key]) => !englishKeys.has(key))
      .map(([key, files]) => `${key} (${files.join(', ')})`);

    expect(orphans).toEqual([]);
  });

  it('finds the keys it is meant to be checking', () => {
    // A regression in the scanner would make the check above pass for the
    // wrong reason, so this pins that it is reading real keys out of real code.
    const keys = emittedKeys();

    expect(keys.size).toBeGreaterThan(100);
    expect(keys.has('common.signIn')).toBe(true);
  });
});
