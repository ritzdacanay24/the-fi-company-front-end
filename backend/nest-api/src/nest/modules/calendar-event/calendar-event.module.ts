import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { CalendarEventRepository } from './calendar-event.repository';
import { CalendarEventService } from './calendar-event.service';
import { CalendarEventController } from './calendar-event.controller';

@Module({
  imports: [MysqlModule],
  providers: [CalendarEventRepository, CalendarEventService],
  controllers: [CalendarEventController],
  exports: [CalendarEventService, CalendarEventRepository],
})
export class CalendarEventModule {}
