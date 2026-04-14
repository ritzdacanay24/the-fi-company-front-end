import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { RequestContextMiddleware } from './middlewares/request-context.middleware';
import { ForkliftInspectionModule } from './modules/forklift-inspection';
import { HealthModule } from './modules/health';
import { SafetyIncidentModule } from './modules/safety-incident';
import { VehicleInspectionModule } from './modules/vehicle-inspection';
import { VehicleModule } from './modules/vehicle';
import { WipModule } from './modules/wip';
import { MysqlModule } from '../shared/database/mysql.module';

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
    ForkliftInspectionModule,
    HealthModule,
    SafetyIncidentModule,
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
