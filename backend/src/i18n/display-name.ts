import { I18nContext } from 'nestjs-i18n';

const ANONYMOUS_KEY = 'user.anonymousName';

// What English says when nobody is asking in any particular language — a
// background job, or a unit test with no request around it.
export const ANONYMOUS_FALLBACK = 'A traveller';

interface Named {
  nickName?: string | null;
  firstName?: string | null;
}

// How a person who chose neither a nickname nor a first name is shown to
// others, in the language of the request being answered.
export const anonymousName = (): string => {
  const translated = I18nContext.current()?.t(ANONYMOUS_KEY);

  return typeof translated === 'string' && translated !== ANONYMOUS_KEY
    ? translated
    : ANONYMOUS_FALLBACK;
};

export const chosenName = (person: Named | null | undefined): string | null =>
  person?.nickName?.trim() || person?.firstName?.trim() || null;

// The name others see: the nickname, else the first name, else a stand-in.
export const displayNameOf = (person: Named | null | undefined): string =>
  chosenName(person) ?? anonymousName();
