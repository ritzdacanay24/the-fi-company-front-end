import { Body, Controller, Get, Post } from '@nestjs/common';
import { PermitChecklistsService } from './permit-checklists.service';

@Controller('permit-checklists')
export class PermitChecklistsController {
  constructor(private readonly service: PermitChecklistsService) {}

  @Get('bootstrap')
  async bootstrap() {
    return this.service.bootstrap();
  }

  @Post('upsert-ticket')
  async upsertTicket(@Body() payload: { ticket?: Record<string, unknown> }) {
    return this.service.upsertTicket(payload?.ticket);
  }

  @Post('delete-ticket')
  async deleteTicket(@Body() payload: { ticketId?: string }) {
    return this.service.deleteTicket(payload?.ticketId);
  }

  @Post('hard-delete')
  async hardDeleteTicket(@Body() payload: { ticketId?: string; currentUserId?: string }) {
    return this.service.hardDeleteTicket(payload?.ticketId, payload?.currentUserId);
  }

  @Post('sync-transactions')
  async syncTransactions(@Body() payload: { transactions?: Array<Record<string, unknown>> }) {
    return this.service.syncTransactions(payload?.transactions);
  }

  @Post('sync-directories')
  async syncDirectories(
    @Body() payload: { customers?: Array<Record<string, unknown>>; architects?: Array<Record<string, unknown>> },
  ) {
    return this.service.syncDirectories(payload?.customers, payload?.architects);
  }

  @Post('sync-billing-defaults')
  async syncBillingDefaults(@Body() payload: { customerBillingDefaultsByType?: Record<string, unknown> }) {
    return this.service.syncBillingDefaults(payload?.customerBillingDefaultsByType);
  }
}
