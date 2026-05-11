import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentUserId } from '@/nest/decorators/current-user-id.decorator';
import { Domain, Permissions, Roles, RolePermissionGuard } from '../access-control';
import { UlLabelsService } from './ul-labels.service';

@Controller('ul-labels')
@UseGuards(RolePermissionGuard)
@Domain('inventory')
export class UlLabelsController {
  constructor(
    @Inject(UlLabelsService)
    private readonly ulLabelsService: UlLabelsService,
  ) {}

  @Get()
  async getLabels(@Query() query: Record<string, string>, @Res() res: Response) {
    if (String(query.export).toLowerCase() === 'true') {
      const csv = await this.ulLabelsService.exportLabelsCsv(query);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="ul-labels-export.csv"');
      return res.send(csv);
    }

    return res.json(await this.ulLabelsService.getLabels(query));
  }

  @Post()
  @Permissions('write')
  async createLabel(
    @Body() body: Record<string, unknown>,
    @CurrentUserId() currentUserId: number,
  ) {
    return this.ulLabelsService.createLabel(body, currentUserId);
  }

  @Put(':id')
  @Roles('admin')
  @Permissions('write')
  async updateLabel(
    @Param('id') idRaw?: string,
    @Body() body: Record<string, unknown> = {},
    @CurrentUserId() currentUserId: number = 0,
  ) {
    return this.ulLabelsService.updateLabel(idRaw, body, currentUserId);
  }

  @Patch(':id/void')
  @Roles('admin')
  @Permissions('write')
  async voidLabel(
    @Param('id') idRaw: string,
    @Body() body: { reason?: string; notes?: string; performed_by?: string } = {},
  ) {
    return this.ulLabelsService.voidLabel(idRaw, body.reason, body.notes, body.performed_by);
  }

  @Post(':id/write-off')
  @Permissions('write')
  async writeOffLabel(
    @Param('id') idRaw: string,
    @Body() body: { reason: 'Damaged' | 'Lost' | 'Other'; notes?: string; performed_by: string },
  ) {
    return this.ulLabelsService.writeOffLabel(idRaw, body.reason, body.notes, body.performed_by ?? 'system');
  }

  @Patch(':id/restore-available')
  @Roles('admin')
  @Permissions('write')
  async restoreLabelAvailability(
    @Param('id') idRaw: string,
    @Body() body: { reason?: string; performed_by?: string } = {},
  ) {
    return this.ulLabelsService.restoreLabelAvailability(idRaw, body.reason, body.performed_by ?? 'system');
  }

  @Post('bulk')
  @Permissions('write')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(
    @UploadedFile() file?: { originalname?: string; buffer: Buffer },
    @Body() body: Record<string, unknown> = {},
    @CurrentUserId() currentUserId: number = 0,
  ) {
    if (file) {
      return this.ulLabelsService.handleBulkUploadFile(file, currentUserId);
    }

    return this.ulLabelsService.handleBulkUploadJson(body, currentUserId);
  }

  @Get('usages')
  async getUsage(@Query() query: Record<string, string>, @Res() res: Response) {
    if (String(query.export).toLowerCase() === 'true') {
      const csv = await this.ulLabelsService.exportUsageCsv(query);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="ul-usage-export.csv"');
      return res.send(csv);
    }

    return res.json(await this.ulLabelsService.getUsage(query));
  }

  @Get('usages/:id')
  async getUsageById(@Param('id') idRaw: string) {
    return this.ulLabelsService.getUsage({ id: idRaw });
  }

  @Post('usages')
  @Permissions('write')
  async createUsage(
    @Body() body: Record<string, unknown> = {},
    @CurrentUserId() currentUserId: number,
  ) {
    return this.ulLabelsService.createUsage(body, currentUserId);
  }

  @Put('usages/:id')
  @Permissions('write')
  async updateUsage(
    @Param('id') idRaw?: string,
    @Body() body: Record<string, unknown> = {},
    @CurrentUserId() currentUserId: number = 0,
  ) {
    return this.ulLabelsService.updateUsage(idRaw, body, currentUserId);
  }

  @Delete('usages/:id')
  @Permissions('delete')
  async deleteUsage(@Param('id') idRaw?: string) {
    return this.ulLabelsService.deleteUsage(idRaw);
  }

  @Post('usages/:id/void')
  @Permissions('write')
  async voidUsage(@Param('id') idRaw: string, @Body() body: Record<string, unknown> = {}) {
    return this.ulLabelsService.voidUsage(idRaw, body.void_reason as string | undefined);
  }

  @Get('numbers')
  async getUlNumbers() {
    return this.ulLabelsService.getUlNumbers();
  }

  @Get('validation/number')
  async validateUlNumber(@Query('ulNumber') ulNumber?: string) {
    return this.ulLabelsService.validateUlNumber(ulNumber);
  }

  @Post('check-existing')
  @Permissions('write')
  async checkExistingUlNumbers(@Body('ul_numbers') ulNumbers: string[] = []) {
    return this.ulLabelsService.checkExistingUlNumbers(ulNumbers);
  }

  @Get('stats/dashboard')
  async getDashboardStats() {
    return this.ulLabelsService.getDashboardStats();
  }

  @Get('validation/work-order')
  async validateWorkOrder(@Query('workOrderNumber') woNumber?: string) {
    return this.ulLabelsService.validateWorkOrder(woNumber);
  }

  @Get('consumed-serials')
  async getConsumedSerials(@Query() query: Record<string, string>) {
    return this.ulLabelsService.getConsumedSerials(query);
  }

  @Get('audit-signoffs')
  async getAuditSignoffs() {
    return this.ulLabelsService.getAuditSignoffs();
  }

  @Post('audit-signoffs')
  @Permissions('write')
  async submitAuditSignoff(@Body() body: Record<string, unknown> = {}) {
    return this.ulLabelsService.submitAuditSignoff(body);
  }

  @Post(':id/image')
  @Permissions('write')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @Param('id') idRaw: string,
    @UploadedFile() file?: { originalname?: string; mimetype?: string; buffer: Buffer },
  ) {
    return this.ulLabelsService.uploadImage(file, idRaw);
  }

  @Get(':id')
  async getLabelById(@Param('id') idRaw: string) {
    return this.ulLabelsService.getLabels({ id: idRaw });
  }
}
