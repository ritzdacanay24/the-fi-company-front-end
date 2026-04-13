import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { WipModule } from './modules/wip/wip.module';

@Module({
  imports: [HealthModule, WipModule],
})
export class AppModule {}
