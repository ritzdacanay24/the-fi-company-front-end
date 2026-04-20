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
}
