import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { EmailModule } from '@/shared/email/email.module';
import { PartsOrderController } from './parts-order.controller';
import { PartsOrderService } from './parts-order.service';
import { PartsOrderRepository } from './parts-order.repository';

@Module({
  imports: [MysqlModule, EmailModule],
  controllers: [PartsOrderController],
  providers: [PartsOrderService, PartsOrderRepository],
  exports: [PartsOrderService],
})
export class PartsOrderModule {}
