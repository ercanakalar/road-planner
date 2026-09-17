import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import { AppLanguage, resolveAcceptLanguage } from 'src/i18n/languages';

/**
 * The language this request asked to be answered in.
 *
 * The same header the response boundary reads, handed to a handler that needs
 * to do something with it beyond answering — remembering it against an account,
 * so an email sent later without a request behind it still reads right.
 */
export const Language = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AppLanguage => {
    const header = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
    }>()?.headers?.['accept-language'];

    return resolveAcceptLanguage(Array.isArray(header) ? header[0] : header);
  },
);
