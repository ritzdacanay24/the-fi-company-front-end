import 'reflect-metadata';

import express, { NextFunction, Request, Response } from 'express';
import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { join } from 'path';
import compression from 'compression';
import { AppModule } from './nest/app.module';
import { GlobalHttpExceptionFilter } from './nest/filters/http-exception.filter';
import { initializeFileLogging } from './shared/logging/file-logger.bootstrap';
import { UnifiedWebSocketService } from './shared/services/unified-websocket.service';

async function bootstrap() {
  initializeFileLogging();

  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || '25mb';

  // Use explicit body parser limits for large checklist/template payloads.
  app.use(express.json({ limit: requestBodyLimit }));
  app.use(express.urlencoded({ limit: requestBodyLimit, extended: true }));

  app.use(compression());

  // Keep compatibility with legacy proxy prefixes that still forward to /api.
  // This intentionally complements the frontend interceptor's /apiV2 normalization.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.url === '/server/ApiV2' || req.url.startsWith('/server/ApiV2/')) {
      req.url = req.url.replace(/^\/server\/ApiV2/, '/apiV2');
    } else if (req.url === '/server/apiV2' || req.url.startsWith('/server/apiV2/')) {
      req.url = req.url.replace(/^\/server\/apiV2/, '/apiV2');
    } else
    if (req.url === '/api/apiV2' || req.url.startsWith('/api/apiV2/')) {
      req.url = req.url.replace(/^\/api\/apiV2/, '/apiV2');
    } else if (req.url === '/api' || req.url.startsWith('/api/')) {
      req.url = req.url.replace(/^\/api/, '/apiV2');
    }
    next();
  });

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

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

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

  const wsService = app.get(UnifiedWebSocketService);
  wsService.setHttpServer(app.getHttpServer());

  const logger = new Logger('Bootstrap');
  logger.log(`nest-api listening on port ${port}`);
}

bootstrap();
