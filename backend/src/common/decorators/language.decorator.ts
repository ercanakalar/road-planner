import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import { AppLanguage, resolveAcceptLanguage } from 'src/i18n/languages';

export const Language = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AppLanguage => {
    const header = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
    }>()?.headers?.['accept-language'];

    return resolveAcceptLanguage(Array.isArray(header) ? header[0] : header);
  },
);
