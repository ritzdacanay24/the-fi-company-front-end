import { Module } from '@nestjs/common';
import { EyeFiSerialController } from './eyefi-serial.controller';
import { EyeFiSerialRepository } from './eyefi-serial.repository';
import { EyeFiSerialService } from './eyefi-serial.service';

@Module({
  controllers: [EyeFiSerialController],
  providers: [EyeFiSerialService, EyeFiSerialRepository],
})
export class EyeFiSerialModule {}
