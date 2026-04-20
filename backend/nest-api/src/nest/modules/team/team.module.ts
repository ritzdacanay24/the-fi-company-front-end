import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { TeamRepository } from './team.repository';

@Module({
  imports: [MysqlModule],
  controllers: [TeamController],
  providers: [TeamService, TeamRepository],
  exports: [TeamService],
})
export class TeamModule {}
