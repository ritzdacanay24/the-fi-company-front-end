import { Injectable } from '@nestjs/common';
import { FieldServiceOverviewRepository } from './field-service-overview.repository';

@Injectable()
export class FieldServiceOverviewService {
  constructor(private readonly repository: FieldServiceOverviewRepository) {}

  getOpenRequests() {
    return this.repository.getOpenRequests();
  }

  getOpenJobs() {
    return this.repository.getOpenJobs();
  }

  getOpenTickets() {
    return this.repository.getOpenTickets();
  }

  getOpenInvoice() {
    return this.repository.getOpenInvoice();
  }

  getInvoiceSummary(dateFrom: string, dateTo: string) {
    return this.repository.getInvoiceSummary(dateFrom, dateTo);
  }

  getJobSummary(dateFrom: string, dateTo: string) {
    return this.repository.getJobSummary(dateFrom, dateTo);
  }
}
