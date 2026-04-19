import { Module } from '@nestjs/common';
import { TableSettingsController } from './table-settings.controller';
import { TableSettingsService } from './table-settings.service';
import { TableSettingsRepository } from './table-settings.repository';

@Module({
  controllers: [TableSettingsController],
  providers: [TableSettingsService, TableSettingsRepository],
  exports: [TableSettingsService],
})
export class TableSettingsModule {}
