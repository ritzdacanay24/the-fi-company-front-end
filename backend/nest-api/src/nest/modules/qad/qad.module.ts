import { Module } from '@nestjs/common';
import { QadController } from './qad.controller';
import { QadService } from './qad.service';

@Module({
  controllers: [QadController],
  providers: [QadService],
})
export class QadModule {}
