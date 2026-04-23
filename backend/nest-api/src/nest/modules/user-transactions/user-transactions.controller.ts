import { Controller, Get, Query } from '@nestjs/common';
import { UserTransactionsService } from './user-transactions.service';

@Controller('user-transactions')
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
