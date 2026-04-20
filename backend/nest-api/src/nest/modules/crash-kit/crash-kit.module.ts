import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { CrashKitController } from './crash-kit.controller';
import { CrashKitService } from './crash-kit.service';
import { CrashKitRepository } from './crash-kit.repository';

@Module({
  imports: [MysqlModule],
  controllers: [CrashKitController],
  providers: [CrashKitService, CrashKitRepository],
  exports: [CrashKitService],
})
export class CrashKitModule {}
