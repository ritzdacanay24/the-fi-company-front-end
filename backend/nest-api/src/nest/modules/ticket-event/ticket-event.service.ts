import { Injectable, Inject } from '@nestjs/common';
import { TicketEventRepository, TicketEventRecord } from './ticket-event.repository';

@Injectable()
export class TicketEventService {
  constructor(@Inject(TicketEventRepository) private readonly repository: TicketEventRepository) {}

  async getAll(): Promise<TicketEventRecord[]> {
    return this.repository.getAll();
  }

  async find(params: Record<string, unknown>): Promise<TicketEventRecord[]> {
    return this.repository.find(params);
  }

  async findOne(id: number): Promise<TicketEventRecord | null> {
    return this.repository.findOne({ id });
  }

  async getActive(): Promise<TicketEventRecord[]> {
    return this.repository.getActive();
  }

  async getInactive(): Promise<TicketEventRecord[]> {
    return this.repository.getInactive();
  }

  async create(payload: Record<string, unknown>): Promise<TicketEventRecord | null> {
    const sanitized = this.repository.sanitizePayload(payload);
    const insertId = await this.repository.create(sanitized);
    return this.findOne(insertId);
  }

  async update(id: number, payload: Record<string, unknown>): Promise<TicketEventRecord | null> {
    const sanitized = this.repository.sanitizePayload(payload);
    await this.repository.updateById(id, sanitized);
    return this.findOne(id);
  }

  async delete(id: number): Promise<boolean> {
    const affectedRows = await this.repository.deleteById(id);
    return affectedRows > 0;
  }
}
