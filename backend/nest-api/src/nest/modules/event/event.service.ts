import { Injectable, Inject } from '@nestjs/common';
import { EventRepository, EventRecord } from './event.repository';

@Injectable()
export class EventService {
  constructor(@Inject(EventRepository) private readonly repository: EventRepository) {}

  async getAll(): Promise<EventRecord[]> {
    return this.repository.getAll();
  }

  async find(params: Record<string, unknown>): Promise<EventRecord[]> {
    return this.repository.find(params);
  }

  async findOne(id: number): Promise<EventRecord | null> {
    return this.repository.findOne({ id });
  }

  async create(payload: Record<string, unknown>): Promise<EventRecord | null> {
    const sanitized = this.repository.sanitizePayload(payload);
    const insertId = await this.repository.create(sanitized);
    return this.findOne(insertId);
  }

  async update(id: number, payload: Record<string, unknown>): Promise<EventRecord | null> {
    const sanitized = this.repository.sanitizePayload(payload);
    await this.repository.updateById(id, sanitized);
    return this.findOne(id);
  }

  async delete(id: number): Promise<boolean> {
    const affectedRows = await this.repository.deleteById(id);
    return affectedRows > 0;
  }
}
