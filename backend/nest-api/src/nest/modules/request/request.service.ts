import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestRepository } from './request.repository';

interface ChartPoint {
  dataset: number[];
  label: string;
  backgroundColor?: string;
  type?: string;
}

interface ChartResponse {
  obj: { label: string[] };
  chart: Record<string, unknown>[];
  chartnew: Record<string, ChartPoint>;
}

@Injectable()
export class RequestService {
  constructor(private readonly repository: RequestRepository) {}

  async getById(id: number) {
    return this.repository.findOne({ id });
  }

  async getAllRequests(selectedViewType?: string) {
    return this.repository.getAllRequests(selectedViewType);
  }

  async getChart(
    dateFrom?: string,
    dateTo?: string,
    displayCustomers?: string,
    typeOfView?: string,
  ) {
    const from = (dateFrom || '').trim();
    const to = (dateTo || '').trim();
    if (!from || !to) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    const customerFilter =
      displayCustomers === 'false' || displayCustomers === 'undefined' || !displayCustomers
        ? 'Show All'
        : displayCustomers;

    const normalizedType = (typeOfView || 'Monthly') as
      | 'Weekly'
      | 'Monthly'
      | 'Annually'
      | 'Daily'
      | 'Quarterly';

    const [summary, rows] = await Promise.all([
      this.repository.getSummary(from, to),
      this.repository.getChartRows(from, to, customerFilter),
    ]);

    const chartData = this.getDynamicData(rows, from, to, normalizedType, customerFilter);

    return {
      summary,
      chartData,
    };
  }

  async create(payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const insertId = await this.repository.create(sanitized);
    return this.repository.findOne({ id: insertId });
  }

  async update(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`Request ${id} not found`);
    }

    return this.repository.findOne({ id });
  }

  private getDynamicData(
    rows: Array<Record<string, unknown>>,
    weekStartDate: string,
    weekEndDate: string,
    typeOfView: 'Weekly' | 'Monthly' | 'Annually' | 'Daily' | 'Quarterly',
    displayCustomers: string,
  ): ChartResponse {
    const labels: string[] = [];
    const chart1: Record<string, ChartPoint> = {};

    const startDate = new Date(weekStartDate);
    const endDate = new Date(weekEndDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { obj: { label: [] }, chart: [], chartnew: {} };
    }

    const uniqueCustomers =
      displayCustomers !== 'Show All'
        ? Array.from(new Set(rows.map((row) => String(row.label || '')))).filter(Boolean)
        : [];

    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const labelContext = this.getLabelContext(cursor, typeOfView);
      labels.push(labelContext.label);

      if (displayCustomers !== 'Show All') {
        for (const customer of uniqueCustomers) {
          let value = 0;
          for (const row of rows) {
            const rowLabel = String(row.label || '');
            if (rowLabel !== customer) {
              continue;
            }

            const rowDate = new Date(String(row.sod_per_date || ''));
            if (Number.isNaN(rowDate.getTime())) {
              continue;
            }

            if (this.getCompareKey(rowDate, typeOfView) === labelContext.compareKey) {
              value += Number(row.value || 0);
            }
          }

          if (!chart1[customer]) {
            chart1[customer] = { dataset: [], label: customer };
          }
          chart1[customer].dataset.push(value);
        }
      } else {
        let value = 0;
        for (const row of rows) {
          const rowDate = new Date(String(row.sod_per_date || ''));
          if (Number.isNaN(rowDate.getTime())) {
            continue;
          }

          if (this.getCompareKey(rowDate, typeOfView) === labelContext.compareKey) {
            value += Number(row.value || 0);
          }
        }

        if (!chart1.nocustomer) {
          chart1.nocustomer = {
            dataset: [],
            label: 'Requests',
            backgroundColor: '#8FBC8F',
            type: 'bar',
          };
        }
        chart1.nocustomer.dataset.push(value);
      }

      this.advanceCursor(cursor, typeOfView);
    }

    return {
      obj: { label: labels },
      chart: [],
      chartnew: chart1,
    };
  }

  private getLabelContext(date: Date, typeOfView: 'Weekly' | 'Monthly' | 'Annually' | 'Daily' | 'Quarterly') {
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

  private getCompareKey(
    date: Date,
    typeOfView: 'Weekly' | 'Monthly' | 'Annually' | 'Daily' | 'Quarterly',
  ): string {
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

  private advanceCursor(
    cursor: Date,
    typeOfView: 'Weekly' | 'Monthly' | 'Annually' | 'Daily' | 'Quarterly',
  ) {
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
}
