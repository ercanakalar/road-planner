import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

import { AllExceptionsFilter } from 'src/common/filters/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from 'src/common/interceptors/response-envelope.interceptor';

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
    }),
  );

  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableShutdownHooks();

  return app;
}
