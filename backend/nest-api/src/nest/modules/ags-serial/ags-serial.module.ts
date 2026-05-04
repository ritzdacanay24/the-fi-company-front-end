import { Module } from '@nestjs/common';
import { AccessControlModule } from '@/nest/modules/access-control';
import { AgsSerialController } from './ags-serial.controller';
import { AgsSerialRepository } from './ags-serial.repository';
import { AgsSerialService } from './ags-serial.service';

@Module({
  imports: [AccessControlModule],
  controllers: [AgsSerialController],
  providers: [AgsSerialService, AgsSerialRepository],
  exports: [AgsSerialService],
})
export class AgsSerialModule {}
