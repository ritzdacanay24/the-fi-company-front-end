import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './nest/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`nest-api listening on port ${port}`);
}

bootstrap();
