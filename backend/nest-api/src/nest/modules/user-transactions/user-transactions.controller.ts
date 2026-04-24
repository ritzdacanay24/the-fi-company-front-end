import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { UserTransactionsService } from './user-transactions.service';

@Controller('user-transactions')
@UseGuards(RolePermissionGuard)
export class UserTransactionsController {
  constructor(private readonly service: UserTransactionsService) {}

  @Get('get-user-trans-by-field-name')
  async getUserTransByFieldName(@Query('so') so?: string): Promise<Record<string, unknown>[]> {
    const soNumber = String(so || '').trim();
    if (!soNumber) {
      return [];
    }

    return this.service.getUpdatedOwnerTransactions(soNumber);
  }
}
