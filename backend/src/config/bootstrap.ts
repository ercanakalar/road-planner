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
      exceptionFactory: (errors) =>
        new BadRequestException({ message: validationPhrases(errors) }),
    }),
  );

  const i18n = app.get(I18nService);

  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor(i18n));
  app.useGlobalFilters(new AllExceptionsFilter(i18n));

  app.enableShutdownHooks();

  return app;
}
