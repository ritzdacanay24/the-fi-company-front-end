import { Module } from '@nestjs/common';
import { WipController } from './wip.controller';
import { WipService } from './wip.service';

@Module({
  controllers: [WipController],
  providers: [WipService],
})
export class WipModule {}
