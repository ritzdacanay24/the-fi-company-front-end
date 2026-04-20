import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { LicenseController } from './license.controller';
import { LicenseService } from './license.service';
import { LicenseRepository } from './license.repository';

@Module({
  imports: [MysqlModule],
  controllers: [LicenseController],
  providers: [LicenseService, LicenseRepository],
  exports: [LicenseService],
})
export class LicenseModule {}
