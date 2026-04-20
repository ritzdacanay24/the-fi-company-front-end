import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { JobConnectionService } from './job-connection.service';

@Controller('job-connection')
export class JobConnectionController {
  constructor(private readonly service: JobConnectionService) {}

  @Get('getJobConnections')
  async getJobConnections(@Query('job_id', ParseIntPipe) jobId: number) {
    return this.service.getJobConnections(jobId);
  }

  @Post('createJobConnection')
  async createJobConnection(@Body() payload: Record<string, unknown>) {
    return this.service.createJobConnection(payload as any);
  }

  @Delete('deleteJobConnection/:id')
  async deleteJobConnection(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteJobConnection(id);
  }

  @Put('updateJobConnection/:id')
  async updateJobConnection(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: { relationship_type?: string; notes?: string },
  ) {
    return this.service.updateJobConnection(id, payload);
  }

  @Get('getConnectionStats')
  async getConnectionStats(@Query('job_id', ParseIntPipe) jobId: number) {
    return this.service.getConnectionStats(jobId);
  }

  @Get('getJobsWithConnections')
  async getJobsWithConnections() {
    return this.service.getJobsWithConnections();
  }

  @Get('searchConnectableJobs')
  async searchConnectableJobs(
    @Query('current_job_id', ParseIntPipe) currentJobId: number,
    @Query('search') search?: string,
  ) {
    return this.service.searchConnectableJobs(currentJobId, search);
  }
}
