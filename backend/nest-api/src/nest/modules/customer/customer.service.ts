import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CustomerRepository,
  FsCompanyNotificationRecipientRow,
  UpsertFsCompanyNotificationRecipientInput,
} from './customer.repository';

export interface CustomerNotificationRecipientDto {
  id: number;
  customerId: number;
  email: string;
  isActive: boolean;
}

export interface UpsertCustomerNotificationRecipientDto {
  email: string;
  isActive?: boolean;
}

@Injectable()
export class CustomerService {
  constructor(private readonly repository: CustomerRepository) {}

  async getAll() {
    return this.repository.find();
  }

  async find(query: Record<string, unknown>) {
    return this.repository.find(query);
  }

  async getById(id: number) {
    return this.repository.findOne({ id });
  }

  async listNotificationRecipients(id: number): Promise<CustomerNotificationRecipientDto[]> {
    await this.assertCustomerExists(id);
    const rows = await this.repository.listNotificationRecipients(id);
    return rows.map((row) => this.mapRecipientRow(row));
  }

  async updateNotificationRecipients(
    id: number,
    recipients: UpsertCustomerNotificationRecipientDto[],
  ): Promise<CustomerNotificationRecipientDto[]> {
    await this.assertCustomerExists(id);

    if (!Array.isArray(recipients)) {
      throw new BadRequestException('recipients must be an array');
    }

    const normalized = recipients
      .map((row, index) => this.normalizeRecipient(row, index))
      .filter((row, index, list) => list.findIndex((candidate) => candidate.email === row.email) === index);

    await this.repository.replaceNotificationRecipients(id, normalized);
    return this.listNotificationRecipients(id);
  }

  async deleteNotificationRecipient(id: number, recipientId: number) {
    await this.assertCustomerExists(id);

    const affectedRows = await this.repository.deleteNotificationRecipient(id, recipientId);
    if (!affectedRows) {
      throw new NotFoundException(`Notification recipient ${recipientId} not found for customer ${id}`);
    }

    return { success: true };
  }

  async create(payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    await this.repository.create(sanitized);
    return payload;
  }

  async update(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return { success: true };
  }

  async delete(id: number) {
    const affectedRows = await this.repository.deleteById(id);
    if (!affectedRows) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return { success: true };
  }

  private async assertCustomerExists(id: number): Promise<void> {
    const customer = await this.repository.findOne({ id });
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
  }

  private normalizeRecipient(
    recipient: UpsertCustomerNotificationRecipientDto,
    index: number,
  ): UpsertFsCompanyNotificationRecipientInput {
    const email = String(recipient?.email ?? '').trim().toLowerCase();
    if (!this.isValidEmail(email)) {
      throw new BadRequestException(`Recipient at index ${index} must include a valid email`);
    }

    return {
      email,
      isActive: recipient?.isActive !== false,
    };
  }

  private mapRecipientRow(row: FsCompanyNotificationRecipientRow): CustomerNotificationRecipientDto {
    return {
      id: row.id,
      customerId: row.fs_company_id,
      email: row.email,
      isActive: row.is_active === 1,
    };
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
