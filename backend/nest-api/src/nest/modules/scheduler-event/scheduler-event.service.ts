import { Injectable, Inject } from '@nestjs/common';
import { SchedulerEventRepository, SchedulerEventRecord } from './scheduler-event.repository';

@Injectable()
export class SchedulerEventService {
  constructor(@Inject(SchedulerEventRepository) private readonly repository: SchedulerEventRepository) {}

  async getAll(): Promise<SchedulerEventRecord[]> {
    return this.repository.getAll();
  }

  async find(params: Record<string, unknown>): Promise<SchedulerEventRecord[]> {
    return this.repository.find(params);
  }

  async findOne(id: number): Promise<SchedulerEventRecord | null> {
    return this.repository.findOne({ id });
  }

  async getAllRequests(dateFrom: string, dateTo: string): Promise<SchedulerEventRecord[]> {
    return this.repository.getAllRequests(dateFrom, dateTo);
  }

  async create(payload: Record<string, unknown>): Promise<SchedulerEventRecord | null> {
    const sanitized = this.repository.sanitizePayload(payload);
    const insertId = await this.repository.create(sanitized);
    return this.findOne(insertId);
  }

  async update(id: number, payload: Record<string, unknown>): Promise<SchedulerEventRecord | null> {
    const sanitized = this.repository.sanitizePayload(payload);
    await this.repository.updateById(id, sanitized);
    return this.findOne(id);
  }

  async delete(id: number): Promise<boolean> {
    const affectedRows = await this.repository.deleteById(id);
    return affectedRows > 0;
  }
}
