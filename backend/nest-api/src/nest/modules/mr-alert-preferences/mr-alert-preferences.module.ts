import { Module } from '@nestjs/common';
import { MrAlertPreferencesController } from './mr-alert-preferences.controller';
import { MrAlertPreferencesService } from './mr-alert-preferences.service';
import { MrAlertPreferencesRepository } from './mr-alert-preferences.repository';

@Module({
  controllers: [MrAlertPreferencesController],
  providers: [MrAlertPreferencesService, MrAlertPreferencesRepository],
  exports: [MrAlertPreferencesService],
})
export class MrAlertPreferencesModule {}
