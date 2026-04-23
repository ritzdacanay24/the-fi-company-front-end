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
import { toJsonSafe } from '@/shared/utils/json-safe.util';
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

    const cursor = new Date(from);
    const end = new Date(to);

    while (cursor <= end) {
      const { label, compareKey } = this.getLabelContext(cursor, view);
      if (!labels.includes(label)) {
        labels.push(label);
        let periodTotal = 0;
        for (const row of rows) {
          const shpDate = String(row['abs_shp_date'] ?? row['ABS_SHP_DATE'] ?? '');
          if (!shpDate) continue;
          const rowKey = this.formatDateKey(new Date(shpDate), view);
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

    const [details, summary] = await Promise.all([
      this.repository.getOtdReportV1Details(from, to, custFilter),
      this.repository.getOtdReportV1Summary(from, to),
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

    return { details: enrichedDetails, summary, average };
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
