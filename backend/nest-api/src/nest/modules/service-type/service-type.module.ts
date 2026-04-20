import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { ServiceTypeController } from './service-type.controller';
import { ServiceTypeService } from './service-type.service';
import { ServiceTypeRepository } from './service-type.repository';

@Module({
  imports: [MysqlModule],
  controllers: [ServiceTypeController],
  providers: [ServiceTypeService, ServiceTypeRepository],
  exports: [ServiceTypeService],
})
export class ServiceTypeModule {}
