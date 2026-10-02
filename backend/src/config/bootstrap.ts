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
  // Proxies in front of the API; see TRUST_PROXY in env.validation.ts.
  trustProxy?: number;
}

export function configureApp(
  app: INestApplication,
  config: AppConfiguration,
): INestApplication {
  // The rate limits are counted per client address. Behind a proxy the
  // socket's peer is the proxy, shared by everyone, unless Express is told
  // how many hops to look through.
  app
    .getHttpAdapter()
    .getInstance()
    .set('trust proxy', config.trustProxy ?? 0);

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
