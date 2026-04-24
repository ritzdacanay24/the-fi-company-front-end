import { Injectable } from '@nestjs/common';
import { NonBillableCodeRepository } from './non-billable-code.repository';

@Injectable()
export class NonBillableCodeService {
  constructor(private readonly repository: NonBillableCodeRepository) {}

  async getAll(query: Record<string, string>) {
    const selectedViewType = query.selectedViewType;

    if (selectedViewType) {
      return this.repository.getAllByViewType(selectedViewType);
    }

    const { selectedViewType: _ignored, ...filters } = query;
    if (Object.keys(filters).length > 0) {
      return this.repository.find(filters);
    }

    return this.repository.find();
  }

  async getById(id: number) {
    return this.repository.findOne({ id });
  }

  async create(payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    const insertId = await this.repository.create(sanitized);
    return {
      message: 'Successfully Created',
      insertId,
    };
  }

  async update(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    const affectedRows = await this.repository.updateById(id, sanitized);
    return {
      message: affectedRows > 0 ? 'Successfully Updated' : 'No rows updated',
    };
  }

  async delete(id: number) {
    const affectedRows = await this.repository.deleteById(id);
    return {
      message: affectedRows > 0 ? 'Successfully Deleted' : 'No rows deleted',
    };
  }
}
