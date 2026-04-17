import { Module } from '@nestjs/common';
import { QirResponseController } from './qir-response.controller';
import { QirResponseService } from './qir-response.service';
import { QirResponseRepository } from './qir-response.repository';

@Module({
  controllers: [QirResponseController],
  providers: [QirResponseService, QirResponseRepository],
  exports: [QirResponseService],
})
export class QirResponseModule {}
