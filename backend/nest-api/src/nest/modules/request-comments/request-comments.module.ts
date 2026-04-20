import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { RequestCommentsController } from './request-comments.controller';
import { RequestCommentsService } from './request-comments.service';
import { RequestCommentsRepository } from './request-comments.repository';

@Module({
  imports: [MysqlModule],
  controllers: [RequestCommentsController],
  providers: [RequestCommentsService, RequestCommentsRepository],
  exports: [RequestCommentsService],
})
export class RequestCommentsModule {}
