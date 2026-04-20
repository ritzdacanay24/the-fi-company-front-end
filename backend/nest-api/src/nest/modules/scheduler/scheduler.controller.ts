import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseIntPipe } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulerRecord } from './scheduler.repository';

@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get()
  async getAll(): Promise<SchedulerRecord[]> {
    return this.schedulerService.getAll();
  }

  @Get('find')
  async find(@Query() params: Record<string, unknown>): Promise<SchedulerRecord[]> {
    return this.schedulerService.find(params);
  }

  @Get('byDateRange')
  async getByDateRange(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<SchedulerRecord[]> {
    return this.schedulerService.getByDateRange(dateFrom, dateTo);
  }

  @Get('searchByJob')
  async searchByJob(@Query('text') text: string): Promise<any[]> {
    return this.schedulerService.searchByJob(text);
  }

  @Get('connectingJobsByTech')
  async getConnectingJobsByTech(
    @Query('tech') tech: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<SchedulerRecord[]> {
    return this.schedulerService.getConnectingJobsByTech(tech, dateFrom, dateTo);
  }

  @Get('connectingJobs')
  async getConnectingJobs(@Query('group_id') groupId: number): Promise<SchedulerRecord[]> {
    return this.schedulerService.getConnectingJobs(groupId);
  }

  @Get('groupJobs')
  async getGroupJobs(@Query('group_id') groupId: number): Promise<SchedulerRecord[]> {
    return this.schedulerService.getGroupJobs(groupId);
  }

  @Get('assignments')
  async getAssignments(
    @Query('user') user: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<any[]> {
    return this.schedulerService.getAssignments(user, dateFrom, dateTo);
  }

  @Get('jobByUser')
  async getJobByUser(@Query('user') user: string): Promise<SchedulerRecord[]> {
    return this.schedulerService.getJobByUser(user);
  }

  @Get('schedulerByDateRange')
  async getSchedulerByDateRange(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<SchedulerRecord[]> {
    return this.schedulerService.getSchedulerByDateRange(dateFrom, dateTo);
  }

  @Get('calendar')
  async getCalendar(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<any[]> {
    return this.schedulerService.getCalendar(dateFrom, dateTo);
  }

  @Get('techSchedule')
  async getTechSchedule(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<Record<string, unknown>> {
    return this.schedulerService.getTechSchedule(dateFrom, dateTo);
  }

  @Get('map')
  async getMap(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<any[]> {
    return this.schedulerService.getMap(dateFrom, dateTo);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<SchedulerRecord | null> {
    return this.schedulerService.findOne(id);
  }

  @Post()
  async create(@Body() payload: Record<string, unknown>): Promise<SchedulerRecord | null> {
    return this.schedulerService.create(payload);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() payload: Record<string, unknown>): Promise<SchedulerRecord | null> {
    return this.schedulerService.update(id, payload);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<boolean> {
    return this.schedulerService.delete(id);
  }
}
