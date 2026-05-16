import { Module } from '@nestjs/common';
import { EmailModule } from '@/shared/email/email.module';
import { EmailNotificationModule } from '../email-notification/email-notification.module';
import { GraphicsProductionModule } from '../graphics-production/graphics-production.module';
import { MenuBadgeModule } from '../menu-badge/menu-badge.module';
import { PhotoChecklistModule } from '../photo-checklist/photo-checklist.module';
import { ReportsModule } from '../reports/reports.module';
import { SerialAvailabilityModule } from '../serial-availability/serial-availability.module';
import { ScheduledJobsController } from './scheduled-jobs.controller';
import { ScheduledJobRecipientsRepository } from './scheduled-job-recipients.repository';
import { ScheduledJobRecipientsService } from './scheduled-job-recipients.service';
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
  FsJobNoticeHandler,
  SerialStockAlertHandler,
  OverdueQirHandler,
  OverdueSafetyIncidentHandler,
  InspectionChecklistReportGeneratorHandler,
  OpenChecklistInstancesLast3DaysHandler,
} from './handlers';

@Module({
  imports: [
    EmailModule,
    GraphicsProductionModule,
    EmailNotificationModule,
    ReportsModule,
    MenuBadgeModule,
    SerialAvailabilityModule,
    PhotoChecklistModule,
  ],
  controllers: [ScheduledJobsController],
  providers: [
    ScheduledJobsService,
    ScheduledJobsRunnerService,
    ScheduledJobsConfigRepository,
    ScheduledJobRecipientsRepository,
    ScheduledJobRecipientsService,
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
    FsJobNoticeHandler,
    SerialStockAlertHandler,
    OverdueQirHandler,
    OverdueSafetyIncidentHandler,
    InspectionChecklistReportGeneratorHandler,
    OpenChecklistInstancesLast3DaysHandler,
  ],
})
export class ScheduledJobsModule {}
