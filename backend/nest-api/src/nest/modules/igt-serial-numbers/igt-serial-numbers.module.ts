import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { IgtSerialNumbersRepository } from './igt-serial-numbers.repository';
import { IgtSerialNumbersService } from './igt-serial-numbers.service';
import { IgtSerialNumbersController } from './igt-serial-numbers.controller';

@Module({
  imports: [MysqlModule],
  providers: [IgtSerialNumbersRepository, IgtSerialNumbersService],
  controllers: [IgtSerialNumbersController],
  exports: [IgtSerialNumbersService],
})
export class IgtSerialNumbersModule {}
