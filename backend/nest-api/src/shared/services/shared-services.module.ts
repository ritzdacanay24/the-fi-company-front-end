import { Module } from '@nestjs/common';
import { SerialAssignmentLinkService } from './serial-assignment-link.service';

@Module({
  providers: [SerialAssignmentLinkService],
  exports: [SerialAssignmentLinkService],
})
export class SharedServicesModule {}
