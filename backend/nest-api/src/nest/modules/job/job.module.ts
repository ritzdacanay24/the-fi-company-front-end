import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { JobRepository } from './job.repository';

@Module({
  imports: [MysqlModule],
  controllers: [JobController],
  providers: [JobService, JobRepository],
  exports: [JobService],
})
export class JobModule {}
