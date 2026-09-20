import { ValidationError } from '@nestjs/common';

import { Phrase, phrase } from 'src/common/http/api-response';

const VALIDATION_KEYS: Record<string, string> = {
  isDefined: 'validation.required',
  isNotEmpty: 'validation.required',
  isString: 'validation.mustBeText',
  isBoolean: 'validation.mustBeYesOrNo',
  isInt: 'validation.mustBeWholeNumber',
  isNumber: 'validation.mustBeNumber',
  isArray: 'validation.mustBeList',
  isEnum: 'validation.mustBeOneOf',
  isIn: 'validation.mustBeOneOf',
  isEmail: 'validation.mustBeEmail',
  isUrl: 'validation.mustBeUrl',
  isUuid: 'validation.mustBeId',
  isJwt: 'validation.mustBeToken',
  isLatitude: 'validation.mustBeLatitude',
  isLongitude: 'validation.mustBeLongitude',
  matches: 'validation.wrongFormat',
  minLength: 'validation.tooShort',
  maxLength: 'validation.tooLong',
  min: 'validation.tooSmall',
  max: 'validation.tooBig',
  arrayMinSize: 'validation.tooFewItems',
  arrayMaxSize: 'validation.tooManyItems',
};

const valuesIn = (message: string): string | undefined => {
  const separator = message.lastIndexOf(': ');

  return separator === -1 ? undefined : message.slice(separator + 2);
};

const boundIn = (message: string): string | undefined =>
  /(-?\d+(?:\.\d+)?)/.exec(message)?.[1];

const KEY_MESSAGE = /^([a-z][A-Za-z]*\.[A-Za-z]+)(?:\s+-?\d+(?:\.\d+)?)?$/;

interface Failure {
  property: string;
  constraint: string;
  message: string;
}

const failures = (errors: ValidationError[], prefix = ''): Failure[] =>
  errors.flatMap((error) => {
    const property = prefix ? `${prefix}.${error.property}` : error.property;

    return [
      ...Object.entries(error.constraints ?? {}).map(
        ([constraint, message]) => ({ property, constraint, message }),
      ),
      ...failures(error.children ?? [], property),
    ];
  });

const fieldPhrase = (property: string): Phrase => {
  const name = property
    .split('.')
    .filter((part) => !/^\d+$/.test(part))
    .pop();

  return phrase(`field.${name ?? property}`, {}, name ?? property);
};

export const validationPhrases = (errors: ValidationError[]): Phrase[] =>
  failures(errors).map(({ property, constraint, message }) => {
    const key = KEY_MESSAGE.exec(message)?.[1] ?? VALIDATION_KEYS[constraint];
    if (!key) return message;

    return phrase(key, {
      field: fieldPhrase(property),
      bound: boundIn(message) ?? '',
      values: valuesIn(message) ?? '',
    });
  });
