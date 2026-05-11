import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { EmailModule } from '@/shared/email/email.module';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { SupportTicketsController } from './support-tickets.controller';
import { SupportTicketsPublicController } from './support-tickets.public.controller';
import { SupportTicketsService } from './support-tickets.service';
import { SupportTicketsRepository } from './support-tickets.repository';

@Module({
  imports: [MysqlModule, EmailModule, FileStorageModule],
  controllers: [SupportTicketsController, SupportTicketsPublicController],
  providers: [SupportTicketsService, SupportTicketsRepository],
  exports: [SupportTicketsService, SupportTicketsRepository],
})
export class SupportTicketsModule {}
