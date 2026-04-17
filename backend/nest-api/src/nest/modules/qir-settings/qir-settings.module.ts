import { Module } from '@nestjs/common';
import { QirSettingsController } from './qir-settings.controller';
import { QirSettingsService } from './qir-settings.service';
import { QirSettingsRepository } from './qir-settings.repository';

@Module({
  controllers: [QirSettingsController],
  providers: [QirSettingsService, QirSettingsRepository],
  exports: [QirSettingsService],
})
export class QirSettingsModule {}
