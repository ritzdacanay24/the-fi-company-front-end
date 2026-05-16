import { Controller, Get, Param, Post, Patch, Body, BadRequestException, Query, UseGuards } from '@nestjs/common';
import { Public } from '../../decorators/public.decorator';
import { Permissions, RolePermissionGuard } from '../access-control';
import {
  ScheduledJobDto,
  ScheduledJobRunResultDto,
  ScheduledJobsService,
} from './scheduled-jobs.service';
import {
  ScheduledJobRecipientDto,
  ScheduledJobRecipientsService,
  UpsertScheduledJobRecipientDto,
} from './scheduled-job-recipients.service';

export interface UpdateScheduledJobDto {
  cron: string;
  active: boolean;
  note?: string;
}

export interface UpdateScheduledJobRecipientsDto {
  recipients: UpsertScheduledJobRecipientDto[];
}

@Controller('scheduled-jobs')
@UseGuards(RolePermissionGuard)
export class ScheduledJobsController {
  constructor(
    private readonly scheduledJobsService: ScheduledJobsService,
    private readonly scheduledJobRecipientsService: ScheduledJobRecipientsService,
  ) {}

  @Get()
  @Permissions('manage')
  async list(): Promise<ScheduledJobDto[]> {
    return await this.scheduledJobsService.listJobs();
  }

  @Post(':id/run')
  @Permissions('manage')
  async run(@Param('id') id: string): Promise<ScheduledJobRunResultDto> {
    return await this.scheduledJobsService.runJobById(id, 'manual');
  }

  @Post(':id/test-run')
  @Permissions('manage')
  async testRun(@Param('id') id: string): Promise<ScheduledJobRunResultDto> {
    return await this.scheduledJobsService.testRunJobById(id);
  }

  @Get(':id/recipients')
  @Permissions('manage')
  async listRecipients(@Param('id') id: string): Promise<ScheduledJobRecipientDto[]> {
    return this.scheduledJobRecipientsService.list(id);
  }

  @Get('subscriptions/unsubscribe')
  @Public()
  async unsubscribe(
    @Query('token') token?: string,
  ): Promise<{ message: string; jobId: string; email: string; affectedRows: number }> {
    if (!token) {
      throw new BadRequestException('token query parameter is required');
    }

    const result = await this.scheduledJobRecipientsService.unsubscribeWithToken(token);
    return {
      message: result.affectedRows > 0
        ? 'You have been unsubscribed from this scheduled job email.'
        : 'No active subscription was found for this email and scheduled job.',
      ...result,
    };
  }

  @Patch(':id/recipients')
  @Permissions('manage')
  async updateRecipients(
    @Param('id') id: string,
    @Body() data: UpdateScheduledJobRecipientsDto,
  ): Promise<ScheduledJobRecipientDto[]> {
    return this.scheduledJobRecipientsService.replace(id, data?.recipients ?? []);
  }

  @Patch(':id')
  @Permissions('manage')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateScheduledJobDto
  ): Promise<ScheduledJobDto> {
    if (!data.cron || typeof data.active !== 'boolean') {
      throw new BadRequestException('cron and active fields are required');
    }

    const updated = await this.scheduledJobsService.updateJob(id, data);
    if (!updated) {
      throw new BadRequestException(`Scheduled job not found: ${id}`);
    }

    return updated;
  }
}
