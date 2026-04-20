import { Injectable, Inject } from '@nestjs/common';
import { CalendarEventRepository, CalendarEventRecord } from './calendar-event.repository';

@Injectable()
export class CalendarEventService {
  constructor(@Inject(CalendarEventRepository) private readonly repository: CalendarEventRepository) {}

  async getAll(): Promise<CalendarEventRecord[]> {
    return this.repository.getAll();
  }

  async find(params: Record<string, unknown>): Promise<CalendarEventRecord[]> {
    return this.repository.find(params);
  }

  async findOne(id: number): Promise<CalendarEventRecord | null> {
    return this.repository.findOne({ id });
  }

  async create(payload: Record<string, unknown>): Promise<CalendarEventRecord | null> {
    const sanitized = this.repository.sanitizePayload(payload);
    const insertId = await this.repository.create(sanitized);
    return this.findOne(insertId);
  }

  async update(id: number, payload: Record<string, unknown>): Promise<CalendarEventRecord | null> {
    const sanitized = this.repository.sanitizePayload(payload);
    await this.repository.updateById(id, sanitized);
    return this.findOne(id);
  }

  async delete(id: number): Promise<boolean> {
    const affectedRows = await this.repository.deleteById(id);
    return affectedRows > 0;
  }
}
