import { ValidationError } from '@nestjs/common';

import { Phrase, phrase } from 'src/common/http/api-response';

/**
 * Which `validation.*` key each class-validator constraint reads as.
 *
 * Only the constraints this API actually uses are listed. One that is not here
 * keeps the English sentence class-validator generated, which still reaches the
 * caller intact — adding a decorator does not break a response, it just leaves
 * that one message untranslated until a key is added.
 */
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

/**
 * The values a set constraint was given, read back off its own message.
 *
 * Same reason as the bound below: `@IsIn(['en', 'tr'])` survives only as the
 * tail of "must be one of the following values: en, tr". Read back so the
 * sentence can say which they are rather than trailing off.
 */
const valuesIn = (message: string): string | undefined => {
  const separator = message.lastIndexOf(': ');

  return separator === -1 ? undefined : message.slice(separator + 2);
};

/**
 * The number a bounded constraint was given, read back off its own message.
 *
 * class-validator hands the bound to the message template rather than to the
 * error, so `minLength: 3` survives only as the "3" in "must be longer than or
 * equal to 3 characters". Every bounded template interpolates exactly one
 * number, which is what makes reading it back safe.
 */
const boundIn = (message: string): string | undefined =>
  /(-?\d+(?:\.\d+)?)/.exec(message)?.[1];

/**
 * An explicit `message` on a decorator, when it was written as a key.
 *
 * A decorator that wants to say something more specific than its constraint
 * does — that a password needs a digit, rather than that it is "in the wrong
 * format" — puts the key there itself, optionally followed by the one number
 * the sentence interpolates:
 *
 *     @Matches(RESET_CODE_PATTERN, { message: `validation.resetCodeLength 6` })
 *
 * Anything else is left as class-validator wrote it.
 */
const KEY_MESSAGE = /^([a-z][A-Za-z]*\.[A-Za-z]+)(?:\s+-?\d+(?:\.\d+)?)?$/;

interface Failure {
  property: string;
  constraint: string;
  message: string;
}

/**
 * Every failing constraint in the tree, outermost property first.
 *
 * Nested objects and arrays are reported by class-validator as children, and a
 * child only carries its own property name, so the path is accumulated on the
 * way down — `stops.0.latitude` rather than a bare `latitude`.
 */
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

/**
 * What a field is called, in the reader's language.
 *
 * The property name is the fallback rather than the key's own text, so a field
 * nobody has translated reads as `nickName` — the name the API documents —
 * instead of as `field.nickName`.
 */
const fieldPhrase = (property: string): Phrase => {
  // A path into a list names the field at its end; the index is not a field.
  const name = property
    .split('.')
    .filter((part) => !/^\d+$/.test(part))
    .pop();

  return phrase(`field.${name ?? property}`, {}, name ?? property);
};

/**
 * class-validator's errors, as phrases the response boundary can translate.
 *
 * Handed to `ValidationPipe` as its `exceptionFactory`, so the sentences a
 * validation failure produces go through the same dictionary as every other
 * sentence the API says.
 */
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
