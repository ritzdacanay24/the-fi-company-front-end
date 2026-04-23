import { Module } from '@nestjs/common';
import { WorkOrderRoutingController } from './work-order-routing.controller';
import { WorkOrderRoutingService } from './work-order-routing.service';

@Module({
  controllers: [WorkOrderRoutingController],
  providers: [WorkOrderRoutingService],
})
export class WorkOrderRoutingModule {}
