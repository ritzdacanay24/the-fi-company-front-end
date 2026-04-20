import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ContractorVsTechChartRow,
  ContractorVsTechReportRow,
  CustomerReportRow,
  ExpenseChartRow,
  ExpenseReportRow,
  InvoiceChartRow,
  InvoiceReportRow,
  JobByUserChartRow,
  JobByUserReportRow,
  JobByLocationRow,
  PlatformAvgRow,
  ReportsRepository,
  ServiceChartRow,
  ServiceReportRow,
  TicketEventChartRow,
} from './reports.repository';

type ReportView = 'Weekly' | 'Monthly' | 'Annually' | 'Daily' | 'Quarterly';
type ChartRow = Pick<TicketEventChartRow, 'value' | 'label' | 'request_date' | 'background_color'>;
type InvoiceChartMappedRow = Pick<InvoiceChartRow, 'value' | 'label' | 'background_color'> & { request_date: string };
type ContractorVsTechChartMappedRow = Pick<ContractorVsTechChartRow, 'value' | 'label' | 'background_color' | 'request_date'>;
type JobByUserChartMappedRow = Pick<ChartRow, 'value' | 'label' | 'request_date' | 'background_color'>;

@Injectable()
export class ReportsService {
  constructor(private readonly repository: ReportsRepository) {}

  async getCustomerReport(dateFrom?: string, dateTo?: string): Promise<CustomerReportRow[]> {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    return this.repository.getCustomerReport(from, to);
  }

  async getExpenseReport(dateFrom?: string, dateTo?: string): Promise<ExpenseReportRow[]> {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    return this.repository.getExpenseReport(from, to);
  }

  async getExpenseReportChart(dateFrom?: string, dateTo?: string, typeOfView?: string) {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    const view = this.normalizeView(typeOfView);
    const rows = await this.repository.getExpenseReportChartRows(from, to);
    return this.buildChart(rows, from, to, view);
  }

  async getInvoiceReport(dateFrom?: string, dateTo?: string): Promise<InvoiceReportRow[]> {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    return this.repository.getInvoiceReport(from, to);
  }

  async getInvoiceByCustomerChart(dateFrom?: string, dateTo?: string, typeOfView?: string) {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    const view = this.normalizeView(typeOfView);
    const rows = await this.repository.getInvoiceByCustomerChartRows(from, to);
    const mappedRows: InvoiceChartMappedRow[] = rows.map((row) => ({
      value: row.value,
      label: row.label,
      background_color: row.background_color,
      request_date: row.invoice_date,
    }));

    return this.buildChart(mappedRows, from, to, view);
  }

  async jobByLocation(dateFrom?: string, dateTo?: string): Promise<JobByLocationRow[]> {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    return this.repository.getJobByLocation(from, to);
  }

  async getPlatformAvg(dateFrom?: string, dateTo?: string): Promise<PlatformAvgRow[]> {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    return this.repository.getPlatformAvg(from, to);
  }

  async getContractorVsTechReport(dateFrom?: string, dateTo?: string): Promise<ContractorVsTechReportRow[]> {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    return this.repository.getContractorVsTechReport(from, to);
  }

  async getContractorVsTechReportChart(dateFrom?: string, dateTo?: string, typeOfView?: string) {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    const view = this.normalizeView(typeOfView);
    const rows = await this.repository.getContractorVsTechReportChartRows(from, to);
    const mappedRows: ContractorVsTechChartMappedRow[] = rows.map((row) => ({
      value: row.value,
      label: row.label,
      background_color: row.background_color,
      request_date: row.request_date,
    }));

    return this.buildChart(mappedRows, from, to, view);
  }

  async getServiceReport(dateFrom?: string, dateTo?: string): Promise<ServiceReportRow[]> {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    return this.repository.getServiceReport(from, to);
  }

  async getServiceReportChart(dateFrom?: string, dateTo?: string, typeOfView?: string) {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    const view = this.normalizeView(typeOfView);
    const rows: ServiceChartRow[] = await this.repository.getServiceReportChartRows(from, to);
    return this.buildChart(rows, from, to, view);
  }

  async getJobByUserReport(dateFrom?: string, dateTo?: string): Promise<JobByUserReportRow[]> {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    return this.repository.getJobByUserReport(from, to);
  }

  async getJobByUserReportChart(dateFrom?: string, dateTo?: string, typeOfView?: string) {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    const view = this.normalizeView(typeOfView);
    const rows: JobByUserChartRow[] = await this.repository.getJobByUserReportChartRows(from, to);
    const mappedRows: JobByUserChartMappedRow[] = rows.map((row) => ({
      value: row.total,
      label: row.user,
      request_date: row.request_date,
      background_color: this.getColorForLabel(row.user),
    }));

    return this.buildChart(mappedRows, from, to, view);
  }

  async getTicketEventReport(dateFrom?: string, dateTo?: string) {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    return this.repository.getTicketEventReport(from, to);
  }

