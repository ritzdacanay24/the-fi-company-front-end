import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
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
import { HealthModule } from './modules/health';
import { IgtSerialNumbersModule } from './modules/igt-serial-numbers';
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
import { QirModule } from './modules/qir/qir.module';
import { QirResponseModule } from './modules/qir-response/qir-response.module';
import { QirSettingsModule } from './modules/qir-settings/qir-settings.module';
import { QualityOverviewModule } from './modules/quality-overview/quality-overview.module';
import { RfqModule } from './modules/rfq/rfq.module';
import { RmaModule } from './modules/rma/rma.module';
import { SafetyIncidentModule } from './modules/safety-incident';
import { ShortagesModule } from './modules/shortages/shortages.module';
import { ShippingRequestModule } from './modules/shipping-request/shipping-request.module';
import { SgAssetModule } from './modules/sg-asset';
import { TrainingModule } from './modules/training';
import { UniqueLabelsModule } from './modules/unique-labels';
import { UlLabelsModule } from './modules/ul-labels';
import { VehicleInspectionModule } from './modules/vehicle-inspection';
import { VehicleModule } from './modules/vehicle';
import { WipModule } from './modules/wip';
import { MysqlModule } from '../shared/database/mysql.module';
import { EmailModule } from '../shared/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
      cache: true,
    }),
    MysqlModule,
    EmailModule,
    AttachmentsModule,
    AgsSerialModule,
    EyeFiAssetNumbersModule,
    EyeFiSerialModule,
    SerialAvailabilityModule,
    DataScrubModule,
    ForkliftInspectionModule,
    GraphicsBomModule,
    HealthModule,
    IgtSerialNumbersModule,
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
    QirModule,
    QirResponseModule,
    QirSettingsModule,
    QualityOverviewModule,
    RfqModule,
    RmaModule,
    SafetyIncidentModule,
    ShortagesModule,
    ShippingRequestModule,
    SerialAssignmentsModule,
    SgAssetModule,
    TrainingModule,
    UniqueLabelsModule,
    UlLabelsModule,
    VehicleInspectionModule,
    VehicleModule,
    WipModule,
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
