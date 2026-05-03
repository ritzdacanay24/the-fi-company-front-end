import { Module } from '@nestjs/common';
import { EmailModule } from '@/shared/email/email.module';
import { EmailNotificationModule } from '../email-notification/email-notification.module';
import { GraphicsProductionModule } from '../graphics-production/graphics-production.module';
import { ScheduledJobsController } from './scheduled-jobs.controller';
import { ScheduledJobsRunnerService } from './scheduled-jobs.runner.service';
import { ScheduledJobsService } from './scheduled-jobs.service';
import {
  CleanTokensHandler,
  CleanUsersHandler,
  FieldServiceOldWorkOrdersHandler,
  PastDueFieldServiceRequestsHandler,
  DropInWorkOrderEmailsHandler,
  VehicleExpirationEmailHandler,
  LnwDeliveryHandler,
  InspectionEmailHandler,
  CertificateOfComplianceHandler,
  CompletedProductionOrdersHandler,
  OverdueOrdersHandler,
  GraphicsWorkOrderHandler,
  MenuBadgeCacheRefreshHandler,
  CleanDbSessionsHandler,
  DashboardPerformanceHandler,
  TotalShippedOrdersHandler,
  ShippingChangesHandler,
  DailyReportInsertHandler,
  OpenShippingRequestsHandler,
  GraphicsDueTodayReportHandler,
  FsJobReportMorningHandler,
  FsJobReportEveningHandler,
  FsJobNoticeHandler,
} from './handlers';

@Module({
  imports: [EmailModule, GraphicsProductionModule, EmailNotificationModule],
  controllers: [ScheduledJobsController],
  providers: [
    ScheduledJobsService,
    ScheduledJobsRunnerService,
    CleanTokensHandler,
    CleanUsersHandler,
    FieldServiceOldWorkOrdersHandler,
    PastDueFieldServiceRequestsHandler,
    DropInWorkOrderEmailsHandler,
    VehicleExpirationEmailHandler,
    LnwDeliveryHandler,
    InspectionEmailHandler,
    CertificateOfComplianceHandler,
    CompletedProductionOrdersHandler,
    OverdueOrdersHandler,
    GraphicsWorkOrderHandler,
    MenuBadgeCacheRefreshHandler,
    CleanDbSessionsHandler,
    DashboardPerformanceHandler,
    TotalShippedOrdersHandler,
    ShippingChangesHandler,
    DailyReportInsertHandler,
    OpenShippingRequestsHandler,
    GraphicsDueTodayReportHandler,
    FsJobReportMorningHandler,
    FsJobReportEveningHandler,
    FsJobNoticeHandler,
  ],
})
export class ScheduledJobsModule {}
