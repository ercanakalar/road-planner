import { ValidationError } from '@nestjs/common';

import { translatePhrase } from 'src/common/interceptors/response-envelope.interceptor';
import { testI18n } from 'src/testing/i18n';
import { validationPhrases } from './validation-phrases';

const i18n = testI18n();

const say = (errors: ValidationError[], language: 'en' | 'tr' = 'en') =>
  validationPhrases(errors).map((phrase) =>
    translatePhrase(phrase, language, i18n),
  );

const failure = (
  property: string,
  constraints: Record<string, string>,
  children: ValidationError[] = [],
): ValidationError => ({ property, constraints, children }) as ValidationError;

describe('validationPhrases', () => {
  it('names the field in the reader’s language', () => {
    const errors = [
      failure('nickName', { isString: 'nickName must be a string' }),
    ];

    expect(say(errors)).toEqual(['Nickname must be text']);
    expect(say(errors, 'tr')).toEqual(['Kullanıcı adı metin olmalı']);
  });

  it('carries the bound out of the message class-validator wrote', () => {
    const errors = [
      failure('title', {
        maxLength: 'title must be shorter than or equal to 255 characters',
      }),
    ];

    expect(say(errors)).toEqual(['Title must be at most 255 characters']);
    expect(say(errors, 'tr')).toEqual(['Başlık en fazla 255 karakter olmalı']);
  });

  it('reports every constraint a field failed', () => {
    const errors = [
      failure('email', {
        isEmail: 'email must be an email',
        maxLength: 'email must be shorter than or equal to 254 characters',
      }),
    ];

    expect(say(errors)).toEqual([
      'Email must be a valid email address',
      'Email must be at most 254 characters',
    ]);
  });

  it('follows a failure down into a nested object', () => {
    const errors = [
      failure('origin', {}, [
        failure('latitude', { isLatitude: 'latitude must be a latitude' }),
      ]),
    ];

    expect(say(errors)).toEqual(['Latitude must be a valid latitude']);
  });

  it('names the field inside a list, not its index', () => {
    const errors = [
      failure('stops', {}, [
        failure('0', {}, [
          failure('title', { isString: 'title must be a string' }),
        ]),
      ]),
    ];

    expect(say(errors)).toEqual(['Title must be text']);
  });

  it('lets a decorator name the key it wants said', () => {
    const errors = [
      failure('password', { matches: 'validation.passwordPattern' }),
    ];

    expect(say(errors)).toEqual([
      'Password must contain at least one letter and one digit',
    ]);
  });

  it('takes the bound from a key that was given one', () => {
    const errors = [
      failure('code', { matches: 'validation.resetCodeLength 6' }),
    ];

    expect(say(errors)).toEqual(['The code must be 6 digits']);
    expect(say(errors, 'tr')).toEqual(['Kod 6 haneli olmalı']);
  });

  it('falls back to the field name when nothing has translated it', () => {
    const errors = [failure('somethingNew', { isString: 'must be a string' })];

    expect(say(errors)).toEqual(['somethingNew must be text']);
  });

  it('says which values a set constraint accepts', () => {
    const errors = [
      failure('language', {
        isIn: 'language must be one of the following values: en, tr',
      }),
    ];

    expect(say(errors)).toEqual(['Language must be one of: en, tr']);
    expect(say(errors, 'tr')).toEqual(['Dil şunlardan biri olmalı: en, tr']);
  });

  it('leaves a constraint it does not know as class-validator wrote it', () => {
    const errors = [
      failure('photo', { isDataURI: 'photo must be a data URI' }),
    ];

    expect(say(errors)).toEqual(['photo must be a data URI']);
  });
});
