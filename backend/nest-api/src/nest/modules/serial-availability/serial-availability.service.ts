import { Injectable } from '@nestjs/common';
import { SerialAvailabilityRepository } from './serial-availability.repository';

@Injectable()
export class SerialAvailabilityService {
  constructor(private readonly repo: SerialAvailabilityRepository) {}

  async getAvailableEyefiSerials(limit?: number) {
    const data = await this.repo.getAvailableEyefiSerials(limit ?? 10);
    return { success: true, data, count: data.length };
  }

  async getAvailableUlLabels(limit?: number) {
    const data = await this.repo.getAvailableUlLabels(limit ?? 10);
    return { success: true, data, count: data.length };
  }

  async getAvailableIgtSerials(limit?: number) {
    const data = await this.repo.getAvailableIgtSerials(limit ?? 10);
    return { success: true, data, count: data.length };
  }

  async getRecentlyUsedEyefiSerials(limit?: number) {
    const data = await this.repo.getRecentlyUsedEyefiSerials(limit ?? 10);
    return { success: true, data, count: data.length };
  }

  async getRecentlyUsedUlLabels(limit?: number) {
    const data = await this.repo.getRecentlyUsedUlLabels(limit ?? 10);
    return { success: true, data, count: data.length };
  }

  async getRecentlyUsedIgtSerials(limit?: number) {
    const data = await this.repo.getRecentlyUsedIgtSerials(limit ?? 10);
    return { success: true, data, count: data.length };
  }
}
