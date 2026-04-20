import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { JobConnectionController } from './job-connection.controller';
import { JobConnectionService } from './job-connection.service';
import { JobConnectionRepository } from './job-connection.repository';

@Module({
  imports: [MysqlModule],
  controllers: [JobConnectionController],
  providers: [JobConnectionService, JobConnectionRepository],
  exports: [JobConnectionService, JobConnectionRepository],
})
export class JobConnectionModule {}
