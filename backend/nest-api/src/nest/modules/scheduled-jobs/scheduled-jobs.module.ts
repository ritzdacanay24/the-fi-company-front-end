import { Module } from '@nestjs/common';
import { EmailModule } from '@/shared/email/email.module';
import { EmailNotificationModule } from '../email-notification/email-notification.module';
import { GraphicsProductionModule } from '../graphics-production/graphics-production.module';
import { MenuBadgeModule } from '../menu-badge/menu-badge.module';
import { ReportsModule } from '../reports/reports.module';
import { ScheduledJobsController } from './scheduled-jobs.controller';
import { ScheduledJobsRunnerService } from './scheduled-jobs.runner.service';
import { ScheduledJobsService } from './scheduled-jobs.service';
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
} from './handlers';

@Module({
  imports: [EmailModule, GraphicsProductionModule, EmailNotificationModule, ReportsModule, MenuBadgeModule],
  controllers: [ScheduledJobsController],
  providers: [
    ScheduledJobsService,
    ScheduledJobsRunnerService,
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
  ],
})
export class ScheduledJobsModule {}
