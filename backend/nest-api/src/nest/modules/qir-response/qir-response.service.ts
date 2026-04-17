import { Injectable, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { QirResponseRepository } from './qir-response.repository';

@Injectable()
export class QirResponseService {
  constructor(private readonly repository: QirResponseRepository) {}

  async getList(query: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll?: boolean;
  }): Promise<RowDataPacket[]> {
    return this.repository.getList({
      selectedViewType: query.selectedViewType,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      isAll: Boolean(query.isAll),
    });
  }

  async getAll() {
    return this.repository.getAll();
  }

  async getById(id: number): Promise<RowDataPacket> {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_QIR_RESPONSE_NOT_FOUND',
        message: `QIR response with id ${id} not found`,
      });
    }

    return row;
  }

  async find(filters: Record<string, string>) {
    return this.repository.find(filters);
  }

  async findOne(filters: Record<string, string>) {
    return this.repository.findOne(filters);
  }

  async create(payload: Record<string, unknown>) {
    const insertId = await this.repository.create(payload);
    return { insertId };
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    await this.getById(id);
    const rowCount = await this.repository.updateById(id, payload);
    return { rowCount };
  }

  async deleteById(id: number) {
    await this.getById(id);
    const rowCount = await this.repository.deleteById(id);
    return { rowCount };
  }
}
