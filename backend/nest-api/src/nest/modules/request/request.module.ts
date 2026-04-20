import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { RequestController } from './request.controller';
import { RequestService } from './request.service';
import { RequestRepository } from './request.repository';

@Module({
  imports: [MysqlModule],
  controllers: [RequestController],
  providers: [RequestService, RequestRepository],
  exports: [RequestService],
})
export class RequestModule {}
