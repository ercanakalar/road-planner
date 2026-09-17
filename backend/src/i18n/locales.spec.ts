import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import en from './locales/en';
import tr from './locales/tr';
import { SUPPORTED_LANGUAGES } from './languages';

/**
 * The dictionaries are the only thing standing between a service that emits
 * `favorite.addedHeader` and a person reading those two words on their screen.
 * A key with no entry resolves to itself and fails silently, everywhere at
 * once, so what is checked here is that no such key exists.
 */

type Node = Record<string, unknown>;

const DICTIONARIES: Record<string, Node> = { en, tr };

/** Every `a.b` path in a dictionary, plus the arguments its sentence takes. */
const pathsOf = (node: Node, prefix = ''): Map<string, Set<string>> => {
  const paths = new Map<string, Set<string>>();

  for (const [name, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${name}` : name;

    if (typeof value === 'string') {
      paths.set(path, argumentsIn(value));
      continue;
    }

    if (isPlural(value)) {
      // One path, whichever branch a count selects, so the arguments of each
      // branch are the arguments of the key.
      paths.set(
        path,
        new Set(Object.values(value).flatMap((form) => [...argumentsIn(form)])),
      );
      continue;
    }

    for (const [nested, args] of pathsOf(value as Node, path)) {
      paths.set(nested, args);
    }
  }

  return paths;
};

const isPlural = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' &&
  value !== null &&
  'other' in value &&
  Object.values(value).every((form) => typeof form === 'string');

const argumentsIn = (sentence: string): Set<string> =>
  new Set([...sentence.matchAll(/{{\s*(\w+)\s*}}/g)].map(([, name]) => name));

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) return sourceFiles(path);
    if (!path.endsWith('.ts') || path.endsWith('.spec.ts')) return [];
    if (path.includes(join('src', 'i18n'))) return [];

    return [path];
  });

/**
 * Keys as the code writes them: a quoted `namespace.key` whose namespace is one
 * the dictionary actually has.
 *
 * Bounded to the known namespaces because plenty of quoted strings look like a
 * dotted path — `road.title`, a Prisma `orderBy`, an import — and none of them
 * are translation keys.
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
  const english = pathsOf(en as Node);

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
      .filter(([key]) => !english.has(key))
      .map(([key, files]) => `${key} (${files.join(', ')})`);

    expect(orphans).toEqual([]);
  });

  it('names every field a validation failure can mention', () => {
    // A field with no label reads as its property name — `nickName` in the
    // middle of a Turkish sentence — which the fallback makes safe but not
    // right. This is the only key the code builds at runtime, so it is the one
    // the scan above cannot see.
    const properties = new Set(
      sourceFiles('src')
        .filter((path) => path.endsWith('.dto.ts'))
        .flatMap((path) => [
          ...readFileSync(path, 'utf8').matchAll(/^  ([a-zA-Z]+)[?!]?:/gm),
        ])
        .map(([, name]) => name),
    );

    const unnamed = [...properties].filter(
      (property) => !english.has(`field.${property}`),
    );

    expect(unnamed).toEqual([]);
  });

  it('finds the keys it is meant to be checking', () => {
    // A regression in the scanner would make the check above pass for the
    // wrong reason, so this pins that it is reading real keys out of real code.
    const keys = emittedKeys();

    expect(keys.size).toBeGreaterThan(100);
    expect(keys.has('error.routeNotFound')).toBe(true);
  });
});
