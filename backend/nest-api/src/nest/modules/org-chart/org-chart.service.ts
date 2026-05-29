import { Injectable } from '@nestjs/common';
import { OrgChartRepository } from './org-chart.repository';

@Injectable()
export class OrgChartService {
  constructor(private readonly repository: OrgChartRepository) {}

  async getOrgChart(filters: Record<string, string>) {
    return this.repository.getOrgChart(filters);
  }

  async hasSubordinates(id: string) {
    return this.repository.hasSubordinates(id);
  }

  async listOpenPositions(filters: Record<string, string>) {
    return this.repository.listOpenPositions(filters);
  }

  async createOpenPosition(payload: {
    title: string;
    reportsToUserId?: number | null;
    department?: string | null;
    city?: string | null;
    state?: string | null;
    createdBy?: number | null;
  }) {
    return this.repository.createOpenPosition(payload);
  }

  async updateOpenPosition(
    id: number,
    payload: {
      title?: string;
      reportsToUserId?: number | null;
      department?: string | null;
      city?: string | null;
      state?: string | null;
      active?: number;
      status?: 'open' | 'filled' | 'closed';
      filledByUserId?: number | null;
    },
  ) {
    return this.repository.updateOpenPosition(id, payload);
  }

  async fillOpenPosition(id: number, payload: { filledByUserId?: number | null }) {
    return this.repository.fillOpenPosition(id, payload?.filledByUserId ?? null);
  }

  async closeOpenPosition(id: number) {
    return this.repository.updateOpenPosition(id, {
      status: 'closed',
      active: 0,
    });
  }
}
