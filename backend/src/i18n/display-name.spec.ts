import { I18nContext, I18nService } from 'nestjs-i18n';

import { testI18n } from 'src/testing/i18n';
import {
  ANONYMOUS_FALLBACK,
  anonymousName,
  chosenName,
  displayNameOf,
} from './display-name';

const inRequest = <T>(language: string, run: () => T): T => {
  let result!: T;
  const context = new I18nContext(
    language,
    testI18n() as unknown as I18nService,
    { enabled: false } as never,
  );

  I18nContext.create(context, () => {
    result = run();
  });

  return result;
};

describe('displayNameOf', () => {
  it('prefers the nickname, then the first name', () => {
    expect(displayNameOf({ nickName: 'ada_l', firstName: 'Ada' })).toBe(
      'ada_l',
    );
    expect(displayNameOf({ nickName: null, firstName: 'Ada' })).toBe('Ada');
  });

  it('does not show a blank name as if it were one', () => {
    expect(displayNameOf({ nickName: '  ', firstName: '' })).toBe(
      ANONYMOUS_FALLBACK,
    );
  });

  it('names somebody who chose no name in the language of the request', () => {
    expect(inRequest('tr', () => displayNameOf({ nickName: null }))).toBe(
      'Bir gezgin',
    );
    expect(inRequest('en', () => displayNameOf(null))).toBe('A traveller');
  });

  it('falls back to English with no request to take a language from', () => {
    expect(anonymousName()).toBe(ANONYMOUS_FALLBACK);
  });
});

describe('chosenName', () => {
  it('is null when the person chose no name, so the caller can pick a language', () => {
    expect(chosenName({ nickName: null, firstName: null })).toBeNull();
    expect(chosenName(undefined)).toBeNull();
  });
});
