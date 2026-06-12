import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { EquipmentPrintersController } from './equipment-printers.controller';
import { EquipmentPrintersService } from './equipment-printers.service';
import { EquipmentPrintersRepository } from './equipment-printers.repository';
import { EquipmentPrintersAlertsRunnerService } from './equipment-printers.alerts.runner.service';

@Module({
  imports: [MysqlModule],
  controllers: [EquipmentPrintersController],
  providers: [
    EquipmentPrintersService,
    EquipmentPrintersRepository,
    EquipmentPrintersAlertsRunnerService,
  ],
  exports: [EquipmentPrintersService, EquipmentPrintersAlertsRunnerService],
})
export class EquipmentPrintersModule {}
