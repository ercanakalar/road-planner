import { Injectable } from '@nestjs/common';
import { I18nLoader, I18nTranslation } from 'nestjs-i18n';

import en from './locales/en';
import tr from './locales/tr';
import { SUPPORTED_LANGUAGES } from './languages';

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
