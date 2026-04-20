import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { SettingController } from './setting.controller';
import { SettingService } from './setting.service';
import { SettingRepository } from './setting.repository';

@Module({
  imports: [MysqlModule],
  controllers: [SettingController],
  providers: [SettingService, SettingRepository],
  exports: [SettingService],
})
export class SettingModule {}
