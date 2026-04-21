import { BadRequestException, Injectable } from '@nestjs/common';
import { EmailService } from '@/shared/email/email.service';
import * as XLSX from 'xlsx';
import { TripExpenseTransactionsRepository } from './trip-expense-transactions.repository';
import { UploadedSpreadsheetFile } from './types';

@Injectable()
export class TripExpenseTransactionsService {
  constructor(
    private readonly repository: TripExpenseTransactionsRepository,
    private readonly emailService: EmailService,
  ) {}

  getByFsId(fsId: number, workOrderId?: number) {
    return this.repository.getByFsId(fsId, workOrderId);
  }

  getByWorkOrderId(workOrderId: number) {
    return this.repository.getByWorkOrderId(workOrderId);
  }

  getById(id: number) {
    return this.repository.getById(id);
  }

  async create(payload: Record<string, unknown>) {
    const insertId = await this.repository.create(payload);
    return { insertId, ...payload };
  }

  async updateCreditCardTransactionById(id: number, payload: Record<string, unknown>) {
    const affectedRows = await this.repository.updateCreditCardTransactionById(id, payload);
    return { affectedRows };
  }

  async deleteById(id: number) {
    const affectedRows = await this.repository.deleteById(id);
    return { affectedRows };
  }

  findByDateRange(dateFrom: string, dateTo: string) {
    return this.repository.findByDateRange(dateFrom, dateTo);
  }

