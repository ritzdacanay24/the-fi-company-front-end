import { Injectable, NotFoundException } from '@nestjs/common';
import { EmailNotificationRepository } from './email-notification.repository';

@Injectable()
export class EmailNotificationService {
  constructor(private readonly repo: EmailNotificationRepository) {}

  getList() {
    return this.repo.getList();
  }

  find(filters: Record<string, unknown>) {
    return this.repo.findWithFilters(filters);
  }

  async getById(id: number) {
    const row = await this.repo.findOne({ id });
    if (!row) throw new NotFoundException({ code: 'RC_EMAIL_NOTIFICATION_NOT_FOUND', message: `Email notification ${id} not found` });
    return row;
  }

  async create(payload: Record<string, unknown>) {
    const safe = this.repo.sanitizePayload(payload);
    const insertId = await this.repo.create(safe);
    return this.getById(insertId);
  }

  async update(id: number, payload: Record<string, unknown>) {
    await this.getById(id);
    const safe = this.repo.sanitizePayload(payload);
    await this.repo.updateById(id, safe);
    return this.getById(id);
  }

  async delete(id: number) {
    await this.getById(id);
    await this.repo.deleteById(id);
    return { message: 'Deleted successfully' };
  }

  getOptions() {
    return this.repo.getNotificationOptions();
  }
}
