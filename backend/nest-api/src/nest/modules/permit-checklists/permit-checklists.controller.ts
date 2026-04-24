import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { PermitChecklistsService } from './permit-checklists.service';

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
