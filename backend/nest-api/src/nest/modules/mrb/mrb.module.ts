import { Module } from '@nestjs/common';
import { MrbController } from './mrb.controller';
import { MrbService } from './mrb.service';
import { MrbRepository } from './mrb.repository';

@Module({
  controllers: [MrbController],
  providers: [MrbService, MrbRepository],
  exports: [MrbService],
})
export class MrbModule {}
