import { Controller, Get, Param, Post, Patch, Body, BadRequestException } from '@nestjs/common';
import {
  ScheduledJobDto,
  ScheduledJobRunResultDto,
  ScheduledJobsService,
} from './scheduled-jobs.service';

export interface UpdateScheduledJobDto {
  cron: string;
  active: boolean;
  note?: string;
}

@Controller('scheduled-jobs')
export class ScheduledJobsController {
  constructor(private readonly scheduledJobsService: ScheduledJobsService) {}

  @Get()
  list(): ScheduledJobDto[] {
    return this.scheduledJobsService.listJobs();
  }

  @Post(':id/run')
  async run(@Param('id') id: string): Promise<ScheduledJobRunResultDto> {
    return await this.scheduledJobsService.runJobById(id, 'manual');
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: UpdateScheduledJobDto
  ): ScheduledJobDto {
    if (!data.cron || typeof data.active !== 'boolean') {
      throw new BadRequestException('cron and active fields are required');
    }

    const updated = this.scheduledJobsService.updateJob(id, data);
    if (!updated) {
      throw new BadRequestException(`Scheduled job not found: ${id}`);
    }

    return updated;
  }
}
