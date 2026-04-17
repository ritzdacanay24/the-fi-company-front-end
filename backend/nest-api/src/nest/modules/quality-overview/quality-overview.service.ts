import { Injectable } from '@nestjs/common';
import { QualityOverviewRepository } from './quality-overview.repository';

@Injectable()
export class QualityOverviewService {
  constructor(private readonly repository: QualityOverviewRepository) {}

  async getOpenRequests() {
    return this.repository.getOpenRequests();
  }

  async getOpenJobs() {
    return this.repository.getOpenJobs();
  }

  async getOpenTickets() {
    return this.repository.getOpenTickets();
  }

  async getOpenInvoice() {
    return this.repository.getOpenInvoice();
  }

  async getInvoiceSummary(dateFrom: string, dateTo: string) {
    return this.repository.getInvoiceSummary(dateFrom, dateTo);
  }

  async getJobSummary(dateFrom: string, dateTo: string) {
    return this.repository.getJobSummary(dateFrom, dateTo);
  }
}
