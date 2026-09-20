import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { I18nService } from 'nestjs-i18n';

import {
  ApiEnvelope,
  isEnvelope,
  ok,
  Phrase,
  RawEnvelope,
} from 'src/common/http/api-response';
import { AppLanguage, resolveAcceptLanguage } from 'src/i18n/languages';

const isPhraseObject = (value: unknown): value is { key: string } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { key?: unknown }).key === 'string';

export const translatePhrase = (
  phrase: Phrase | undefined,
  language: AppLanguage,
  i18n: Pick<I18nService, 'translate'>,
): string | undefined => {
  if (phrase === undefined) return undefined;

  const key = typeof phrase === 'string' ? phrase : phrase.key;
  const args =
    typeof phrase === 'string'
      ? undefined
      : Object.fromEntries(
          Object.entries(phrase.args).map(([name, value]) => [
            name,
            isPhraseObject(value)
              ? translatePhrase(value as Phrase, language, i18n)
              : value,
          ]),
        );
  const fallback = typeof phrase === 'string' ? key : (phrase.fallback ?? key);

  const translated = i18n.translate(key, {
    lang: language,
    args,
    defaultValue: fallback,
  });

  return typeof translated === 'string' ? translated : fallback;
};

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly i18n: Pick<I18nService, 'translate'>) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiEnvelope> {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
    }>();

    const header = request?.headers?.['accept-language'];
    const language = resolveAcceptLanguage(
      Array.isArray(header) ? header[0] : header,
    );

    return next
      .handle()
      .pipe(
        map((value) =>
          translateEnvelope(toEnvelope(value), language, this.i18n),
        ),
      );
  }
}

export function translateEnvelope(
  envelope: RawEnvelope,
  language: AppLanguage,
  i18n: Pick<I18nService, 'translate'>,
): ApiEnvelope {
  const translated: ApiEnvelope = { status: envelope.status };

  const header = translatePhrase(envelope.header, language, i18n);
  const message = translatePhrase(envelope.message, language, i18n);

  if (header !== undefined) translated.header = header;
  if (message !== undefined) translated.message = message;
  if (envelope.data !== undefined) translated.data = envelope.data;
  if (envelope.meta !== undefined) translated.meta = envelope.meta;

  return translated;
}

export function toEnvelope(value: unknown): RawEnvelope {
  if (isEnvelope(value)) return value as RawEnvelope;

  if (value === undefined || value === null) return ok({ data: null });

  return ok({ data: value });
}
