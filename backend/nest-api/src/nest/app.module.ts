import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AddressSearchModule } from './modules/address-search/address-search.module';
import { AgsSerialModule } from './modules/ags-serial';
import { EyeFiAssetNumbersModule } from './modules/eyefi-asset-numbers';
import { EyeFiSerialModule } from './modules/eyefi-serial';
import { SerialAvailabilityModule } from './modules/serial-availability';
import { DataScrubModule } from './modules/data-scrub';
import { envValidationSchema } from './config/env.validation';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { RequestContextMiddleware } from './middlewares/request-context.middleware';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { ForkliftInspectionModule } from './modules/forklift-inspection';
import { GraphicsBomModule } from './modules/graphics-bom/graphics-bom.module';
import { GraphicsDemandModule } from './modules/graphics-demand/graphics-demand.module';
import { GraphicsProductionModule } from './modules/graphics-production/graphics-production.module';
import { GraphicsScheduleModule } from './modules/graphics-schedule/graphics-schedule.module';
import { HealthModule } from './modules/health';
import { IgtSerialNumbersModule } from './modules/igt-serial-numbers';
import { ItemSearchModule } from './modules/item-search/item-search.module';
import { LateReasonCodesModule } from './modules/late-reason-codes/late-reason-codes.module';
import { MasterControlModule } from './modules/master-control/master-control.module';
import { SerialAssignmentsModule } from './modules/serial-assignments';
import { IgtTransferModule } from './modules/igt-transfer/igt-transfer.module';
import { InventoryByProdLineModule } from './modules/inventory-by-prod-line';
import { MrbModule } from './modules/mrb/mrb.module';
import { MaterialRequestDetailModule } from './modules/material-request-detail/material-request-detail.module';
import { MaterialRequestModule } from './modules/material-request/material-request.module';
import { NcrModule } from './modules/ncr/ncr.module';
import { OrgChartTokenModule } from './modules/org-chart-token/org-chart-token.module';
import { OrgChartModule } from './modules/org-chart/org-chart.module';
import { PlacardModule } from './modules/placard/placard.module';
import { PermitChecklistsModule } from './modules/permit-checklists/permit-checklists.module';
import { PhotoChecklistModule } from './modules/photo-checklist/photo-checklist.module';
import { QadModule } from './modules/qad';
import { QadTablesModule } from './modules/qad-tables/qad-tables.module';
import { QirModule } from './modules/qir/qir.module';
import { QirResponseModule } from './modules/qir-response/qir-response.module';
import { QirSettingsModule } from './modules/qir-settings/qir-settings.module';
import { QualityOverviewModule } from './modules/quality-overview/quality-overview.module';
import { QualityVersionControlModule } from './modules/quality-version-control/quality-version-control.module';
import { TableFilterSettingsModule } from './modules/table-filter-settings/table-filter-settings.module';
import { TableSettingsModule } from './modules/table-settings/table-settings.module';
import { RfqModule } from './modules/rfq/rfq.module';
import { RmaModule } from './modules/rma/rma.module';
import { SafetyIncidentModule } from './modules/safety-incident';
import { ShortagesModule } from './modules/shortages/shortages.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { ShippingRequestModule } from './modules/shipping-request/shipping-request.module';
import { WorkOrderOwnerModule } from './modules/work-order-owner/work-order-owner.module';
import { NotesModule } from './modules/notes/notes.module';
import { OwnersModule } from './modules/owners/owners.module';
import { SgAssetModule } from './modules/sg-asset';
import { TrainingModule } from './modules/training';
import { UniqueLabelsModule } from './modules/unique-labels';
import { UlLabelsModule } from './modules/ul-labels';
import { VehicleInspectionModule } from './modules/vehicle-inspection';
import { VehicleModule } from './modules/vehicle';
import { WipModule } from './modules/wip';
import { UsersModule } from './modules/users';
import { MenuModule } from './modules/menu';
import { PageAccessModule } from './modules/page-access';
import { EmailNotificationModule } from './modules/email-notification';
import { SchedulerModule } from './modules/scheduler';
import { SchedulerEventModule } from './modules/scheduler-event';
import { CalendarEventModule } from './modules/calendar-event';
import { EventModule } from './modules/event';
import { TicketEventModule } from './modules/ticket-event';
import { JobConnectionModule } from './modules/job-connection';
import { KanbanPrioritiesModule } from './modules/kanban-priorities';
import { StatusCategoryModule } from './modules/status-category';
import { NonBillableCodeModule } from './modules/non-billable-code';
import { TripDetailModule } from './modules/trip-detail';
import { TripDetailHeaderModule } from './modules/trip-detail-header';
import { CustomerVisitModule } from './modules/customer-visit';
import { CustomerVisitDetailModule } from './modules/customer-visit-detail';
import { PartsOrderModule } from './modules/parts-order';
import { GeoLocationTrackerModule } from './modules/geo-location-tracker';
import { ServiceTypeModule } from './modules/service-type';
import { SettingModule } from './modules/setting';
import { PlatformModule } from './modules/platform';
import { ReceiptCategoryModule } from './modules/receipt-category';
import { VendorModule } from './modules/vendor';
import { CustomerModule } from './modules/customer';
import { CompanyModule } from './modules/company';
import { PropertyModule } from './modules/property';
import { LicenseModule } from './modules/license';
import { TeamModule } from './modules/team';
import { JobCommentsModule } from './modules/job-comments';
import { LicensedTechsModule } from './modules/licensed-techs';
import { CrashKitModule } from './modules/crash-kit';
import { CommentsModule } from './modules/comments/comments.module';
import { RequestModule } from './modules/request';
import { RequestCommentsModule } from './modules/request-comments';
import { ReceivingModule } from './modules/receiving/receiving.module';
import { SalesOrderSearchModule } from './modules/sales-order-search';
import { WorkOrderModule } from './modules/work-order';
import { ReportsModule } from './modules/reports';
import { JobModule } from './modules/job';
import { SerialModule } from './modules/serial';
import { FieldServiceOverviewModule } from './modules/field-service-overview/field-service-overview.module';
import { TripExpenseModule } from './modules/trip-expense/trip-expense.module';
import { TripExpenseTransactionsModule } from './modules/trip-expense-transactions/trip-expense-transactions.module';
import { FsQirModule } from './modules/fs-qir/fs-qir.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { FileStorageModule } from './modules/file-storage/file-storage.module';
import { MysqlModule } from '../shared/database/mysql.module';
import { EmailModule } from '../shared/email/email.module';
import { UrlModule } from '../shared/url/url.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `../.env.${process.env.NODE_ENV || 'development'}`,
        '../.env',
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
      cache: true,
    }),
    ScheduleModule.forRoot(),
    MysqlModule,
    EmailModule,
    UrlModule,
    AddressSearchModule,
    FileStorageModule,
    AttachmentsModule,
    AgsSerialModule,
    EyeFiAssetNumbersModule,
    EyeFiSerialModule,
    SerialAvailabilityModule,
    DataScrubModule,
    ForkliftInspectionModule,
    GraphicsBomModule,
    GraphicsDemandModule,
    GraphicsProductionModule,
    GraphicsScheduleModule,
    HealthModule,
    IgtSerialNumbersModule,
    ItemSearchModule,
    LateReasonCodesModule,
    MasterControlModule,
    IgtTransferModule,
    InventoryByProdLineModule,
    MaterialRequestModule,
    MaterialRequestDetailModule,
    MrbModule,
    NcrModule,
    OrgChartModule,
    OrgChartTokenModule,
    PlacardModule,
    PermitChecklistsModule,
    PhotoChecklistModule,
    QadModule,
    QadTablesModule,
    QirModule,
    QirResponseModule,
    QirSettingsModule,
    QualityOverviewModule,
    QualityVersionControlModule,
    TableFilterSettingsModule,
    TableSettingsModule,
    RfqModule,
    RmaModule,
    SafetyIncidentModule,
    ShortagesModule,
    ShippingModule,
    ShippingRequestModule,
    WorkOrderOwnerModule,
    NotesModule,
    OwnersModule,
    SerialAssignmentsModule,
    SgAssetModule,
    TrainingModule,
    UniqueLabelsModule,
    UlLabelsModule,
    VehicleInspectionModule,
    VehicleModule,
    WipModule,
    UsersModule,
    MenuModule,
    PageAccessModule,
    EmailNotificationModule,
    SchedulerModule,
    SchedulerEventModule,
    CalendarEventModule,
    EventModule,
    TicketEventModule,
    JobConnectionModule,
    KanbanPrioritiesModule,
    StatusCategoryModule,
    NonBillableCodeModule,
    TripDetailModule,
    TripDetailHeaderModule,
    CustomerVisitModule,
    CustomerVisitDetailModule,
    PartsOrderModule,
    GeoLocationTrackerModule,
    ServiceTypeModule,
    SettingModule,
    PlatformModule,
    ReceiptCategoryModule,
    VendorModule,
    CustomerModule,
    CompanyModule,
    PropertyModule,
    LicenseModule,
    TeamModule,
    JobCommentsModule,
    LicensedTechsModule,
    CrashKitModule,
    CommentsModule,
    RequestModule,
    RequestCommentsModule,
    ReceivingModule,
    SalesOrderSearchModule,
    WorkOrderModule,
    ReportsModule,
    JobModule,
    SerialModule,
    FieldServiceOverviewModule,
    TripExpenseModule,
    TripExpenseTransactionsModule,
    FsQirModule,
    WebsocketModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
