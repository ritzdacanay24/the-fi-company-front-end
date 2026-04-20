import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { TicketEventRepository } from './ticket-event.repository';
import { TicketEventService } from './ticket-event.service';
import { TicketEventController } from './ticket-event.controller';

@Module({
  imports: [MysqlModule],
  providers: [TicketEventRepository, TicketEventService],
  controllers: [TicketEventController],
  exports: [TicketEventService, TicketEventRepository],
})
export class TicketEventModule {}
