import { Module } from '@nestjs/common';
import { QirOptionsController } from './qir-options.controller';
import { QirOptionsService } from './qir-options.service';
import { QirOptionsRepository } from './qir-options.repository';

@Module({
  controllers: [QirOptionsController],
  providers: [QirOptionsService, QirOptionsRepository],
  exports: [QirOptionsService],
})
export class QirOptionsModule {}
