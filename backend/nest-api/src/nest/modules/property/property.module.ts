import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { PropertyRepository } from './property.repository';

@Module({
  imports: [MysqlModule],
  controllers: [PropertyController],
  providers: [PropertyService, PropertyRepository],
  exports: [PropertyService],
})
export class PropertyModule {}