  async getTicketEventReportChart(dateFrom?: string, dateTo?: string, typeOfView?: string) {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    const view = this.normalizeView(typeOfView);
    const rows = await this.repository.getTicketEventReportChartRows(from, to);
    return this.buildChart(rows, from, to, view);
  }

  private normalizeView(typeOfView?: string): ReportView {
    const normalized = (typeOfView || 'Monthly').trim();
    if (
      normalized === 'Weekly' ||
      normalized === 'Monthly' ||
      normalized === 'Annually' ||
      normalized === 'Daily' ||
      normalized === 'Quarterly'
    ) {
      return normalized;
    }
    return 'Monthly';
  }

  private buildChart(
    rows:
      | ChartRow[]
      | ExpenseChartRow[]
      | InvoiceChartMappedRow[]
      | ContractorVsTechChartMappedRow[]
      | JobByUserChartMappedRow[],
    dateFrom: string,
    dateTo: string,
    typeOfView: ReportView,
  ) {
    const labels: string[] = [];
    const chartnew: Record<string, { dataset: number[]; label: string; backgroundColor?: string }> = {};

    const uniqueCustomers = Array.from(new Set(rows.map((row) => String(row.label || '')).filter(Boolean)));
    const cursor = new Date(dateFrom);
    const end = new Date(dateTo);

    while (cursor <= end) {
      const context = this.getLabelContext(cursor, typeOfView);
      labels.push(context.label);

      for (const customer of uniqueCustomers) {
        let total = 0;
        let backgroundColor: string | undefined;

        for (const row of rows) {
          if (String(row.label || '') !== customer) {
            continue;
          }

          const rowDate = new Date(String(row.request_date || ''));
          if (Number.isNaN(rowDate.getTime())) {
            continue;
          }

          if (this.getCompareKey(rowDate, typeOfView) === context.compareKey) {
            total += Number(row.value || 0);
          }

          if (!backgroundColor && row.background_color) {
            backgroundColor = String(row.background_color);
          }
        }

        if (!chartnew[customer]) {
          chartnew[customer] = {
            dataset: [],
            label: customer,
          };
        }

        chartnew[customer].dataset.push(total);
        if (backgroundColor) {
          chartnew[customer].backgroundColor = backgroundColor;
        }
      }

      this.advanceCursor(cursor, typeOfView);
    }

    return {
      obj: { label: labels },
      chart: [],
      chartnew,
      uniqueCustomers,
    };
  }

  private getLabelContext(date: Date, typeOfView: ReportView) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    if (typeOfView === 'Weekly') {
      const week = this.getWeekNumber(date);
      return { label: `${week}-${year}`, compareKey: `${week}-${year}` };
    }

    if (typeOfView === 'Monthly') {
      const monthShort = date.toLocaleString('en-US', { month: 'short' });
      return { label: `${monthShort}-${year}`, compareKey: `${month + 1}-${year}` };
    }

    if (typeOfView === 'Annually') {
      return { label: `${year}`, compareKey: `${year}` };
    }

    if (typeOfView === 'Quarterly') {
      const quarter = Math.ceil((month + 1) / 3);
      return { label: `Qtr:${quarter}-${year}`, compareKey: `${quarter}-${year}` };
    }

    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const yy = String(year).slice(-2);
    return { label: `${mm}/${dd}/${yy}`, compareKey: `${mm}/${dd}/${yy}-${year}` };
  }

  private getCompareKey(date: Date, typeOfView: ReportView): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    if (typeOfView === 'Weekly') {
      return `${this.getWeekNumber(date)}-${year}`;
    }

    if (typeOfView === 'Monthly') {
      return `${month + 1}-${year}`;
    }

    if (typeOfView === 'Annually') {
      return `${year}`;
    }

    if (typeOfView === 'Quarterly') {
      const quarter = Math.ceil((month + 1) / 3);
      return `${quarter}-${year}`;
    }

    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const yy = String(year).slice(-2);
    return `${mm}/${dd}/${yy}-${year}`;
  }

  private getWeekNumber(date: Date): number {
    const current = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = current.getUTCDay() || 7;
    current.setUTCDate(current.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
    return Math.ceil(((current.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private advanceCursor(cursor: Date, typeOfView: ReportView) {
    if (typeOfView === 'Weekly') {
      cursor.setDate(cursor.getDate() + 7);
      return;
    }

    if (typeOfView === 'Monthly') {
      cursor.setMonth(cursor.getMonth() + 1);
      return;
    }

    if (typeOfView === 'Annually') {
      cursor.setFullYear(cursor.getFullYear() + 1);
      return;
    }

    if (typeOfView === 'Quarterly') {
      cursor.setMonth(cursor.getMonth() + 3);
      return;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  private getColorForLabel(label: string): string {
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = (hash * 31 + label.charCodeAt(i)) | 0;
    }

    const hue = Math.abs(hash) % 360;
    return `hsla(${hue}, 68%, 46%, 0.73)`;
  }
}
