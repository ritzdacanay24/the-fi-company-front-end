import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { LicensedTechsController } from './licensed-techs.controller';
import { LicensedTechsService } from './licensed-techs.service';
import { LicensedTechsRepository } from './licensed-techs.repository';

@Module({
  imports: [MysqlModule],
  controllers: [LicensedTechsController],
  providers: [LicensedTechsService, LicensedTechsRepository],
  exports: [LicensedTechsService],
})
export class LicensedTechsModule {}
