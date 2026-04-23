import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './reports.repository';
import { DailyReportService } from './daily-report.service';
import { DailyReportRepository } from './daily-report.repository';

@Module({
  imports: [MysqlModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository, DailyReportService, DailyReportRepository],
  exports: [ReportsService],
})
export class ReportsModule {}
