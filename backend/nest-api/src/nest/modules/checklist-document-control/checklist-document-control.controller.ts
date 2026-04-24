import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Domain, Permissions, RolePermissionGuard } from '../access-control';
import { QualityVersionControlService } from '../quality-version-control/quality-version-control.service';

@Controller('checklist-document-control')
@UseGuards(RolePermissionGuard)
@Domain('quality')
export class ChecklistDocumentControlController {
  constructor(private readonly service: QualityVersionControlService) {}

  @Get()
  @Permissions('read')
  async getAction(
    @Query('action') action?: string,
    @Query('document_id') documentId?: string,
  ) {
    const normalizedAction = String(action || '').trim();

    if (normalizedAction === 'get-revision-history') {
      return this.service.getChecklistRevisionHistory(Number(documentId));
    }

    throw new BadRequestException('Invalid action');
  }

  @Post()
  @Permissions('write')
  async postAction(
    @Query('action') action?: string,
    @Body() payload: Record<string, unknown> = {},
  ) {
    const normalizedAction = String(action || '').trim();

    if (normalizedAction === 'create-document') {
      return this.service.createChecklistDocument(payload as {
        prefix?: string;
        title?: string;
        description?: string;
        department?: string;
        category?: string;
        template_id?: number;
        created_by?: string;
        revision_description?: string;
      });
    }

    if (normalizedAction === 'create-revision') {
      return this.service.createChecklistRevision(payload as {
        document_id?: number;
        template_id?: number;
        revision_description?: string;
        changes_summary?: string;
        items_added?: number;
        items_removed?: number;
        items_modified?: number;
        changes_detail?: unknown;
        created_by?: string;
      });
    }

    if (normalizedAction === 'approve-revision') {
      return this.service.approveChecklistRevision(payload as {
        revision_id?: number;
        approved_by?: string;
      });
    }

    throw new BadRequestException('Invalid action');
  }
}