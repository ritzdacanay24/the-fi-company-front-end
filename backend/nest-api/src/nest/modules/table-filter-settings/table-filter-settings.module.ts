import { Module } from '@nestjs/common';
import { TableFilterSettingsController } from './table-filter-settings.controller';
import { TableFilterSettingsService } from './table-filter-settings.service';
import { TableFilterSettingsRepository } from './table-filter-settings.repository';

@Module({
  controllers: [TableFilterSettingsController],
  providers: [TableFilterSettingsService, TableFilterSettingsRepository],
  exports: [TableFilterSettingsService],
})
export class TableFilterSettingsModule {}
