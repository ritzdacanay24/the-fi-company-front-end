import { Injectable } from '@nestjs/common';
import { SerialAvailabilityRepository } from './serial-availability.repository';

@Injectable()
export class SerialAvailabilityService {
  constructor(private readonly repo: SerialAvailabilityRepository) {}

  async getSerialStockThresholds() {
    const data = await this.repo.getSerialStockThresholds();
    return { success: true, data };
  }

  async updateSerialStockThresholds(
    payload: Partial<Record<'eyefi' | 'ul_new' | 'ul_used' | 'igt', number>>,
    updatedBy = 'system',
  ) {
    const existing = await this.repo.getSerialStockThresholds();
    const next = {
      eyefi: this.sanitizeThreshold(payload.eyefi, existing.eyefi),
      ul_new: this.sanitizeThreshold(payload.ul_new, existing.ul_new),
      ul_used: this.sanitizeThreshold(payload.ul_used, existing.ul_used),
      igt: this.sanitizeThreshold(payload.igt, existing.igt),
    };

    await this.repo.saveSerialStockThresholds(next, updatedBy);
    return { success: true, data: next };
  }

  async getSummary() {
    const data = await this.repo.getAvailabilitySummary();
    return { success: true, data };
  }

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

  async getRecentlyUsedIgtSerials(limit?: number) {
    const data = await this.repo.getRecentlyUsedIgtSerials(limit ?? 10);
    return { success: true, data, count: data.length };
  }

  private sanitizeThreshold(value: unknown, fallback: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return fallback;
    }

    return Math.max(1, Math.round(numeric));
  }
}
