import { Module } from '@nestjs/common';
import { QirController } from './qir.controller';
import { QirService } from './qir.service';
import { QirRepository } from './qir.repository';

@Module({
  controllers: [QirController],
  providers: [QirService, QirRepository],
  exports: [QirService],
})
export class QirModule {}
