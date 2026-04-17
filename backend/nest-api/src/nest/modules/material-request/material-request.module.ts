import { Module } from '@nestjs/common';
import { MaterialRequestController } from './material-request.controller';
import { MaterialRequestService } from './material-request.service';
import { MaterialRequestRepository } from './material-request.repository';

@Module({
  controllers: [MaterialRequestController],
  providers: [MaterialRequestService, MaterialRequestRepository],
  exports: [MaterialRequestService],
})
export class MaterialRequestModule {}
