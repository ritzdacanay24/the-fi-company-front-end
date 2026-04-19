import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { PhotoChecklistService } from './photo-checklist.service';

@Controller('inspection-checklist')
export class InspectionChecklistController {
  constructor(private readonly service: PhotoChecklistService) {}

  @Get('templates')
  async getTemplates(@Query('include_inactive') includeInactive?: string, @Query('include_deleted') includeDeleted?: string) {
    return this.service.getTemplates({
      includeInactive: includeInactive === '1' || includeInactive === 'true',
      includeDeleted: includeDeleted === '1' || includeDeleted === 'true',
    });
  }

  @Post('templates')
  async createTemplate(@Body() payload: Record<string, unknown>) {
    return this.service.createTemplate(payload);
  }

  @Put('templates/:id')
  async updateTemplate(@Param('id', ParseIntPipe) id: number, @Body() payload: Record<string, unknown>) {
    return this.service.updateTemplate(id, payload);
  }

  @Delete('templates/:id')
  async deleteTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteTemplate(id);
  }

  @Post('templates/:id/hard-delete')
  async hardDeleteTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.service.hardDeleteTemplate(id);
  }

  @Post('templates/:id/discard-draft')
  async discardDraft(@Param('id', ParseIntPipe) id: number) {
    return this.service.discardDraft(id);
  }

  @Post('templates/:id/create-parent-version')
  async createParentVersion(@Param('id', ParseIntPipe) id: number) {
    return this.service.createParentVersion(id);
  }

  @Post('templates/:id/restore')
  async restoreTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.service.restoreTemplate(id);
  }

  @Get('templates/history')
  async getTemplateHistory(@Query('group_id') groupId?: string, @Query('template_id') templateId?: string) {
    return this.service.getTemplateHistory({
      groupId: groupId ? Number(groupId) : undefined,
      templateId: templateId ? Number(templateId) : undefined,
    });
  }

  @Get('templates/compare')
  async compareTemplates(@Query('source_id') sourceId: string, @Query('target_id') targetId: string) {
    return this.service.compareTemplates(Number(sourceId), Number(targetId));
  }

  @Get('templates/:id')
  async getTemplateById(
    @Param('id', ParseIntPipe) id: number,
    @Query('include_inactive') includeInactive?: string,
    @Query('include_deleted') includeDeleted?: string,
  ) {
    return this.service.getTemplateById(id, {
      includeInactive: includeInactive === '1' || includeInactive === 'true',
      includeDeleted: includeDeleted === '1' || includeDeleted === 'true',
    });
  }

  @Get('instances')
  async getInstances(@Query('status') status?: string, @Query('work_order') workOrder?: string) {
    return this.service.getInstances({ status, workOrder });
  }

  @Get('instances/search')
  async searchInstances(
    @Query('part_number') partNumber?: string,
    @Query('serial_number') serialNumber?: string,
    @Query('work_order') workOrderNumber?: string,
    @Query('template_name') templateName?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('status') status?: string,
    @Query('operator') operator?: string,
  ) {
    return this.service.searchInstances({
      partNumber,
      serialNumber,
      workOrderNumber,
      templateName,
      dateFrom,
      dateTo,
      status,
      operator,
    });
  }

  @Get('share-tokens')
  async listShareTokens(@Query('instance_id') instanceId?: string) {
    return this.service.listShareTokens(Number(instanceId || 0));
  }

  @Post('share-tokens')
  async createShareToken(
    @Body()
    payload: {
      instance_id: number;
      visible_item_ids?: number[] | null;
      label?: string | null;
      expires_at?: string | null;
      created_by?: number | null;
      created_by_name?: string | null;
    },
  ) {
    return this.service.createShareToken(payload);
  }

  @Delete('share-tokens/:id')
  async deleteShareToken(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteShareToken(id);
  }

  @Get('share-report/:token')
  async getPublicReport(@Param('token') token: string) {
    return this.service.getPublicReport(token);
  }

  @Get('instances/:id')
  async getInstanceById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getInstanceById(id);
  }

  @Post('instances')
  async createInstance(
    @Body()
    payload: {
      template_id: number;
      work_order_number: string;
      part_number?: string;
      serial_number?: string;
      operator_id?: number | null;
      operator_name?: string;
      status?: string;
    },
  ) {
    return this.service.createInstance(payload);
  }

  @Put('instances/:id')
  async updateInstance(@Param('id', ParseIntPipe) id: number, @Body() payload: Record<string, unknown>) {
    return this.service.updateInstance(id, payload);
  }

  @Post('instances/:id/item-completion')
  async updateInstanceItemCompletion(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: { item_id: number } & Record<string, unknown>,
  ) {
    return this.service.updateInstanceItemCompletion(id, Number(payload.item_id), payload);
  }

  @Delete('instances/:id')
  async deleteInstance(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteInstance(id);
  }

  @Get('config')
  async getConfig() {
    return this.service.getConfig();
  }

  @Post('config')
  async updateConfig(@Body() updates: Record<string, string>) {
    return this.service.updateConfig(updates);
  }
}
