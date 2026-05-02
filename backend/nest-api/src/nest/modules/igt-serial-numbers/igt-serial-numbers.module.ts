import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { SharedServicesModule } from '@/shared/services/shared-services.module';
import { AccessControlModule } from '@/nest/modules/access-control';
import { IgtSerialNumbersRepository } from './igt-serial-numbers.repository';
import { IgtSerialNumbersService } from './igt-serial-numbers.service';
import { IgtSerialNumbersController } from './igt-serial-numbers.controller';

@Module({
  imports: [MysqlModule, SharedServicesModule, AccessControlModule],
  providers: [IgtSerialNumbersRepository, IgtSerialNumbersService],
  controllers: [IgtSerialNumbersController],
  exports: [IgtSerialNumbersService],
})
export class IgtSerialNumbersModule {}
