import { Module } from '@nestjs/common';
import { SerialAssignmentsController } from './serial-assignments.controller';
import { SerialAssignmentsRepository } from './serial-assignments.repository';
import { SerialAssignmentsService } from './serial-assignments.service';

@Module({
  controllers: [SerialAssignmentsController],
  providers: [SerialAssignmentsRepository, SerialAssignmentsService],
  exports: [SerialAssignmentsService],
})
export class SerialAssignmentsModule {}
