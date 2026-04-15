import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface WorkOrderLookupRow {
  work_order_number: string;
  part_number: string;
  quantity: number;
}

interface CreateBatchPayload {
  source_type?: string;
  work_order_number?: string;
  part_number?: string;
  quantity?: number | string;
  created_by_name?: string;
}

interface BatchIdentifier {
  unique_identifier: string;
  part_number: string;
  work_order_number: string | null;
  quantity_printed: number;
}

@Injectable()
export class UniqueLabelsService {
  private tablesReady = false;

  constructor(
    @Inject(MysqlService)
    private readonly mysqlService: MysqlService,
    @Inject(QadOdbcService)
    private readonly qadOdbcService: QadOdbcService,
  ) {}

  async lookupWorkOrder(woNumberRaw: string): Promise<ApiResponse<WorkOrderLookupRow>> {
    const woNumber = String(woNumberRaw || '').trim();
    if (!woNumber) {
      return { success: false, message: 'work_order_number is required' };
    }

    try {
      const sql = `
        SELECT
          wo_nbr AS work_order_number,
          wo_part AS part_number,
          wo_qty_ord AS quantity
        FROM wo_mstr
        WHERE wo_domain = 'EYE'
          AND wo_nbr = ?
        ORDER BY wo_rel_date DESC
      `;

      const rows = await this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, [woNumber]);
      const first = rows[0];

      if (!first) {
        return { success: false, message: 'Work order not found', error: 'NOT_FOUND' };
      }

      const workOrder: WorkOrderLookupRow = {
        work_order_number: String(first.work_order_number || first.WORK_ORDER_NUMBER || woNumber),
        part_number: String(first.part_number || first.PART_NUMBER || ''),
        quantity: Number(first.quantity || first.QUANTITY || 0),
      };

      return {
        success: true,
        data: workOrder,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to lookup work order: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async createBatch(body: Record<string, unknown>): Promise<ApiResponse<{ batch_id: number; identifiers: BatchIdentifier[] }>> {
    const payload = body as CreateBatchPayload;
    const sourceType = this.normalizeSourceType(payload.source_type);
    const workOrderNumber = this.nullableString(payload.work_order_number);
    const partNumber = String(payload.part_number || '').trim();
    const quantity = Number(payload.quantity || 0);
    const createdByName = String(payload.created_by_name || '').trim() || 'System';

    if (!sourceType) {
      return { success: false, message: 'source_type must be WO or MANUAL' };
    }

    if (!partNumber) {
      return { success: false, message: 'part_number is required' };
    }

    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 200) {
      return { success: false, message: 'quantity must be between 1 and 200' };
    }

    if (sourceType === 'WO' && !workOrderNumber) {
      return { success: false, message: 'work_order_number is required for WO source type' };
    }

    try {
      await this.ensureTables();

      const now = new Date();
      const { week, year } = this.getIsoWeekYear(now);
      const yearShort = year % 100;

      const result = await this.mysqlService.withTransaction(async (connection) => {
        await connection.execute(
          `
            INSERT INTO unique_label_weekly_sequences (year_num, week_num, last_sequence)
            VALUES (:year_num, :week_num, 0)
            ON DUPLICATE KEY UPDATE year_num = VALUES(year_num)
          `,
          {
            year_num: year,
            week_num: week,
          },
        );

        const [sequenceRows] = await connection.execute<Array<RowDataPacket & { last_sequence: number }>>(
          `
            SELECT last_sequence
            FROM unique_label_weekly_sequences
            WHERE year_num = :year_num
              AND week_num = :week_num
            FOR UPDATE
          `,
          {
            year_num: year,
            week_num: week,
          },
        );

        const currentSequence = Number(sequenceRows[0]?.last_sequence || 0);
        const nextSequence = currentSequence + quantity;

        if (nextSequence > 999) {
          throw new Error('Weekly sequence exceeded 999. Try again next calendar week.');
        }

        await connection.execute(
          `
            UPDATE unique_label_weekly_sequences
            SET last_sequence = :last_sequence,
                updated_at = NOW()
            WHERE year_num = :year_num
              AND week_num = :week_num
          `,
          {
            last_sequence: nextSequence,
            year_num: year,
            week_num: week,
          },
        );

        const [batchInsertResult] = await connection.execute<ResultSetHeader>(
          `
            INSERT INTO unique_label_batches
            (source_type, work_order_number, part_number, requested_quantity, created_by_name)
            VALUES (:source_type, :work_order_number, :part_number, :requested_quantity, :created_by_name)
          `,
          {
            source_type: sourceType,
            work_order_number: workOrderNumber,
            part_number: partNumber,
            requested_quantity: quantity,
            created_by_name: createdByName,
          },
        );

        const batchId = batchInsertResult.insertId;
        const identifiers: BatchIdentifier[] = [];
        const insertValues: Record<string, string | number | null> = {};
        const valuePlaceholders: string[] = [];

        for (let i = 1; i <= quantity; i += 1) {
          const sequenceNo = currentSequence + i;
          const paramKey = `row_${i}`;
          const uniqueIdentifier = `${String(week).padStart(2, '0')}${String(yearShort).padStart(2, '0')}${String(sequenceNo).padStart(3, '0')}`;

          identifiers.push({
            unique_identifier: uniqueIdentifier,
            part_number: partNumber,
            work_order_number: workOrderNumber,
            quantity_printed: 2,
          });

          valuePlaceholders.push(
            `(:${paramKey}_batch_id, :${paramKey}_unique_identifier, :${paramKey}_year_num, :${paramKey}_week_num, :${paramKey}_sequence_no, :${paramKey}_source_type, :${paramKey}_work_order_number, :${paramKey}_part_number, :${paramKey}_quantity_printed)`,
          );
          insertValues[`${paramKey}_batch_id`] = batchId;
          insertValues[`${paramKey}_unique_identifier`] = uniqueIdentifier;
          insertValues[`${paramKey}_year_num`] = year;
          insertValues[`${paramKey}_week_num`] = week;
          insertValues[`${paramKey}_sequence_no`] = sequenceNo;
          insertValues[`${paramKey}_source_type`] = sourceType;
          insertValues[`${paramKey}_work_order_number`] = workOrderNumber;
          insertValues[`${paramKey}_part_number`] = partNumber;
          insertValues[`${paramKey}_quantity_printed`] = 2;
        }

        await connection.execute(
          `
            INSERT INTO unique_label_identifiers
            (batch_id, unique_identifier, year_num, week_num, sequence_no, source_type, work_order_number, part_number, quantity_printed)
            VALUES ${valuePlaceholders.join(', ')}
          `,
          insertValues,
        );

        return {
          batch_id: batchId,
          identifiers,
        };
      });

      return {
        success: true,
        data: result,
        message: 'Unique labels generated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create unique labels: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async getRecentBatches(limitRaw?: string): Promise<ApiResponse<RowDataPacket[]>> {
    const parsedLimit = Number(limitRaw || 20);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20;

    try {
      await this.ensureTables();

      const rows = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT
            b.id,
            b.source_type,
            b.work_order_number,
            b.part_number,
            b.requested_quantity,
            b.created_by_name,
            b.created_at,
            COUNT(i.id) AS generated_count
          FROM unique_label_batches b
          LEFT JOIN unique_label_identifiers i ON i.batch_id = b.id
          GROUP BY b.id
          ORDER BY b.id DESC
          LIMIT :limit
        `,
        { limit },
      );

      return {
        success: true,
        data: rows,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to load batches: ${this.getErrorMessage(error)}`,
      };
    }
  }

  private async ensureTables(): Promise<void> {
    if (this.tablesReady) {
      return;
    }

    await this.mysqlService.execute(`
      CREATE TABLE IF NOT EXISTS unique_label_weekly_sequences (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        year_num INT NOT NULL,
        week_num INT NOT NULL,
        last_sequence INT NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_unique_label_week (year_num, week_num)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.mysqlService.execute(`
      CREATE TABLE IF NOT EXISTS unique_label_batches (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        source_type VARCHAR(20) NOT NULL,
        work_order_number VARCHAR(64) NULL,
        part_number VARCHAR(128) NOT NULL,
        requested_quantity INT NOT NULL,
        created_by_name VARCHAR(128) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_unique_label_batches_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.mysqlService.execute(`
      CREATE TABLE IF NOT EXISTS unique_label_identifiers (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        batch_id BIGINT UNSIGNED NOT NULL,
        unique_identifier VARCHAR(16) NOT NULL,
        year_num INT NOT NULL,
        week_num INT NOT NULL,
        sequence_no INT NOT NULL,
        source_type VARCHAR(20) NOT NULL,
        work_order_number VARCHAR(64) NULL,
        part_number VARCHAR(128) NOT NULL,
        quantity_printed INT NOT NULL DEFAULT 2,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_unique_label_identifier (unique_identifier),
        UNIQUE KEY uk_unique_label_week_sequence (year_num, week_num, sequence_no),
        KEY idx_unique_label_identifiers_batch_id (batch_id),
        CONSTRAINT fk_unique_label_identifiers_batch
          FOREIGN KEY (batch_id) REFERENCES unique_label_batches(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    this.tablesReady = true;
  }

  private normalizeSourceType(sourceTypeRaw: unknown): 'WO' | 'MANUAL' | null {
    const sourceType = String(sourceTypeRaw || '').trim().toUpperCase();
    if (sourceType === 'WO' || sourceType === 'MANUAL') {
      return sourceType;
    }
    return null;
  }

  private nullableString(value: unknown): string | null {
    const parsed = String(value || '').trim();
    return parsed ? parsed : null;
  }

  private getIsoWeekYear(date: Date): { week: number; year: number } {
    const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = tempDate.getUTCDay() || 7;
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { week, year: tempDate.getUTCFullYear() };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
