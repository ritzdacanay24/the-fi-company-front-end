import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentUserId } from '@/nest/decorators/current-user-id.decorator';
import { Permissions, RolePermissionGuard } from '../access-control';
import { PhotoChecklistService } from './photo-checklist.service';
import { ReportGeneratorService } from './report-generator.service';

@Controller('inspection-checklist')
@UseGuards(RolePermissionGuard)
export class InspectionChecklistController {
  constructor(
    private readonly service: PhotoChecklistService,
    private readonly reportGeneratorService: ReportGeneratorService,
  ) {}

  @Get('templates')
  async getTemplates(@Query('include_inactive') includeInactive?: string, @Query('include_deleted') includeDeleted?: string) {
    return this.service.getTemplates({
      includeInactive: includeInactive === '1' || includeInactive === 'true',
      includeDeleted: includeDeleted === '1' || includeDeleted === 'true',
    });
  }

  @Post('templates')
  @Permissions('write')
  async createTemplate(
    @Body() payload: Record<string, unknown>,
    @CurrentUserId() currentUserId: number,
  ) {
    return this.service.createTemplate({ ...payload, created_by: currentUserId });
  }

  @Put('templates/:id')
  @Permissions('write')
  async updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
    @CurrentUserId() currentUserId: number,
  ) {
    return this.service.updateTemplate(id, payload, currentUserId);
  }

  @Post('templates/:templateId/items')
  @Permissions('write')
  async createTemplateItem(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() body: Record<string, unknown>,
    @CurrentUserId() currentUserId: number,
  ) {
    return this.service.createTemplateItem(templateId, body, currentUserId);
  }

  @Get('templates/:templateId/items/:itemId')
  async getTemplateItem(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.service.getTemplateItem(templateId, itemId);
  }

  @Patch('templates/:templateId/items/reorder')
  @Permissions('write')
  async reorderTemplateItems(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() body: { items: { id: number; order_index: number; level: number; parent_id: number | null }[] },
    @CurrentUserId() currentUserId: number,
  ) {
    return this.service.reorderTemplateItems(templateId, body.items || [], currentUserId);
  }

  @Patch('templates/:templateId/items/:itemId')
  @Permissions('write')
  async updateTemplateItem(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() body: Record<string, unknown>,
    @CurrentUserId() currentUserId: number,
  ) {
    return this.service.updateTemplateItem(templateId, itemId, body, currentUserId);
  }

  @Post('templates/:templateId/items/:itemId/media')
  @Permissions('write')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTemplateItemMedia(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @UploadedFile() file?: { originalname?: string; mimetype?: string; buffer?: Buffer },
    @Body() body?: {
      media_kind?: 'image' | 'video';
      image_type?: 'sample' | 'reference' | 'defect_example' | 'diagram';
      is_primary?: boolean | string;
      label?: string;
      description?: string;
    },
  ) {
    return this.service.uploadTemplateItemMedia(templateId, itemId, file, {
      media_kind: body?.media_kind,
      image_type: body?.image_type,
      is_primary: body?.is_primary === true || body?.is_primary === 'true',
      label: body?.label,
      description: body?.description,
    });
  }

  @Delete('templates/:templateId/items/:itemId')
  @Permissions('write')
  async deleteTemplateItem(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.service.deleteTemplateItem(templateId, itemId);
  }

  @Delete('templates/:id')
  @Permissions('delete')
  async deleteTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteTemplate(id);
  }

  @Post('templates/:id/hard-delete')
  @Permissions('delete')
  async hardDeleteTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.service.hardDeleteTemplate(id);
  }

  @Post('templates/:id/publish')
  @Permissions('write')
  async publishTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.service.publishTemplate(id);
  }

  @Post('templates/:id/discard-draft')
  @Permissions('write')
  async discardDraft(@Param('id', ParseIntPipe) id: number) {
    return this.service.discardDraft(id);
  }

  @Post('templates/:id/create-parent-version')
  @Permissions('write')
  async createParentVersion(@Param('id', ParseIntPipe) id: number, @CurrentUserId() currentUserId: number) {
    return this.service.createParentVersion(id, currentUserId);
  }

  @Post('templates/delete-major-version')
  @Permissions('delete')
  async deleteMajorVersion(@Body() body: { group_id: number; major: number }) {
    return this.service.deleteMajorVersion(Number(body.group_id), Number(body.major));
  }

  @Post('templates/:id/restore')
  @Permissions('write')
  async restoreTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.service.restoreTemplate(id);
  }

  // ── Draft template owner-lock endpoints ──────────────────────────────────

  @Post('templates/:id/claim')
  @Permissions('write')
  async claimTemplateDraft(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserId() userId: number,
    @Body() body: { user_name?: string },
  ) {
    return this.service.claimTemplateDraft(id, userId, body.user_name ?? '');
  }

  @Post('templates/:id/release')
  @Permissions('write')
  async releaseTemplateDraft(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserId() userId: number,
  ) {
    return this.service.releaseTemplateDraft(id, userId);
  }

  @Post('templates/:id/transfer')
  @Permissions('write')
  async transferTemplateDraft(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserId() callerId: number,
    @Body() body: { to_user_id: number; to_user_name: string },
  ) {
    return this.service.transferTemplateDraft(id, callerId, Number(body.to_user_id), body.to_user_name ?? '');
  }

  @Post('templates/:id/transfer-admin')
  @Permissions('manage')
  async transferTemplateDraftAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { to_user_id: number; to_user_name: string },
  ) {
    return this.service.transferTemplateDraftAdmin(id, Number(body.to_user_id), body.to_user_name ?? '');
  }

  // ─────────────────────────────────────────────────────────────────────────

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

  @Get('templates/:id/export-pdf')
  async exportTemplatePdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { fileName, buffer } = await this.service.exportTemplatePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
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
  @Permissions('write')
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
    @CurrentUserId() currentUserId: number,
  ) {
    return this.service.createShareToken({ ...payload, created_by: currentUserId });
  }

  @Delete('share-tokens/:id')
  @Permissions('delete')
  async deleteShareToken(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteShareToken(id);
  }

  @Get('share-report/:token')
  async getPublicReport(@Param('token') token: string) {
    return this.service.getPublicReport(token);
  }

  @Get('instances/:id')
    async getInstanceById(
      @Param('id', ParseIntPipe) id: number,
      @Query('include_media_by_item') includeMediaByItemRaw?: string,
      @Query('include_template_items') includeTemplateItemsRaw?: string,
      @Query('nav_only') navOnlyRaw?: string,
    ) {
      const includeMediaByItem = includeMediaByItemRaw == null
        ? true
        : !['0', 'false', 'no'].includes(String(includeMediaByItemRaw).trim().toLowerCase());
      const includeTemplateItems = includeTemplateItemsRaw == null
        ? true
        : !['0', 'false', 'no'].includes(String(includeTemplateItemsRaw).trim().toLowerCase());
      const navOnly = navOnlyRaw == null
        ? false
        : ['1', 'true', 'yes'].includes(String(navOnlyRaw).trim().toLowerCase());

        return this.service.getInstanceById(id, { includeMediaByItem, includeTemplateItems, navOnly });
  }

  @Get('instances/:id/items/:itemId/media')
  async getInstanceItemMedia(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.service.getInstanceItemMedia(id, itemId);
  }

  @Post('instances')
  @Permissions('write')
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
  @Permissions('write')
  async updateInstance(@Param('id', ParseIntPipe) id: number, @Body() payload: Record<string, unknown>) {
    const nextStatus = String(payload?.status || '').trim().toLowerCase();
    const updates = { ...payload };
    if (nextStatus === 'submitted' && !updates.submitted_at) {
      updates.submitted_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    const result = await this.service.updateInstance(id, updates);

    if (nextStatus === 'submitted') {
      await this.reportGeneratorService.processFinalSubmissionNow(id);
    }

    return result;
  }

  @Patch('instances/:id/undo-submit')
  @Permissions('manage')
  async undoSubmittedInstance(@Param('id', ParseIntPipe) id: number) {
    return this.service.undoSubmittedInstance(id);
  }

  @Patch('instances/:id/details')
  @Permissions('write')
  async updateInstanceDetails(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: { work_order_number?: string; part_number?: string; serial_number?: string },
    @CurrentUserId() currentUserId: number,
  ) {
    return this.service.updateInstanceDetails(id, payload, currentUserId);
  }

  @Post('instances/:id/item-completion')
  @Permissions('write')
  async updateInstanceItemCompletion(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: { item_id: number } & Record<string, unknown>,
    @CurrentUserId() currentUserId: number,
  ) {
    return this.service.updateInstanceItemCompletion(id, Number(payload.item_id), payload, currentUserId);
  }

  @Post('media/upload')
  @UseInterceptors(FileInterceptor('photo'))
  @Permissions('write')
  async uploadMedia(
    @Body('instance_id', ParseIntPipe) instanceId: number,
    @Body('item_id', ParseIntPipe) itemId: number,
    @Body('capture_source') captureSource: string | undefined,
    @Body('user_id') userId: string | undefined,
    @CurrentUserId() currentUserId: number,
    @UploadedFile() file?: { originalname?: string; mimetype?: string; size?: number; buffer?: Buffer },
  ) {
    return this.service.uploadMedia(instanceId, itemId, file, {
      captureSource,
      userId,
      callerId: currentUserId,
    });
  }

  @Delete('media/:id')
  @Permissions('delete')
  async deleteMediaById(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteMediaById(id);
  }

  @Post('media/delete-by-locator')
  @Permissions('delete')
  async deleteMediaByLocator(
    @Body()
    payload: {
      instance_id: number;
      item_id: number;
      file_url: string;
    },
  ) {
    return this.service.deleteMediaByLocator(payload.instance_id, payload.item_id, payload.file_url);
  }

  @Post('media/delete-own')
  async deleteOwnMedia(
    @CurrentUserId() userId: number,
    @Body() payload: { instance_id: number; item_id: number; file_url: string; media_id?: number },
  ) {
    return this.service.deleteOwnMedia(payload.instance_id, payload.item_id, payload.file_url, userId, payload.media_id);
  }

  @Get('instances/:id/export')
  async exportInstance(@Param('id', ParseIntPipe) id: number) {
    return this.service.getInstanceById(id);
  }

  @Post('instances/:id/final-submission-pdf')
  @Permissions('write')
  async generateFinalSubmissionPdf(@Param('id', ParseIntPipe) id: number) {
    return this.service.generateFinalSubmissionPdf(id);
  }

  @Get('instances/:id/final-submission-pdf')
  async getFinalSubmissionPdfInfo(@Param('id', ParseIntPipe) id: number) {
    const instance = await this.service.getInstanceById(id) as Record<string, unknown>;
    const status = String(instance?.status || '').trim().toLowerCase();

    if (status !== 'submitted') {
      return {
        success: false,
        status: 'not_submitted',
        message: 'Final submission PDF is only available for submitted inspections.',
      };
    }

    const report = await this.reportGeneratorService.getReportDownloadInfo(id);
    if (report.status === 'none') {
      const generated = await this.service.generateFinalSubmissionPdf(id) as Record<string, unknown>;
      return {
        success: true,
        status: 'ready',
        download_url: String(generated?.download_url || generated?.file_url || generated?.file_name || ''),
      };
    }

    return {
      success: true,
      ...report,
    };
  }

  @Delete('instances/:id')
  @Permissions('delete')
  async deleteInstance(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteInstance(id);
  }

  @Patch('instances/:id/archive')
  @Permissions('manage')
  async archiveInstance(@Param('id', ParseIntPipe) id: number) {
    return this.service.archiveInstance(id);
  }

  // ── Owner-lock endpoints ──────────────────────────────────────────────────

  @Post('instances/:id/claim')
  @Permissions('write')
  async claimInstance(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserId() userId: number,
    @Body() body: { user_name?: string },
  ) {
    return this.service.claimInstance(id, userId, body.user_name ?? '');
  }

  @Post('instances/:id/release')
  @Permissions('write')
  async releaseInstance(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserId() userId: number,
  ) {
    return this.service.releaseInstance(id, userId);
  }

  @Post('instances/:id/transfer')
  @Permissions('write')
  async transferInstance(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserId() callerId: number,
    @Body() body: { to_user_id: number; to_user_name: string },
  ) {
    return this.service.transferInstance(id, callerId, Number(body.to_user_id), body.to_user_name ?? '');
  }

  @Post('instances/:id/transfer-admin')
  @Permissions('manage')
  async transferInstanceAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { to_user_id: number; to_user_name: string },
  ) {
    return this.service.transferInstanceAdmin(id, Number(body.to_user_id), body.to_user_name ?? '');
  }

  @Post('instances/transfer-bulk')
  @Permissions('manage')
  async transferInstancesBulk(
    @Body() body: { instance_ids: number[]; to_user_id: number; to_user_name: string },
  ) {
    return this.service.bulkTransferInstancesAdmin(
      body?.instance_ids || [],
      Number(body?.to_user_id),
      body?.to_user_name ?? '',
    );
  }

  // ─────────────────────────────────────────────────────────────────────────

  @Get('config')
  async getConfig() {
    return this.service.getConfig();
  }
  @Post('config')
  @Permissions('manage')
  async updateConfig(@Body() updates: Record<string, string>) {
    return this.service.updateConfig(updates);
  }
}
