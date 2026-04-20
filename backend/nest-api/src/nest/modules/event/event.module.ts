import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { EventRepository } from './event.repository';
import { EventService } from './event.service';
import { EventController } from './event.controller';

@Module({
  imports: [MysqlModule],
  providers: [EventRepository, EventService],
  controllers: [EventController],
  exports: [EventService, EventRepository],
})
export class EventModule {}
