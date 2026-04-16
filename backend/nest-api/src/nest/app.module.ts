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
import { HealthModule } from './modules/health';
import { IgtSerialNumbersModule } from './modules/igt-serial-numbers';
import { SerialAssignmentsModule } from './modules/serial-assignments';
import { IgtTransferModule } from './modules/igt-transfer/igt-transfer.module';
import { InventoryByProdLineModule } from './modules/inventory-by-prod-line';
import { NcrModule } from './modules/ncr/ncr.module';
import { QadModule } from './modules/qad';
import { SafetyIncidentModule } from './modules/safety-incident';
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
    HealthModule,
    IgtSerialNumbersModule,
    IgtTransferModule,
    InventoryByProdLineModule,
    NcrModule,
    QadModule,
    SafetyIncidentModule,
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