  private buildChartData(
    rows: Array<Record<string, unknown>>,
    dateFrom: string,
    dateTo: string,
    typeOfView = 'Monthly',
    displayCustomers = 'Show All',
  ) {
    const labels = new Set<string>();
    const bySeries: Record<string, Record<string, number>> = {};

    const dateList: Date[] = [];
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) {
        dateList.push(new Date(d));
      }
    }

    const getBucket = (dateValue: Date): string => {
      const year = dateValue.getFullYear();
      if (typeOfView === 'Weekly') {
        const firstDay = new Date(dateValue.getFullYear(), 0, 1);
        const dayOfYear = Math.floor((dateValue.getTime() - firstDay.getTime()) / 86400000) + 1;
        const week = Math.ceil(dayOfYear / 7);
        return `${week}-${year}`;
      }

      if (typeOfView === 'Annually') {
        return `${year}`;
      }

      if (typeOfView === 'Daily') {
        const mm = String(dateValue.getMonth() + 1).padStart(2, '0');
        const dd = String(dateValue.getDate()).padStart(2, '0');
        const yy = String(year).slice(-2);
        return `${mm}/${dd}/${yy}`;
      }

      if (typeOfView === 'Quarterly') {
        const quarter = Math.ceil((dateValue.getMonth() + 1) / 3);
        return `Qtr:${quarter}-${year}`;
      }

      const month = dateValue.toLocaleString('en-US', { month: 'short' });
      return `${month}-${year}`;
    };

    for (const dateValue of dateList) {
      labels.add(getBucket(dateValue));
    }

    for (const row of rows) {
      const rawDate = String(row.sod_per_date || '');
      const parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) {
        continue;
      }

      const bucket = getBucket(parsed);
      const label = String(row.label || 'Requests');
      const value = Number(row.value || 0);
      const seriesName = displayCustomers === 'Show All' ? 'Requests' : label;

      if (!bySeries[seriesName]) {
        bySeries[seriesName] = {};
      }

      bySeries[seriesName][bucket] = (bySeries[seriesName][bucket] || 0) + value;
    }

    const sortedLabels = Array.from(labels);
    const chartnew: Record<string, { dataset: number[]; label: string; type?: string; backgroundColor?: string }> = {};

    Object.entries(bySeries).forEach(([seriesName, bucketMap], index) => {
      const dataset = sortedLabels.map((bucket) => Number(bucketMap[bucket] || 0));
      chartnew[String(index)] = {
        dataset,
        label: seriesName,
        ...(displayCustomers === 'Show All' ? { type: 'bar', backgroundColor: '#8FBC8F' } : {}),
      };
    });

    return {
      obj: sortedLabels,
      chart: {},
      chartnew,
    };
  }

  async getChart(dateFrom: string, dateTo: string, displayCustomers = 'Show All', typeOfView = 'Monthly') {
    const summary = await this.repository.getSummaryByDateRange(dateFrom, dateTo);
    const chartRows = await this.repository.getChartRowsByDateRange(dateFrom, dateTo);

    const chartData1 = this.buildChartData(chartRows, dateFrom, dateTo, typeOfView, displayCustomers);

    return {
      summary,
      chartData1,
      chartData: chartRows,
    };
  }

  private normalizeSpreadsheetRow(row: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};
    for (const [rawKey, rawValue] of Object.entries(row)) {
      const key = String(rawKey).replace(/\s+/g, '_');
      if (!key) {
        continue;
      }

      if (typeof rawValue === 'string') {
        normalized[key] = rawValue.replace(/'/g, '');
      } else {
        normalized[key] = rawValue;
      }
    }

    return normalized;
  }

  async uploadCreditCardTransactions(file: UploadedSpreadsheetFile, monthAndYear: string) {
    if (!file?.buffer) {
      throw new BadRequestException('No file uploaded');
    }

    if (!monthAndYear) {
      throw new BadRequestException('Please select month and year');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find((name) => name === monthAndYear);

    if (!sheetName) {
      throw new BadRequestException(`Worksheet ${monthAndYear} was not found`);
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: null,
      raw: false,
    });

    const normalizedRows = rows.map((row) => this.normalizeSpreadsheetRow(row));

    for (const row of normalizedRows) {
      const transactionId = String(row.Transaction_ID || '').trim();
      if (!transactionId) {
        continue;
      }

      const existing = await this.repository.getByTransactionId(transactionId);
      if (!existing) {
        await this.repository.createTransaction(row);
      } else {
        await this.repository.updateTransactionById(Number(existing.id), row);
      }

      for (let i = 1; i <= 9; i += 1) {
        const fsIdRaw = row[`FSID${i}`];
        const fsId = Number(fsIdRaw);
        if (!Number.isFinite(fsId)) {
          continue;
        }

        const assignment = await this.repository.getAssignmentByTransactionAndFsId(transactionId, fsId);
        if (assignment) {
          await this.repository.updateAssignmentById(Number(assignment.id), transactionId, fsId);
        } else {
          await this.repository.createAssignment(transactionId, fsId);
        }
      }
    }

    return normalizedRows;
  }

  async emailMissingReceiptsToTechs(fsId: number, ticketNumber: string, rows: Array<Record<string, unknown>>) {
    const toEmails = await this.repository.getTeamEmailsByFsId(fsId);
    const ccEmails = [
      'ritz.dacanay@the-fi-company.com',
      'adriann.k@the-fi-company.com',
      'simona.jones@the-fi-company.com',
    ];

    const subject = `Receipts Missing for fsid ${fsId}`;
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const tableRows = rows
      .map(
        (row) => `
          <tr>
            <td>${row.Transaction_ID ?? ''}</td>
            <td>${row.Cardholder_First_Name ?? ''}</td>
            <td>${row.Cardholder_Last_Name ?? ''}</td>
            <td>${row.Original_Merchant_Name ?? ''}</td>
            <td>${row.Transaction_Amount ?? ''}</td>
          </tr>
        `,
      )
      .join('');

    const body = `
      Hello Techs, <br><br>
      You are receiving this email because we were unable to find the below receipts. <br><br>
      Please upload the missing receipts to FSID #: ${fsId}, <br><br>
      <table rules="all" border="1">
        <tr style="background: #eee;">
          <td><strong>Transaction ID</strong></td>
          <td><strong>First</strong></td>
          <td><strong>Last</strong></td>
          <td><strong>Merchan</strong></td>
          <td><strong>Amount</strong></td>
        </tr>
        ${tableRows}
      </table>
    `;

    if (toEmails.length) {
      await this.emailService.sendMail({
        to: toEmails.join(','),
        cc: ccEmails.join(','),
        subject,
        html: body,
      });
    }

    const ids = rows
      .map((row) => Number(row.id))
      .filter((id) => Number.isFinite(id));

    if (ids.length) {
      await this.repository.markEmailSentByIds(ids, date);
    }

    return toEmails;
  }
}
