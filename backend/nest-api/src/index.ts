import 'reflect-metadata';

import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './nest/app.module';
import { GlobalHttpExceptionFilter } from './nest/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('apiV2', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
    ],
  });

  const corsOriginRaw = process.env.CORS_ORIGIN || '';
  const corsOrigins = corsOriginRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`nest-api listening on port ${port}`);
}

bootstrap();
