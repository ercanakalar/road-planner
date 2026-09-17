import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import compression from 'compression';
import helmet from 'helmet';
import { I18nService } from 'nestjs-i18n';

import { AllExceptionsFilter } from 'src/common/filters/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from 'src/common/interceptors/response-envelope.interceptor';
import { validationPhrases } from 'src/common/validation/validation-phrases';

export const API_PREFIX = 'api';

export function parseCorsOrigins(raw: string): string[] | true {
  if (raw.trim() === '*') return true;

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export interface AppConfiguration {
  corsOrigins: string;
}

export function configureApp(
  app: INestApplication,
  config: AppConfiguration,
): INestApplication {
  app.use(helmet());

  // List responses are JSON and compress to a fraction of their size. On a
  // phone that is the difference between one round trip and several.
  app.use(compression());

  app.enableCors({
    origin: parseCorsOrigins(config.corsOrigins),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix(API_PREFIX);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      // class-validator writes its own English. Handing the failures over as
      // phrases puts them through the same dictionary as everything else the
      // API says, so a rejected form reads in the caller's language too.
      exceptionFactory: (errors) =>
        new BadRequestException({ message: validationPhrases(errors) }),
    }),
  );

  // Both are constructed rather than injected, so the translator is fetched
  // from the container once and handed to them.
  const i18n = app.get(I18nService);

  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor(i18n));
  app.useGlobalFilters(new AllExceptionsFilter(i18n));

  app.enableShutdownHooks();

  return app;
}
