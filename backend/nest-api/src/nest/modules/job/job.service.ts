import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JobRepository } from './job.repository';

@Injectable()
export class JobService {
  constructor(private readonly repository: JobRepository) {}

  async getAll(dateFrom?: string, dateTo?: string, selectedViewType?: string, isAllRaw?: string) {
    const isAll = String(isAllRaw).toLowerCase() === 'true';
    return this.repository.getAll(dateFrom, dateTo, selectedViewType, isAll);
  }

  async getOpenInvoice(dateFrom?: string, dateTo?: string, isAllRaw?: string) {
    const isAll = String(isAllRaw).toLowerCase() === 'true';
    return this.repository.getOpenInvoice(dateFrom, dateTo, isAll);
  }

  async findOne(params: Record<string, unknown>) {
    const clean = Object.fromEntries(
      Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    );

    if (Object.keys(clean).length === 0) {
      return null;
    }

    return this.repository.findOne(clean);
  }

  async create(payload: Record<string, unknown>) {
    const job = this.repository.sanitizeSchedulerPayload((payload.job as Record<string, unknown>) || {});
    const resource = (payload.resource as Array<Record<string, unknown>>) || [];

    if (Object.keys(job).length === 0) {
      throw new BadRequestException('Job payload is empty');
    }

    const insertId = await this.repository.createJob(job, resource);
    return { insertId };
  }

  async update(id: number, payload: Record<string, unknown>) {
    const job = this.repository.sanitizeSchedulerPayload((payload.job as Record<string, unknown>) || {});
    const resource = (payload.resource as Array<Record<string, unknown>>) || [];

    if (Object.keys(job).length === 0 && !Array.isArray(resource)) {
      throw new BadRequestException('Payload is empty');
    }

    await this.repository.updateJob(id, job, resource);
    return this.repository.findOne({ id });
  }

  async updateInvoice(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizeSchedulerPayload(payload);
    if (!Object.keys(sanitized).length) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    return this.repository.findOne({ id });
  }
}
