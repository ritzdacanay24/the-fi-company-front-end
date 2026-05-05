import { Module } from '@nestjs/common';
import { EmailModule } from '@/shared/email/email.module';
import { EmailNotificationModule } from '../email-notification/email-notification.module';
import { GraphicsProductionModule } from '../graphics-production/graphics-production.module';
import { MenuBadgeModule } from '../menu-badge/menu-badge.module';
import { ReportsModule } from '../reports/reports.module';
import { SerialAvailabilityModule } from '../serial-availability/serial-availability.module';
import { ScheduledJobsController } from './scheduled-jobs.controller';
import { ScheduledJobsRunnerService } from './scheduled-jobs.runner.service';
import { ScheduledJobsService } from './scheduled-jobs.service';
import { ScheduledJobsConfigRepository } from './scheduled-jobs-config.repository';
import {
  CleanUsersHandler,
  FieldServiceOldWorkOrdersHandler,
  PastDueFieldServiceRequestsHandler,
  DropInWorkOrderEmailsHandler,
  VehicleExpirationEmailHandler,
  LnwDeliveryHandler,
  InspectionEmailHandler,
  CompletedProductionOrdersHandler,
  OverdueOrdersHandler,
  GraphicsWorkOrderHandler,
  MenuBadgeCacheRefreshHandler,
  DashboardPerformanceHandler,
  TotalShippedOrdersHandler,
  DailyReportInsertHandler,
  OpenShippingRequestsHandler,
  GraphicsDueTodayReportHandler,
  FsJobReportMorningHandler,
  FsJobReportEveningHandler,
  FsJobNoticeHandler,
  SerialStockAlertHandler,
} from './handlers';

@Module({
  imports: [EmailModule, GraphicsProductionModule, EmailNotificationModule, ReportsModule, MenuBadgeModule, SerialAvailabilityModule],
  controllers: [ScheduledJobsController],
  providers: [
    ScheduledJobsService,
    ScheduledJobsRunnerService,
    ScheduledJobsConfigRepository,
    CleanUsersHandler,
    FieldServiceOldWorkOrdersHandler,
    PastDueFieldServiceRequestsHandler,
    DropInWorkOrderEmailsHandler,
    VehicleExpirationEmailHandler,
    LnwDeliveryHandler,
    InspectionEmailHandler,
    CompletedProductionOrdersHandler,
    OverdueOrdersHandler,
    GraphicsWorkOrderHandler,
    MenuBadgeCacheRefreshHandler,
    DashboardPerformanceHandler,
    TotalShippedOrdersHandler,
    DailyReportInsertHandler,
    OpenShippingRequestsHandler,
    GraphicsDueTodayReportHandler,
    FsJobReportMorningHandler,
    FsJobReportEveningHandler,
    FsJobNoticeHandler,
    SerialStockAlertHandler,
  ],
})
export class ScheduledJobsModule {}
