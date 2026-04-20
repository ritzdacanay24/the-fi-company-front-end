import { Injectable } from '@nestjs/common';
import { NonBillableCodeRepository } from './non-billable-code.repository';

@Injectable()
export class NonBillableCodeService {
  constructor(private readonly repository: NonBillableCodeRepository) {}

  async getAll(selectedViewType?: string) {
    return this.repository.getAllByViewType(selectedViewType);
  }

  async find(query: Record<string, unknown>) {
    return this.repository.find(query);
  }
}
