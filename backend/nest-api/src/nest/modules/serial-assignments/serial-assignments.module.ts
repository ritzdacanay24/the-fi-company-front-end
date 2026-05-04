import { Module } from '@nestjs/common';
import { SerialAssignmentsController } from './serial-assignments.controller';
import { SerialAssignmentsRepository } from './serial-assignments.repository';
import { SerialAssignmentsService } from './serial-assignments.service';
import { SgAssetModule } from '../sg-asset';
import { AgsSerialModule } from '../ags-serial';
import { IgtSerialNumbersModule } from '../igt-serial-numbers';

@Module({
  imports: [SgAssetModule, AgsSerialModule, IgtSerialNumbersModule],
  controllers: [SerialAssignmentsController],
  providers: [SerialAssignmentsRepository, SerialAssignmentsService],
  exports: [SerialAssignmentsService],
})
export class SerialAssignmentsModule {}
