import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PropertyRepository } from './property.repository';

@Injectable()
export class PropertyService {
  constructor(private readonly repository: PropertyRepository) {}

  private normalizeProperty(record: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!record) {
      return null;
    }

    const normalizeArrayField = (value: unknown): string[] | null => {
      if (typeof value !== 'string' || value.trim() === '') {
        return null;
      }
      return value.split(',').map((item) => item.trim()).filter((item) => item.length > 0);
    };

    return {
      ...record,
      licensed_techs: normalizeArrayField(record['licensed_techs']),
      compliance_phone_numbers: normalizeArrayField(record['compliance_phone_numbers']),
    };
  }

  private preparePayload(payload: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = { ...payload };

    if (Array.isArray(normalized['licensed_techs'])) {
      normalized['licensed_techs'] = (normalized['licensed_techs'] as unknown[]).join(',');
    }

    if (Array.isArray(normalized['compliance_phone_numbers'])) {
      normalized['compliance_phone_numbers'] = (normalized['compliance_phone_numbers'] as unknown[]).join(',');
    }

    return normalized;
  }

  async find() {
    return this.repository.findMapRows();
  }

  async getAll(selectedViewType?: string) {
    return this.repository.getAll(selectedViewType);
  }

  async getById(id: number) {
    const row = await this.repository.findOne({ id });
    return this.normalizeProperty((row as unknown as Record<string, unknown>) ?? null);
  }

  async getAllPropertyByText(text: string) {
    return this.repository.getAllPropertyByText(text ?? '');
  }

  async create(payload: Record<string, unknown>) {
    const prepared = this.preparePayload(payload);
    const sanitized = this.repository.sanitizePayload(prepared);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const insertId = await this.repository.create(sanitized);
    const created = await this.repository.findOne({ id: insertId });
    if (!created) {
      throw new NotFoundException('Property not found after create');
    }

    return this.normalizeProperty(created as unknown as Record<string, unknown>);
  }

  async update(id: number, payload: Record<string, unknown>) {
    const prepared = this.preparePayload(payload);
    const sanitized = this.repository.sanitizePayload(prepared);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`Property ${id} not found`);
    }

    const updated = await this.repository.findOne({ id });
    return this.normalizeProperty((updated as unknown as Record<string, unknown>) ?? null);
  }

  async delete(id: number) {
    const affectedRows = await this.repository.deleteById(id);
    if (!affectedRows) {
      throw new NotFoundException(`Property ${id} not found`);
    }

    return { success: true };
  }
}
