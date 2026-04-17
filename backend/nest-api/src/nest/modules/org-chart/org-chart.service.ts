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
}
