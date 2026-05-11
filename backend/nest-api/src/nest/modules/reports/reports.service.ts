import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ContractorVsTechChartRow,
  ContractorVsTechReportRow,
  CustomerReportRow,
  ExpenseChartRow,
  ExpenseReportRow,
  FutureRevenueByCustomerSummaryRow,
  DailyReportConfigRow,
  InvoiceChartRow,
  InvoiceReportRow,
  JobByUserChartRow,
  JobByUserReportRow,
  JobByLocationRow,
  PlatformAvgRow,
  RevenueAllRow,
  ReportsRepository,
  ServiceChartRow,
  ServiceReportRow,
  TicketEventChartRow,
} from './reports.repository';
import { toJsonSafe } from '@/shared/utils/json-safe.util';
import { parseDateInput } from '@/shared/utils/date.util';
import { DailyReportService } from './daily-report.service';

type ReportView = 'Weekly' | 'Monthly' | 'Annually' | 'Daily' | 'Quarterly';
type ChartRow = Pick<TicketEventChartRow, 'value' | 'label' | 'request_date' | 'background_color'>;
type InvoiceChartMappedRow = Pick<InvoiceChartRow, 'value' | 'label' | 'background_color'> & { request_date: string };
type ContractorVsTechChartMappedRow = Pick<ContractorVsTechChartRow, 'value' | 'label' | 'background_color' | 'request_date'>;
type JobByUserChartMappedRow = Pick<ChartRow, 'value' | 'label' | 'request_date' | 'background_color'>;

@Injectable()
export class ReportsService {
  constructor(
    private readonly repository: ReportsRepository,
    private readonly dailyReportService: DailyReportService,
  ) {}

  async getCustomerReport(dateFrom?: string, dateTo?: string): Promise<CustomerReportRow[]> {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    return this.repository.getCustomerReport(from, to);
  }

  async getDailyReportConfig(userId?: string): Promise<DailyReportConfigRow | false> {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
      return false;
    }

    const config = await this.repository.getDailyReportConfigByUserId(normalizedUserId);
    return config ?? false;
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

  async getRevenueChart(dateFrom?: string, dateTo?: string, typeOfView?: string) {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();

    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    const view = this.normalizeView(typeOfView);
    const rows = await this.repository.getRevenueAllRows(from, to);
    return {
      chartData: this.buildRevenueChart(rows, from, to, view),
    };
  }

  async getFutureRevenueByCustomer(
    applyAgsDiscount?: string,
    getFutureRevenueByCustomerByWeekly?: string,
    start?: string,
    end?: string,
    weekStart?: string,
    weekEnd?: string,
  ) {
    const useAgsDiscount = String(applyAgsDiscount || '').toLowerCase() === 'true';
    const isWeekly = String(getFutureRevenueByCustomerByWeekly || '').toLowerCase() === 'true';

    if (isWeekly) {
      const startDate = (start || '').trim();
      const endDate = (end || '').trim();
      const weekStartDate = (weekStart || '').trim();
      const weekEndDate = (weekEnd || '').trim();

      if (!startDate || !endDate || !weekStartDate || !weekEndDate) {
        throw new BadRequestException('start, end, weekStart, and weekEnd are required for weekly mode');
      }

      const results = await this.repository.getFutureRevenueByCustomerWeeklyRows(startDate, endDate);
      return {
        chart2: [],
        chart1: [],
        obj: {
          label: this.buildWeekLabels(weekStartDate, weekEndDate),
        },
        dateFrom: startDate,
        dateTo: endDate,
        test22: [],
        results,
        weekStart: weekStartDate,
        weekEnd: weekEndDate,
        t: this.buildPseudoWeeklyDates(weekStartDate, weekEndDate),
      };
    }

    const rows = await this.repository.getFutureRevenueByCustomerRows(useAgsDiscount);
    return this.mapFutureRevenueCustomerMatrix(rows);
  }

  private mapFutureRevenueCustomerMatrix(rows: FutureRevenueByCustomerSummaryRow[]): Array<Record<string, number | string>> {
    const periodSet = new Set<string>();
    const customerMap = new Map<string, Record<string, number | string>>();

    for (const row of rows) {
      const customer = String(row.so_cust || '');
      if (!customer) {
        continue;
      }

      const period = `${row.month}-${row.year}`;
      periodSet.add(period);

      if (!customerMap.has(customer)) {
        customerMap.set(customer, { Customer: customer });
      }

      const customerRow = customerMap.get(customer) as Record<string, number | string>;
      customerRow[period] = Number(row.balance || 0);
    }

    const periods = Array.from(periodSet).sort((a, b) => {
      const [am, ay] = a.split('-').map((value) => Number(value));
      const [bm, by] = b.split('-').map((value) => Number(value));
      if (ay !== by) {
        return ay - by;
      }
      return am - bm;
    });

    const customers = Array.from(customerMap.values());
    for (const row of customers) {
      let grandTotal = 0;
      for (const period of periods) {
        const value = Number(row[period] || 0);
        row[period] = value;
        grandTotal += value;
      }
      row['Grand Total'] = grandTotal;
    }

    return customers;
  }

