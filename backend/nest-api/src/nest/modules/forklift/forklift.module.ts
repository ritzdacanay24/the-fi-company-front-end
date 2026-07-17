import { Module } from '@nestjs/common';
import { ForkliftController } from './forklift.controller';
import { ForkliftRepository } from './forklift.repository';
import { ForkliftService } from './forklift.service';

@Module({
  controllers: [ForkliftController],
  providers: [ForkliftService, ForkliftRepository],
})
export class ForkliftModule {}
