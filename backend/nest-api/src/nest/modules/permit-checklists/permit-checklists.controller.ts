import { BadRequestException, Body, Controller, Get, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Permissions, RolePermissionGuard } from '../access-control';
import { PermitChecklistUploadFile, PermitChecklistsService } from './permit-checklists.service';

@Controller('permit-checklists')
@UseGuards(RolePermissionGuard)
export class PermitChecklistsController {
  constructor(private readonly service: PermitChecklistsService) {}

  @Get('bootstrap')
  @Permissions('read')
  async bootstrap() {
    return this.service.bootstrap();
  }

  @Post('upsert-ticket')
  @Permissions('write')
  async upsertTicket(@Body() payload: { ticket?: Record<string, unknown> }) {
    return this.service.upsertTicket(payload?.ticket);
  }

  @Post('remove-attachment')
  @Permissions('delete')
  async removeAttachment(@Body() payload: { ticketId?: string; attachmentId?: string }) {
    return this.service.removeAttachment(payload?.ticketId, payload?.attachmentId);
  }

  @Post('upload-attachment')
  @Permissions('write')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 16 * 1024 * 1024,
      },
    }),
  )
  async uploadAttachment(
    @UploadedFile() file: PermitChecklistUploadFile,
    @Body() payload: { ticketId?: string; uploadedBy?: string },
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    return this.service.uploadAttachment(payload?.ticketId, file, payload?.uploadedBy);
  }

  @Post('delete-ticket')
  @Permissions('delete')
  async deleteTicket(@Body() payload: { ticketId?: string }) {
    return this.service.deleteTicket(payload?.ticketId);
  }

  @Post('hard-delete')
  @Permissions('delete')
  async hardDeleteTicket(@Body() payload: { ticketId?: string; currentUserId?: string }) {
    return this.service.hardDeleteTicket(payload?.ticketId, payload?.currentUserId);
  }

  @Post('sync-transactions')
  @Permissions('write')
  async syncTransactions(@Body() payload: { transactions?: Array<Record<string, unknown>> }) {
    return this.service.syncTransactions(payload?.transactions);
  }

  @Post('sync-directories')
  @Permissions('manage')
  async syncDirectories(
    @Body() payload: { customers?: Array<Record<string, unknown>>; architects?: Array<Record<string, unknown>> },
  ) {
    return this.service.syncDirectories(payload?.customers, payload?.architects);
  }

  @Post('sync-billing-defaults')
  @Permissions('manage')
  async syncBillingDefaults(@Body() payload: { customerBillingDefaultsByType?: Record<string, unknown> }) {
    return this.service.syncBillingDefaults(payload?.customerBillingDefaultsByType);
  }
}
