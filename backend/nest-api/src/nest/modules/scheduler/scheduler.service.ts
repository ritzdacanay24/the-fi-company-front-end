import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SchedulerRepository, SchedulerRecord } from './scheduler.repository';

@Injectable()
export class SchedulerService {
  constructor(@Inject(SchedulerRepository) private readonly repository: SchedulerRepository) {}

  async getAll(): Promise<SchedulerRecord[]> {
    return this.repository.getAll();
  }

  async find(params: Record<string, unknown>): Promise<SchedulerRecord[]> {
    return this.repository.find(params);
  }

  async findOne(id: number): Promise<SchedulerRecord | null> {
    return this.repository.findOne({ id });
  }

  async getByDateRange(dateFrom: string, dateTo: string): Promise<SchedulerRecord[]> {
    return this.repository.getByDateRange(dateFrom, dateTo);
  }

  async searchByJob(text: string): Promise<any[]> {
    return this.repository.searchByJob(text);
  }

  async getConnectingJobsByTech(tech: string, dateFrom: string, dateTo: string): Promise<SchedulerRecord[]> {
    return this.repository.getConnectingJobsByTech(tech, dateFrom, dateTo);
  }

  async getConnectingJobs(groupId: number): Promise<SchedulerRecord[]> {
    return this.repository.getConnectingJobs(groupId);
  }

  async getGroupJobs(groupId: number): Promise<SchedulerRecord[]> {
    return this.repository.getGroupJobs(groupId);
  }

  async getAssignments(user: string, dateFrom: string, dateTo: string): Promise<any[]> {
    return this.repository.getAssignments(user, dateFrom, dateTo);
  }

  async getJobByUser(user: string): Promise<SchedulerRecord[]> {
    return this.repository.getJobByUser(user);
  }

  async getSchedulerByDateRange(dateFrom: string, dateTo: string): Promise<SchedulerRecord[]> {
    return this.repository.getSchedulerByDateRange(dateFrom, dateTo);
  }

  async getCalendar(dateFrom: string, dateTo: string): Promise<any[]> {
    return this.repository.getCalendar(dateFrom, dateTo);
  }

  async getTechSchedule(dateFrom: string, dateTo: string): Promise<any[]> {
    return this.repository.getTechSchedule(dateFrom, dateTo);
  }

  async getMap(dateFrom: string, dateTo: string): Promise<any[]> {
    return this.repository.getMap(dateFrom, dateTo);
  }

  async create(payload: Record<string, unknown>): Promise<SchedulerRecord | null> {
    const sanitized = this.repository.sanitizePayload(payload);
    const insertId = await this.repository.create(sanitized);
    return this.findOne(insertId);
  }

  async update(id: number, payload: Record<string, unknown>): Promise<SchedulerRecord | null> {
    const sanitized = this.repository.sanitizePayload(payload);
    await this.repository.updateById(id, sanitized);
    return this.findOne(id);
  }

  async delete(id: number): Promise<boolean> {
    const affectedRows = await this.repository.deleteById(id);
    return affectedRows > 0;
  }
}
