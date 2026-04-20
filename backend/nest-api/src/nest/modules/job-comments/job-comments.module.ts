import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { JobCommentsController } from './job-comments.controller';
import { JobCommentsService } from './job-comments.service';
import { JobCommentsRepository } from './job-comments.repository';

@Module({
  imports: [MysqlModule],
  controllers: [JobCommentsController],
  providers: [JobCommentsService, JobCommentsRepository],
  exports: [JobCommentsService],
})
export class JobCommentsModule {}
