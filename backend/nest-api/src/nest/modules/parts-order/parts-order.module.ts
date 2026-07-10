import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { EmailModule } from '@/shared/email/email.module';
import { EmailNotificationsModule } from '../email-notifications';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { PartsOrderController } from './parts-order.controller';
import { PartsOrderService } from './parts-order.service';
import { PartsOrderRepository } from './parts-order.repository';

@Module({
  imports: [MysqlModule, EmailModule, EmailNotificationsModule, FileStorageModule, AttachmentsModule],
  controllers: [PartsOrderController],
  providers: [PartsOrderService, PartsOrderRepository],
  exports: [PartsOrderService],
})
export class PartsOrderModule {}
