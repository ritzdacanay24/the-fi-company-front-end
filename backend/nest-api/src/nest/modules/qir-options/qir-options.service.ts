import { Injectable, NotFoundException } from '@nestjs/common';
import { QirOptionsRepository } from './qir-options.repository';

@Injectable()
export class QirOptionsService {
  constructor(private readonly repository: QirOptionsRepository) {}

  /** Public form settings — returns same shape as old qir_settings endpoint */
  async getFormSettings() {
    return this.repository.getFormSettings();
  }

  async getCategories() {
    return this.repository.getCategories();
  }

  async getOptions(filters: { category_id?: number; active?: number }) {
    return this.repository.getOptions(filters);
  }

  async getOptionById(id: number) {
    const row = await this.repository.getOptionById(id);
    if (!row) throw new NotFoundException(`QIR option #${id} not found`);
    return row;
  }

  async createOption(payload: {
    category_id: number;
    name: string;
    code?: string | null;
    description?: string | null;
    show_in_public?: number;
    sort_order?: number;
    active?: number;
    created_by?: number | null;
  }) {
    const insertId = await this.repository.createOption(payload);
    return { insertId };
  }

  async updateOption(id: number, payload: Record<string, unknown>) {
    await this.getOptionById(id);
    const rowCount = await this.repository.updateOption(id, payload as any);
    return { rowCount };
  }

  async deleteOption(id: number) {
    await this.getOptionById(id);
    const rowCount = await this.repository.deleteOption(id);
    return { rowCount };
  }

  async updateCategory(id: number, payload: Record<string, unknown>) {
    const rowCount = await this.repository.updateCategory(id, payload as any);
    if (rowCount === 0) throw new NotFoundException(`QIR category #${id} not found`);
    return { rowCount };
  }
}