  private buildWeekLabels(weekStart: string, weekEnd: string): string[] {
    const labels: string[] = [];
    const start = parseDateInput(weekStart);
    const end = parseDateInput(weekEnd);
    if (!start || !end) {
      return labels;
    }

    const cursor = new Date(start);
    while (cursor <= end) {
      labels.push(`${this.getIsoWeek(cursor)}-${cursor.getFullYear()}`);
      cursor.setDate(cursor.getDate() + 7);
    }
    return labels;
  }

  private buildPseudoWeeklyDates(weekStart: string, weekEnd: string): string[] {
    const dates: string[] = [];
    const start = parseDateInput(weekStart);
    const end = parseDateInput(weekEnd);
    if (!start || !end) {
      return dates;
    }

    const cursor = new Date(start);
    while (cursor < end) {
      const year = cursor.getFullYear();
      const month = String(cursor.getMonth() + 1).padStart(2, '0');
      const day = String(cursor.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      cursor.setDate(cursor.getDate() + 5);
    }
    return dates;
  }

  private getIsoWeek(date: Date): number {
    const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = temp.getUTCDay() || 7;
    temp.setUTCDate(temp.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
    return Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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
    const cursorDate = parseDateInput(dateFrom);
    const end = parseDateInput(dateTo);
    if (!cursorDate || !end) {
      return {
        obj: { label: [] },
        chart: [],
        chartnew: {},
        uniqueCustomers,
      };
    }

    const cursor = new Date(cursorDate);

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

          const rowDate = parseDateInput(String(row.request_date || ''));
          if (!rowDate) {
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

  private buildRevenueChart(rows: RevenueAllRow[], dateFrom: string, dateTo: string, typeOfView: ReportView) {
    const labels: string[] = [];
    const chart: Record<string, { dataset: number[]; label: string; backgroundColor: string; borderColor: string[] }> = {};
    const categories = [...new Set(rows.map((row) => String(row.tyoeof || '').trim()).filter(Boolean))];
    const colors = ['#009B77', '#A52A2A', '#B8860B', '#39CCCC', '#FF851B', '#B565A7', '#E0E0E0'];

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const overall = {
      projected: 0,
      open: 0,
      currentRevenue: 0,
      pendingInvoice: 0,
      Graphics: 0,
      Kitting: 0,
      Product: 0,
      serviceParts: 0,
      serviceStorage: 0,
    };

    for (const row of rows) {
      const rowMonth = Number(row.month ?? 0);
      const rowYear = Number(row.year ?? 0);
      const rowType = String(row.tyoeof ?? '').trim();
      const value = Number(row.price ?? 0);

      if (rowMonth !== currentMonth || rowYear !== currentYear) {
        continue;
      }

      overall.projected += value;
      if (rowType === 'Open') {
        overall.open += value;
      }
      if (rowType === 'Pending Invoice') {
        overall.pendingInvoice += value;
      }
      if (['Graphics', 'Kitting', 'Product', 'Service Parts', 'Service Storage'].includes(rowType)) {
        overall.currentRevenue += value;
      }
      if (rowType === 'Graphics') {
        overall.Graphics += value;
      }
      if (rowType === 'Kitting') {
        overall.Kitting += value;
      }
      if (rowType === 'Product') {
        overall.Product += value;
      }
      if (rowType === 'Service Parts') {
        overall.serviceParts += value;
      }
      if (rowType === 'Service Storage') {
        overall.serviceStorage += value;
      }
    }

    const cursorDate = parseDateInput(dateFrom);
    const end = parseDateInput(dateTo);
    if (!cursorDate || !end) {
      return {
        label: [],
        chart: {},
        results: rows,
        overall,
      };
    }

    const cursor = new Date(cursorDate);
    const currentCompareKey = this.getRevenueCompareKey(now, typeOfView);

    while (cursor <= end) {
      const labelContext = this.getRevenueLabelContext(cursor, typeOfView);
      labels.push(labelContext.label);

      categories.forEach((category, index) => {
        if (!chart[category]) {
          chart[category] = {
            dataset: [],
            label: category,
            backgroundColor: colors[index % colors.length],
            borderColor: [],
          };
        }

        const total = rows.reduce((sum, row) => {
          const rowType = String(row.tyoeof ?? '').trim();
          if (rowType !== category) {
            return sum;
          }

          const rowDate = parseDateInput(String(row.daten ?? ''));
          if (!rowDate) {
            return sum;
          }

          if (this.getRevenueCompareKey(rowDate, typeOfView) !== labelContext.compareKey) {
            return sum;
          }

          return sum + Number(row.price ?? 0);
        }, 0);

        chart[category].dataset.push(total);
        chart[category].borderColor.push(labelContext.compareKey === currentCompareKey ? 'rgb(131, 152, 222)' : '');
      });

      this.advanceCursor(cursor, typeOfView);
    }

    return {
      label: labels,
      chart,
      results: rows,
      overall,
    };
  }

  private getRevenueLabelContext(date: Date, typeOfView: ReportView): { label: string; compareKey: string } {
    if (typeOfView === 'Weekly') {
      const week = this.getWeekNumber(date);
      const year = date.getFullYear();
      return { label: `${week}-${year}`, compareKey: `${week}-${year}` };
    }

    if (typeOfView === 'Monthly') {
      const monthShort = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      return { label: `${monthShort}-${year}`, compareKey: `${monthShort}-${year}` };
    }

    if (typeOfView === 'Annually') {
      const year = date.getFullYear();
      return { label: `${year}`, compareKey: `${year}` };
    }

    if (typeOfView === 'Daily') {
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const yy = String(date.getFullYear()).slice(-2);
      const yyyy = date.getFullYear();
      return { label: `${mm}/${dd}/${yy}`, compareKey: `${mm}/${dd}/${yy}-${yyyy}` };
    }

    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    const year = date.getFullYear();
    return { label: `Qtr:${quarter}-${year}`, compareKey: `${quarter}-${year}` };
  }

  private getRevenueCompareKey(date: Date, typeOfView: ReportView): string {
    if (typeOfView === 'Weekly') {
      return `${this.getWeekNumber(date)}-${date.getFullYear()}`;
    }

    if (typeOfView === 'Monthly') {
      return `${date.toLocaleString('en-US', { month: 'short' })}-${date.getFullYear()}`;
    }

    if (typeOfView === 'Annually') {
      return `${date.getFullYear()}`;
    }

    if (typeOfView === 'Daily') {
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const yy = String(date.getFullYear()).slice(-2);
      const yyyy = date.getFullYear();
      return `${mm}/${dd}/${yy}-${yyyy}`;
    }

    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    return `${quarter}-${date.getFullYear()}`;
  }

  // ─── Operations Reports ────────────────────────────────────────────────────

  async getJiaxingLocationValue(name?: string): Promise<Record<string, unknown>[]> {
    return this.repository.getJiaxingLocationValue((name || 'JX01').trim() || 'JX01');
  }

  async getLasVegasRawMaterial(): Promise<Record<string, unknown>[]> {
    return this.repository.getLasVegasRawMaterial();
  }

  async getShippedOrdersGrouped(dateFrom?: string, dateTo?: string): Promise<Record<string, unknown>[]> {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();
    if (!from || !to) throw new BadRequestException('dateFrom and dateTo are required');
    return this.repository.getShippedOrdersGrouped(from, to);
  }

  async getShippedOrdersChart(dateFrom?: string, dateTo?: string, typeOfView?: string): Promise<unknown> {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();
    if (!from || !to) throw new BadRequestException('dateFrom and dateTo are required');

    const rows = await this.repository.getShippedOrdersChartData(from, to);
    const view = this.normalizeView(typeOfView);

    const labels: string[] = [];
    const totalCost: number[] = [];
    const backgroundColor: string[] = [];
    const goal = 200000;

    const cursorDate = parseDateInput(from);
    const end = parseDateInput(to);
    if (!cursorDate || !end) {
      throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
    }

    const cursor = new Date(cursorDate);

    while (cursor <= end) {
      const { label, compareKey } = this.getLabelContext(cursor, view);
      if (!labels.includes(label)) {
        labels.push(label);
        let periodTotal = 0;
        for (const row of rows) {
          const shpDate = String(row['abs_shp_date'] ?? row['ABS_SHP_DATE'] ?? '');
          if (!shpDate) continue;
          const parsedShpDate = parseDateInput(shpDate);
          if (!parsedShpDate) continue;

          const rowKey = this.formatDateKey(parsedShpDate, view);
          if (rowKey === compareKey) {
            periodTotal += Number(row['shipped_qty'] ?? row['SHIPPED_QTY'] ?? 0);
          }
        }
        totalCost.push(periodTotal);
        backgroundColor.push(periodTotal > goal ? '#006400' : '#8FBC8F');
      }
      this.advanceCursor(cursor, view);
    }

    return { obj: { label: labels }, chart: { totalCost, backgroundColor, goalLine: labels.map(() => goal) } };
  }

  async getDailyReport(): Promise<unknown> {
    return this.dailyReportService.getDailyReport();
  }

  async getOneSkuLocationReport(): Promise<Record<string, unknown>[]> {
    const rows = await this.repository.getOneSkuLocationReport();
    return toJsonSafe(rows) as Record<string, unknown>[];
  }

  async getItemConsolidationReport(): Promise<unknown> {
    const [qadRows, mysqlRows] = await Promise.all([
      this.repository.getItemConsolidationQad(),
      this.repository.getItemConsolidationMysql(),
    ]);

    const completedMap = new Map<string, boolean>();
    for (const row of mysqlRows) {
      const part = String(row['partNumber'] ?? '').trim();
      if (part) completedMap.set(part, row['completed'] == 1);
    }

    const details = qadRows.map((row) => {
      const part = String(row['ld_part'] ?? '').trim();
      return { ...row, COMPLETED: completedMap.get(part) ?? false, id: part };
    });

    const locationCount1 = details.length;
    return toJsonSafe({ LocationDetails: details, LocationCount1: locationCount1 });
  }

  async getInventoryValuation(showAll?: string): Promise<unknown> {
    const allowedSites = new Set(['All', 'JX01', 'RMLV', 'FGLV']);
    const site = allowedSites.has(String(showAll || '').trim()) ? String(showAll).trim() : 'All';
    const results = await this.repository.getInventoryValuation(site);
    return toJsonSafe({
      results,
      resultsq: [],
      lastUpdate: 'Live',
    });
  }

  async getOtdReport(dateFrom?: string, dateTo?: string, displayCustomers?: string, typeOfView?: string): Promise<unknown> {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();
    if (!from || !to) throw new BadRequestException('dateFrom and dateTo are required');

    const showAll = !displayCustomers || displayCustomers === 'Show All' || displayCustomers === 'false' || displayCustomers === 'undefined';
    const custFilter = showAll ? undefined : displayCustomers;

    const [details, summary, chartData] = await Promise.all([
      this.repository.getOtdReportDetails(from, to, custFilter),
      this.repository.getOtdReportSummary(from, to),
      this.repository.getOtdReportChartData(from, to, custFilter),
    ]);

    let totalLines = 0;
    let totalShippedOnTime = 0;
    let average: number | string = 0;

    for (const row of summary) {
      const label = String(row['label'] ?? '');
      if (!showAll && label === displayCustomers) {
        average = row['value'] as number;
      } else {
        totalLines += Number(row['total_lines'] ?? 0);
        totalShippedOnTime += Number(row['total_shipped_on_time'] ?? 0);
      }
    }

    if (showAll) {
      average = totalLines > 0 ? Number(((totalShippedOnTime / totalLines) * 100).toFixed(2)) : 0;
    }

    return { details, summary, chartData, average };
  }

  async getOtdReportV1(dateFrom?: string, dateTo?: string, displayCustomers?: string, typeOfView?: string): Promise<unknown> {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();
    if (!from || !to) throw new BadRequestException('dateFrom and dateTo are required');

    const showAll = !displayCustomers || displayCustomers === 'Show All' || displayCustomers === 'false' || displayCustomers === 'undefined';
    const custFilter = showAll ? undefined : displayCustomers;
    const view = this.normalizeView(typeOfView);

    const [details, summary, otdChartRows, reasonChartRows] = await Promise.all([
      this.repository.getOtdReportV1Details(from, to, custFilter),
      this.repository.getOtdReportV1Summary(from, to),
      this.repository.getOtdReportChartData(from, to, custFilter),
      this.repository.getOtdReportReasonChart(from, to),
    ]);

    const soLines = details.map((r) => String(r['soAndLine'] ?? `${r['so_nbr']}-${r['sod_line']}`));
    const soNbrs = [...new Set(details.map((r) => String(r['so_nbr'] ?? '')).filter(Boolean))];

    const [owners, sodParts] = await Promise.all([
      this.repository.getOtdReportV1WorkOrderOwners(soLines),
      this.repository.getOtdReportV1SodParts(soNbrs),
    ]);

    const ownersMap = new Map<string, Record<string, unknown>>();
    for (const o of owners) ownersMap.set(String(o['so'] ?? ''), o as Record<string, unknown>);

    const sodPartsMap = new Map<string, string>();
    for (const p of sodParts) {
      sodPartsMap.set(`${p['sod_nbr']}-${p['sod_line']}`, String(p['sod_part'] ?? ''));
    }

    const enrichedDetails = details.map((row) => {
      const soAndLine = String(row['soAndLine'] ?? `${row['so_nbr']}-${row['sod_line']}`);
      return {
        ...row,
        misc: ownersMap.get(soAndLine) ?? {},
        sod_part: sodPartsMap.get(`${row['so_nbr']}-${row['sod_line']}`) ?? null,
        lateReasonCode: (ownersMap.get(soAndLine) as any)?.lateReasonCode ?? null,
      };
    });

    let totalLines = 0;
    let totalShippedOnTime = 0;
    let average: number | string = 0;

    for (const row of summary) {
      const label = String(row['label'] ?? '');
      if (!showAll && label === displayCustomers) {
        average = row['value'] as number;
      } else {
        totalLines += Number(row['total_lines'] ?? 0);
        totalShippedOnTime += Number(row['total_shipped_on_time'] ?? 0);
      }
    }

    if (showAll) {
      average = totalLines > 0 ? Number(((totalShippedOnTime / totalLines) * 100).toFixed(2)) : 0;
    }

    // When "Show All" is selected, aggregate across all customers per date
    // to match legacy PHP behavior (single 'nocustomer' series)
    let mappedChartRows: ChartRow[];
    
    if (showAll) {
      // Group by date and aggregate across all customers
      const dateAggregates = new Map<string, { totalLines: number; totalShippedOnTime: number; sod_per_date: string }>();
      
      for (const row of otdChartRows) {
        const date = String(row['sod_per_date'] ?? '');
        const existing = dateAggregates.get(date) || { totalLines: 0, totalShippedOnTime: 0, sod_per_date: date };
        existing.totalLines += Number(row['total_lines'] ?? 0);
        existing.totalShippedOnTime += Number(row['total_shipped_on_time'] ?? 0);
        dateAggregates.set(date, existing);
      }
      
      // Convert aggregates to ChartRow format
      mappedChartRows = Array.from(dateAggregates.values()).map((agg) => ({
        value: agg.totalLines > 0 ? Number(((agg.totalShippedOnTime / agg.totalLines) * 100).toFixed(2)) : 0,
        label: 'nocustomer',  // Match legacy PHP key
        request_date: agg.sod_per_date,
        background_color: this.getColorForLabel('nocustomer'),
      }));
    } else {
      // Keep individual customer series for specific customer selection
      mappedChartRows = otdChartRows.map((row) => ({
        value: Number(row['value'] ?? 0),
        label: String(row['label'] ?? row['so_cust'] ?? 'Other'),
        request_date: String(row['sod_per_date'] ?? ''),
        background_color: this.getColorForLabel(String(row['label'] ?? row['so_cust'] ?? 'Other')),
      }));
    }

    const chartData = this.buildChart(mappedChartRows, from, to, view);

    // Build reasonChart from queried data
    const reasonChart: { label: string[]; value: number[] } = { label: [], value: [] };
    if (reasonChartRows && reasonChartRows.length > 0) {
      for (const row of reasonChartRows) {
        reasonChart.label.push(String(row['label'] ?? 'Other'));
        reasonChart.value.push(Number(row['total_lines'] ?? 0));
      }
    }

    return {
      details: enrichedDetails,
      summary,
      average,
      chartData,
      goal: 90,
      reasonChart,
    };
  }

  async refreshOtdData(): Promise<unknown> {
    return this.repository.refreshOtdData();
  }

  private formatDateKey(date: Date, typeOfView: ReportView): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    if (typeOfView === 'Weekly') return `${this.getWeekNumber(date)}-${year}`;
    if (typeOfView === 'Monthly') return `${month + 1}-${year}`;
    if (typeOfView === 'Annually') return `${year}`;
    if (typeOfView === 'Quarterly') return `${Math.ceil((month + 1) / 3)}-${year}`;
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const yy = String(year).slice(-2);
    return `${mm}/${dd}/${yy}-${year}`;
  }

}
