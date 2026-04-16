import { Module } from '@nestjs/common';
import { AgsSerialController } from './ags-serial.controller';
import { AgsSerialRepository } from './ags-serial.repository';
import { AgsSerialService } from './ags-serial.service';

@Module({
  controllers: [AgsSerialController],
  providers: [AgsSerialService, AgsSerialRepository],
})
export class AgsSerialModule {}
