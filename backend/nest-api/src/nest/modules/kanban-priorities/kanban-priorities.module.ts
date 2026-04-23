import { Module } from '@nestjs/common';
import { KanbanPrioritiesController } from './kanban-priorities.controller';
import { KanbanPrioritiesService } from './kanban-priorities.service';

@Module({
  controllers: [KanbanPrioritiesController],
  providers: [KanbanPrioritiesService],
})
export class KanbanPrioritiesModule {}
