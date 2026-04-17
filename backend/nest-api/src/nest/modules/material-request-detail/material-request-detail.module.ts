import { Module } from '@nestjs/common';
import { MaterialRequestDetailController } from './material-request-detail.controller';
import { MaterialRequestDetailService } from './material-request-detail.service';
import { MaterialRequestDetailRepository } from './material-request-detail.repository';

@Module({
  controllers: [MaterialRequestDetailController],
  providers: [MaterialRequestDetailService, MaterialRequestDetailRepository],
  exports: [MaterialRequestDetailService],
})
export class MaterialRequestDetailModule {}
