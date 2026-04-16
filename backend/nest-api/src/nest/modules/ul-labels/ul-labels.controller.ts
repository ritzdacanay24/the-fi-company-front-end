import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UlLabelsService } from './ul-labels.service';

@Controller('ul-labels')
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
  async createLabel(@Body() body: Record<string, unknown>) {
    return this.ulLabelsService.createLabel(body);
  }

  @Put(':id')
  async updateLabel(@Param('id') idRaw?: string, @Body() body: Record<string, unknown> = {}) {
    return this.ulLabelsService.updateLabel(idRaw, body);
  }

  @Delete(':id')
  async deleteLabel(@Param('id') idRaw?: string) {
    return this.ulLabelsService.deleteLabel(idRaw);
  }

  @Post('bulk')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(
    @UploadedFile() file?: { originalname?: string; buffer: Buffer },
    @Body() body: Record<string, unknown> = {},
  ) {
    if (file) {
      return this.ulLabelsService.handleBulkUploadFile(file);
    }

    return this.ulLabelsService.handleBulkUploadJson(body);
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
  async createUsage(@Body() body: Record<string, unknown> = {}) {
    return this.ulLabelsService.createUsage(body);
  }

  @Put('usages/:id')
  async updateUsage(@Param('id') idRaw?: string, @Body() body: Record<string, unknown> = {}) {
    return this.ulLabelsService.updateUsage(idRaw, body);
  }

  @Delete('usages/:id')
  async deleteUsage(@Param('id') idRaw?: string) {
    return this.ulLabelsService.deleteUsage(idRaw);
  }

  @Post('usages/:id/void')
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
  async submitAuditSignoff(@Body() body: Record<string, unknown> = {}) {
    return this.ulLabelsService.submitAuditSignoff(body);
  }

  @Post(':id/image')
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
