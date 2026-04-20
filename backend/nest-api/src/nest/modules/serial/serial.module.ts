import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { SerialController } from './serial.controller';
import { SerialService } from './serial.service';
import { SerialRepository } from './serial.repository';

@Module({
  imports: [MysqlModule],
  controllers: [SerialController],
  providers: [SerialService, SerialRepository],
  exports: [SerialService],
})
export class SerialModule {}
