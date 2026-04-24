import { Module } from '@nestjs/common';
import { PublicFieldServiceController } from './public-field-service.controller';
import { PublicRequestTokenGuard } from './public-request-token.guard';
import { PublicFieldServiceService } from './public-field-service.service';

@Module({
  controllers: [PublicFieldServiceController],
  providers: [PublicFieldServiceService, PublicRequestTokenGuard],
  exports: [PublicFieldServiceService],
})
export class PublicFieldServiceModule {}
