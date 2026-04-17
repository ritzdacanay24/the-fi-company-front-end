import { Module } from '@nestjs/common';
import { ShortagesController } from './shortages.controller';
import { ShortagesService } from './shortages.service';
import { ShortagesRepository } from './shortages.repository';

@Module({
  controllers: [ShortagesController],
  providers: [ShortagesService, ShortagesRepository],
  exports: [ShortagesService],
})
export class ShortagesModule {}
