import { Module } from '@nestjs/common';
import { PlacardController } from './placard.controller';
import { PlacardService } from './placard.service';
import { PlacardRepository } from './placard.repository';

@Module({
  controllers: [PlacardController],
  providers: [PlacardService, PlacardRepository],
  exports: [PlacardService],
})
export class PlacardModule {}
