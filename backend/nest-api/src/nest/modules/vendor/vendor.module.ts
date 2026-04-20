import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';
import { VendorRepository } from './vendor.repository';

@Module({
  imports: [MysqlModule],
  controllers: [VendorController],
  providers: [VendorService, VendorRepository],
  exports: [VendorService],
})
export class VendorModule {}
