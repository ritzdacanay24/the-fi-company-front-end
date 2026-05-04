import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { ProjectManagerController } from './project-manager.controller';
import { ProjectManagerService } from './project-manager.service';
import { ProjectManagerRepository } from './project-manager.repository';
import { PmTasksController } from './pm-tasks.controller';
import { PmTasksService } from './pm-tasks.service';
import { PmTasksRepository } from './pm-tasks.repository';

@Module({
  imports: [MysqlModule],
  controllers: [ProjectManagerController, PmTasksController],
  providers: [ProjectManagerService, ProjectManagerRepository, PmTasksService, PmTasksRepository],
  exports: [ProjectManagerService, PmTasksService],
})
export class ProjectManagerModule {}
