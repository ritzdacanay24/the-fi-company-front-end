import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUserId } from '@/nest/decorators/current-user-id.decorator';
import { Permissions, RolePermissionGuard } from '../access-control';
import { EyeFiSerialService } from './eyefi-serial.service';
import { UpdateEyeFiSerialStatusDto } from './dto/update-eyefi-serial-status.dto';
import { BulkCreateEyeFiSerialDto } from './dto/bulk-create-eyefi-serial.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Controller(['eyefi-serial-numbers', 'quality/eyefi-serial-numbers'])
@UseGuards(RolePermissionGuard)
export class EyeFiSerialController {
  constructor(private readonly eyeFiSerialService: EyeFiSerialService) {}

  // ── Static routes MUST come before parameterised :id routes ───────────────

  @Get('statistics')
  async getStatistics() {
    return this.eyeFiSerialService.getStatistics();
  }

  @Get('product-models')
  async getProductModels() {
    return this.eyeFiSerialService.getProductModels();
  }

  @Get('export')
  async exportCsv(
    @Query('serial_numbers') serialNumbersRaw?: string,
    @Res() res?: Response,
  ) {
    const serialNumbers = serialNumbersRaw ? serialNumbersRaw.split(',').filter(Boolean) : undefined;
    const csv = await this.eyeFiSerialService.exportCsv(serialNumbers);
    const filename = `eyefi_serial_numbers_${new Date().toISOString().split('T')[0]}.csv`;
    res!.setHeader('Content-Type', 'text/csv');
    res!.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res!.send(csv);
  }

  @Get('serial/:serialNumber')
  async getBySerialNumber(@Param('serialNumber') serialNumber: string) {
    return this.eyeFiSerialService.getBySerialNumber(serialNumber);
  }

  @Post('check-existing')
  @Permissions('write')
  async checkExisting(@Body('serial_numbers') serialNumbers: string[] = []) {
    return this.eyeFiSerialService.checkExisting(serialNumbers);
  }

  @Put('serial/:serialNumber/status')
  @Permissions('write')
  async updateStatus(
    @Param('serialNumber') serialNumber: string,
    @Body() dto: UpdateEyeFiSerialStatusDto,
  ) {
    return this.eyeFiSerialService.updateStatus(serialNumber, dto);
  }

  @Get('assignments')
  async getAssignments(
    @Query('serial_number') serial_number?: string,
    @Query('customer_name') customer_name?: string,
    @Query('work_order_number') work_order_number?: string,
    @Query('limit') limit?: string,
  ) {
    return this.eyeFiSerialService.getAssignments({
      serial_number,
      customer_name,
      work_order_number,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('assignments')
  @Permissions('write')
  async createAssignment(@Body() dto: CreateAssignmentDto) {
    return this.eyeFiSerialService.createAssignment(dto);
  }

  @Post('send-report')
  @Permissions('write')
  async sendWorkflowReport(
    @Body() body: Record<string, unknown>,
    @CurrentUserId() userId: number,
  ) {
    return this.eyeFiSerialService.sendWorkflowReportToCurrentUser(body, userId);
  }

  // ── List / search ─────────────────────────────────────────────────────────

  @Get()
  async search(
    @Query('search') search?: string,
    @Query('serial_number') serialNumber?: string,
    @Query('status') status?: string,
    @Query('product_model') product_model?: string,
    @Query('batch_number') batch_number?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.eyeFiSerialService.search({
      search: search || serialNumber,
      status,
      product_model,
      batch_number,
      date_from,
      date_to,
      sort,
      order,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Post('bulk')
  @Permissions('write')
  async bulkCreate(
    @Body() dto: BulkCreateEyeFiSerialDto,
    @CurrentUserId() userId: number,
  ) {
    return this.eyeFiSerialService.bulkCreate(dto, userId);
  }

  // ── Parameterised routes ───────────────────────────────────────────────────

  @Get('assignments/:id')
  async getAssignmentById(@Param('id', ParseIntPipe) id: number) {
    return this.eyeFiSerialService.getAssignmentById(id);
  }

  @Put('assignments/:id')
  @Permissions('write')
  async updateAssignment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.eyeFiSerialService.updateAssignment(id, dto);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.eyeFiSerialService.getById(id);
  }
}
