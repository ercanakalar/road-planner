import { Injectable } from '@nestjs/common';
import { I18nLoader, I18nTranslation } from 'nestjs-i18n';

import en from './locales/en';
import tr from './locales/tr';
import { SUPPORTED_LANGUAGES } from './languages';

/**
 * Serves the translations from TypeScript rather than from JSON on disk.
 *
 * The bundled build copies nothing but compiled `.js` into `dist`, so a loader
 * reading files at runtime works in development and then finds nothing in a
 * container. Holding the strings in modules means they are compiled in, and
 * the type checker sees a locale missing a key.
 */
@Injectable()
export class MemoryLoader extends I18nLoader {
  async languages(): Promise<string[]> {
    return [...SUPPORTED_LANGUAGES];
  }

  async load(): Promise<I18nTranslation> {
    return { en, tr } as unknown as I18nTranslation;
  }
}

export default MemoryLoader;
