import { Injectable } from '@nestjs/common';
import { TripExpenseTransactionsRepository } from './trip-expense-transactions.repository';

@Injectable()
export class TripExpenseTransactionsService {
  constructor(private readonly repository: TripExpenseTransactionsRepository) {}

  getByFsId(fsId: number, workOrderId?: number) {
    return this.repository.getByFsId(fsId, workOrderId);
  }

  getByWorkOrderId(workOrderId: number) {
    return this.repository.getByWorkOrderId(workOrderId);
  }

  getById(id: number) {
    return this.repository.getById(id);
  }

  async create(payload: Record<string, unknown>) {
    const insertId = await this.repository.create(payload);
    return { insertId, ...payload };
  }

  async updateCreditCardTransactionById(id: number, payload: Record<string, unknown>) {
    const affectedRows = await this.repository.updateCreditCardTransactionById(id, payload);
    return { affectedRows };
  }

  async deleteById(id: number) {
    const affectedRows = await this.repository.deleteById(id);
    return { affectedRows };
  }
}
