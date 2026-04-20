import { Injectable } from '@nestjs/common';
import { TripExpenseRepository } from './trip-expense.repository';

@Injectable()
export class TripExpenseService {
  constructor(private readonly repository: TripExpenseRepository) {}

  getByWorkOrderId(workOrderId: number) {
    return this.repository.getByWorkOrderId(workOrderId);
  }

  getByFsId(fsSchedulerId: number) {
    return this.repository.getByFsId(fsSchedulerId);
  }
}
