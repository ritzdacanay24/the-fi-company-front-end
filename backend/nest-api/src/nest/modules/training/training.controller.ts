import { Body, Controller, Delete, Get, Headers, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { TrainingService } from './training.service';

@Controller('training')
@UseGuards(RolePermissionGuard)
export class TrainingController {
  constructor(
    @Inject(TrainingService)
    private readonly trainingService: TrainingService,
  ) {}

  @Get('sessions')
  async getSessions() {
    return this.trainingService.getSessions();
  }

  @Get('sessions/:id')
  async getSession(@Param('id') id: string) {
    return this.trainingService.getSession(id);
  }

  @Post('sessions')
  @Permissions('write')
  async createSession(@Body() body: Record<string, unknown> = {}) {
    return this.trainingService.createSession(body);
  }

  @Put('sessions/:id')
  @Permissions('write')
  async updateSession(@Param('id') id: string, @Body() body: Record<string, unknown> = {}) {
    return this.trainingService.updateSession(id, body);
  }

  @Delete('sessions/:id')
  @Permissions('delete')
  async deleteSession(@Param('id') id: string) {
    return this.trainingService.deleteSession(id);
  }

  @Get('sessions/:id/attendance')
  async getSessionAttendance(@Param('id') id: string) {
    return this.trainingService.getSessionAttendance(id);
  }

  @Get('sessions/:id/metrics')
  async getSessionMetrics(@Param('id') id: string) {
    return this.trainingService.getSessionMetrics(id);
  }

  @Get('reports/summary')
  async getReportSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('days') days?: string,
  ) {
    return this.trainingService.getReportSummary(dateFrom, dateTo, days);
  }

  @Get('sessions/:id/export')
  @Permissions('read')
  async exportSessionAttendance(@Param('id') id: string) {
    return this.trainingService.exportAttendanceSheet(id);
  }

  @Post('sessions/:id/expected-attendees')
  @Permissions('write')
  async addExpectedAttendee(@Param('id') id: string, @Body() body: Record<string, unknown> = {}) {
    return this.trainingService.addExpectedAttendee(id, body);
  }

  @Post('sessions/:id/expected-attendees/bulk')
  @Permissions('write')
  async bulkAddExpectedAttendees(@Param('id') id: string, @Body() body: Record<string, unknown> = {}) {
    return this.trainingService.bulkAddExpectedAttendees(id, body);
  }

  @Delete('sessions/:sessionId/expected-attendees/:employeeId')
  @Permissions('write')
  async removeExpectedAttendee(@Param('sessionId') sessionId: string, @Param('employeeId') employeeId: string) {
    return this.trainingService.removeExpectedAttendee(sessionId, employeeId);
  }

  @Delete('attendance/:id')
  @Permissions('delete')
  async removeAttendance(@Param('id') id: string) {
    return this.trainingService.removeAttendance(id);
  }

  @Post('badge-scans')
  @Permissions('write')
  async scanBadge(
    @Body() body: Record<string, unknown> = {},
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ipAddress = forwardedFor?.split(',')[0]?.trim();
    return this.trainingService.scanBadge(body, ipAddress, userAgent);
  }

  @Get('employees')
  async getEmployees() {
    return this.trainingService.getEmployees();
  }

  @Get('employees/search')
  async searchEmployees(@Query('q') q?: string) {
    return this.trainingService.searchEmployees(String(q || ''));
  }

  @Get('employees/by-badge/:badgeNumber')
  async getEmployeeByBadge(@Param('badgeNumber') badgeNumber: string) {
    return this.trainingService.getEmployeeByBadge(badgeNumber);
  }

  @Get('categories')
  async getCategories() {
    return this.trainingService.getCategories();
  }

  @Get('templates')
  async getTemplates(@Query('active') active?: string) {
    return this.trainingService.getTemplates(active);
  }

  @Get('templates/:id')
  async getTemplate(@Param('id') id: string) {
    return this.trainingService.getTemplate(id);
  }

  @Post('templates')
  @Permissions('manage')
  async createTemplate(@Body() body: Record<string, unknown> = {}) {
    return this.trainingService.createTemplate(body);
  }

  @Put('templates/:id')
  @Permissions('manage')
  async updateTemplate(@Param('id') id: string, @Body() body: Record<string, unknown> = {}) {
    return this.trainingService.updateTemplate(id, body);
  }

  @Delete('templates/:id')
  @Permissions('manage')
  async deleteTemplate(@Param('id') id: string) {
    return this.trainingService.deleteTemplate(id);
  }
}
