import { Injectable, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { PlacardRepository } from './placard.repository';

@Injectable()
export class PlacardService {
  constructor(private readonly repository: PlacardRepository) {}

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

  async find(filters: Record<string, unknown>) {
    return this.repository.find(filters);
  }

  async getAll() {
    return this.repository.getAll();
  }

  async getById(id: number): Promise<RowDataPacket> {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_PLACARD_NOT_FOUND',
        message: `Placard with id ${id} not found`,
      });
    }
    return row;
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

  async getPlacardBySoSearch(order: string, partNumber: string, line: string) {
    return this.repository.getPlacardBySoSearch(order, partNumber, line);
  }

  async searchSerialNumber(serialNumber: string) {
    const normalizedSerialNumber = String(serialNumber || '').trim();
    if (!normalizedSerialNumber) {
      return {
        found: false,
        message: 'Serial number is required',
        serialNumber: null,
        customerSerial: null,
        customer: null,
      };
    }

    const row = await this.repository.searchSerialNumber(normalizedSerialNumber);
    if (!row) {
      return {
        found: false,
        message: 'No record found',
        serialNumber: null,
        customerSerial: null,
        customer: null,
      };
    }

    return {
      ...row,
      found: true,
      message: 'Record found',
    };
  }

  async validateWo(woNumber: string) {
    return this.repository.validateWo(woNumber);
  }
}
