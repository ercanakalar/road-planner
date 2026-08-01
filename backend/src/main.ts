import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { API_PREFIX, configureApp } from './config/bootstrap';
import { EnvironmentVariables } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService<EnvironmentVariables, true>);

  configureApp(app, {
    corsOrigins: config.get('CORS_ORIGINS', { infer: true }),
  });

  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  logger.log(`Listening on port ${port} under /${API_PREFIX}`);
}

void bootstrap();
