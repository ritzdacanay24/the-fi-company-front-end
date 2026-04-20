import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

export type TripExpenseTransactionRecord = RowDataPacket & Record<string, unknown>;

@Injectable()
export class TripExpenseTransactionsRepository {
  private readonly workOrderMiscTable = 'fs_workOrderMisc';
  private readonly tripExpenseTransactionsTable = 'fs_trip_expense_transactions';

  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  private sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(([key, value]) => {
        if (value === undefined) {
          return false;
        }

        if (key === 'id') {
          return false;
        }

        return /^[A-Za-z0-9_]+$/.test(key);
      }),
    );
  }

  private sanitizeSpreadsheetRow(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(([key, value]) => {
        if (value === undefined) {
          return false;
        }

        return /^[A-Za-z0-9_]+$/.test(key);
      }),
    );
  }

  async getByFsId(fsId: number, workOrderId?: number): Promise<TripExpenseTransactionRecord[]> {
    const sql = `
      SELECT a.*, c.id AS workOrderId, f.*, d.id AS work_order_transaction_id
      FROM fs_trip_expense_assign a
      INNER JOIN fs_trip_expense_transactions f ON f.Transaction_ID = a.transaction_id
      LEFT JOIN fs_scheduler b ON b.id = a.fs_id
      LEFT JOIN fs_workOrder c ON c.fs_scheduler_id = b.id
      LEFT JOIN fs_workOrderTrip d ON d.workOrderId = c.id AND d.transaction_id = a.transaction_id
      WHERE a.fs_id = :fsId
        AND (:workOrderId IS NULL OR c.id = :workOrderId)
    `;

    return this.mysqlService.query<TripExpenseTransactionRecord[]>(sql, {
      fsId,
      workOrderId: Number.isFinite(workOrderId) ? workOrderId : null,
    });
  }

  async getByWorkOrderId(workOrderId: number): Promise<TripExpenseTransactionRecord[]> {
    return this.mysqlService.query<TripExpenseTransactionRecord[]>(
      `
        SELECT *
        FROM ${this.workOrderMiscTable}
        WHERE workOrderId = ?
      `,
      [workOrderId],
    );
  }

  async getById(id: number): Promise<TripExpenseTransactionRecord | null> {
    const rows = await this.mysqlService.query<TripExpenseTransactionRecord[]>(
      `
        SELECT *
        FROM ${this.workOrderMiscTable}
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );

    return rows[0] ?? null;
  }

  async create(payload: Record<string, unknown>): Promise<number> {
    const sanitized = this.sanitizePayload(payload);
    const keys = Object.keys(sanitized);
    const values = Object.values(sanitized);

    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.workOrderMiscTable} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, values);
    return result.insertId;
  }

  async updateCreditCardTransactionById(id: number, payload: Record<string, unknown>): Promise<number> {
    const sanitized = this.sanitizePayload(payload);
    const keys = Object.keys(sanitized);
    const values = Object.values(sanitized);

    const setClause = keys.map((key) => `${key} = ?`).join(', ');
    const sql = `UPDATE ${this.tripExpenseTransactionsTable} SET ${setClause} WHERE id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [...values, id]);
    return result.affectedRows;
  }

  async deleteById(id: number): Promise<number> {
    const sql = `DELETE FROM ${this.workOrderMiscTable} WHERE id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [id]);
    return result.affectedRows;
  }

  async findByDateRange(dateFrom: string, dateTo: string): Promise<TripExpenseTransactionRecord[]> {
    return this.mysqlService.query<TripExpenseTransactionRecord[]>(
      `
        SELECT *
        FROM ${this.tripExpenseTransactionsTable}
        WHERE DATE(STR_TO_DATE(Transaction_Date, '%m/%d/%Y')) BETWEEN ? AND ?
      `,
      [dateFrom, dateTo],
    );
  }

  async getSummaryByDateRange(dateFrom: string, dateTo: string): Promise<TripExpenseTransactionRecord[]> {
    return this.mysqlService.query<TripExpenseTransactionRecord[]>(
      `
        SELECT SUM(Transaction_Amount) AS value,
               Cardholder_First_Name AS label
        FROM ${this.tripExpenseTransactionsTable}
        WHERE STR_TO_DATE(Transaction_Date, '%m/%d/%Y') BETWEEN ? AND ?
        GROUP BY Cardholder_First_Name, STR_TO_DATE(Transaction_Date, '%m/%d/%Y')
      `,
      [dateFrom, dateTo],
    );
  }

  async getChartRowsByDateRange(dateFrom: string, dateTo: string): Promise<TripExpenseTransactionRecord[]> {
    return this.mysqlService.query<TripExpenseTransactionRecord[]>(
      `
        SELECT STR_TO_DATE(Transaction_Date, '%m/%d/%Y') AS sod_per_date,
               SUM(Transaction_Amount) AS value,
               Cardholder_First_Name AS label,
               Cardholder_First_Name AS so_cust,
               0 AS total_lines
        FROM ${this.tripExpenseTransactionsTable}
        WHERE STR_TO_DATE(Transaction_Date, '%m/%d/%Y') BETWEEN ? AND ?
        GROUP BY STR_TO_DATE(Transaction_Date, '%m/%d/%Y'), Cardholder_First_Name
      `,
      [dateFrom, dateTo],
    );
  }

  async getByTransactionId(transactionId: string): Promise<TripExpenseTransactionRecord | null> {
    const rows = await this.mysqlService.query<TripExpenseTransactionRecord[]>(
      `
        SELECT *
        FROM ${this.tripExpenseTransactionsTable}
        WHERE Transaction_ID = ?
        LIMIT 1
      `,
      [transactionId],
    );

    return rows[0] ?? null;
  }

  async createTransaction(payload: Record<string, unknown>): Promise<number> {
    const sanitized = this.sanitizeSpreadsheetRow(payload);
    const keys = Object.keys(sanitized);
    const values = Object.values(sanitized);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.tripExpenseTransactionsTable} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, values);
    return result.insertId;
  }

  async updateTransactionById(id: number, payload: Record<string, unknown>): Promise<number> {
    const sanitized = this.sanitizeSpreadsheetRow(payload);
    const keys = Object.keys(sanitized);
    const values = Object.values(sanitized);
    const setClause = keys.map((key) => `${key} = ?`).join(', ');
    const sql = `UPDATE ${this.tripExpenseTransactionsTable} SET ${setClause} WHERE id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [...values, id]);
    return result.affectedRows;
  }

  async getAssignmentByTransactionAndFsId(
    transactionId: string,
    fsId: number,
  ): Promise<TripExpenseTransactionRecord | null> {
    const rows = await this.mysqlService.query<TripExpenseTransactionRecord[]>(
      `
        SELECT *
        FROM fs_trip_expense_assign
        WHERE transaction_id = ? AND fs_id = ?
        LIMIT 1
      `,
      [transactionId, fsId],
    );

    return rows[0] ?? null;
  }

  async createAssignment(transactionId: string, fsId: number): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `INSERT INTO fs_trip_expense_assign (fs_id, transaction_id) VALUES (?, ?)`,
      [fsId, transactionId],
    );
    return result.insertId;
  }

  async updateAssignmentById(id: number, transactionId: string, fsId: number): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `
        UPDATE fs_trip_expense_assign
        SET fs_id = ?, transaction_id = ?
        WHERE id = ?
      `,
      [fsId, transactionId, id],
    );

    return result.affectedRows;
  }

  async getTeamEmailsByFsId(fsId: number): Promise<string[]> {
    const rows = await this.mysqlService.query<TripExpenseTransactionRecord[]>(
      `
        SELECT b.email
        FROM fs_team a
        LEFT JOIN db.users b ON CONCAT(b.first, ' ', b.last) = a.user
        WHERE a.fs_det_id = ?
          AND b.email IS NOT NULL
          AND b.email <> ''
      `,
      [fsId],
    );

    return rows.map((row) => String(row.email || '')).filter((email) => Boolean(email));
  }

  async markEmailSentByIds(ids: number[], emailSentAt: string): Promise<number> {
    if (!ids.length) {
      return 0;
    }

    const placeholders = ids.map(() => '?').join(', ');
    const sql = `UPDATE ${this.tripExpenseTransactionsTable} SET email_sent = ? WHERE id IN (${placeholders})`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [emailSentAt, ...ids]);
    return result.affectedRows;
  }
}
