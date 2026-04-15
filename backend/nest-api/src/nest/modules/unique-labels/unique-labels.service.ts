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

interface UniqueLabelSettings {
  quantity_printed_default: number;
  label_template_name: string;
  allow_reprint: boolean;
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
      const settings = await this.getSettingsValues();
      const quantityPrintedDefault = Math.max(1, Number(settings.quantity_printed_default || 2));

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
            (source_type, work_order_number, part_number, requested_quantity, created_by_name, status)
            VALUES (:source_type, :work_order_number, :part_number, :requested_quantity, :created_by_name, :status)
          `,
          {
            source_type: sourceType,
            work_order_number: workOrderNumber,
            part_number: partNumber,
            requested_quantity: quantity,
            created_by_name: createdByName,
            status: 'active',
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
            quantity_printed: quantityPrintedDefault,
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
          insertValues[`${paramKey}_quantity_printed`] = quantityPrintedDefault;
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

  async getRecentBatches(limitRaw?: string, statusRaw?: string): Promise<ApiResponse<RowDataPacket[]>> {
    const parsedLimit = Number(limitRaw || 20);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20;
    const status = String(statusRaw || 'active').trim().toLowerCase();
    const whereClause =
      status === 'all'
        ? '1 = 1'
        : status === 'deleted'
          ? "b.status = 'deleted'"
          : status === 'archived'
            ? "b.status = 'archived'"
            : "b.status = 'active'";

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
            b.status,
            b.created_at,
            COUNT(i.id) AS generated_count
          FROM unique_label_batches b
          LEFT JOIN unique_label_identifiers i ON i.batch_id = b.id AND i.status != 'deleted'
          WHERE ${whereClause}
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

  async updateBatch(idRaw?: string, body: Record<string, unknown> = {}): Promise<ApiResponse<Record<string, unknown>>> {
    const batchId = Number(idRaw || 0);
    if (!Number.isFinite(batchId) || batchId <= 0) {
      return { success: false, message: 'batch id is required' };
    }

    const sourceType = body.source_type !== undefined ? this.normalizeSourceType(body.source_type) : undefined;
    const workOrderNumber = body.work_order_number !== undefined ? this.nullableString(body.work_order_number) : undefined;
    const partNumber = body.part_number !== undefined ? String(body.part_number || '').trim() : undefined;
    const updatedByName = String(body.updated_by_name || body.actor_name || '').trim() || 'Admin';

    if (body.source_type !== undefined && !sourceType) {
      return { success: false, message: 'source_type must be WO or MANUAL' };
    }

    if (body.part_number !== undefined && !partNumber) {
      return { success: false, message: 'part_number cannot be empty' };
    }

    const updates: string[] = ['updated_by_name = :updated_by_name'];
    const params: Record<string, unknown> = { id: batchId, updated_by_name: updatedByName };

    if (sourceType !== undefined) {
      updates.push('source_type = :source_type');
      params.source_type = sourceType;
    }
    if (workOrderNumber !== undefined) {
      updates.push('work_order_number = :work_order_number');
      params.work_order_number = workOrderNumber;
    }
    if (partNumber !== undefined) {
      updates.push('part_number = :part_number');
      params.part_number = partNumber;
    }

    if (updates.length === 1) {
      return { success: false, message: 'No editable fields were provided' };
    }

    try {
      await this.ensureTables();

      await this.mysqlService.withTransaction(async (connection) => {
        const [result] = await connection.execute<ResultSetHeader>(
          `
            UPDATE unique_label_batches
            SET ${updates.join(', ')}, updated_at = NOW()
            WHERE id = :id
          `,
          params as unknown as never[],
        );

        if (result.affectedRows === 0) {
          throw new Error('Batch not found');
        }

        const identifierUpdates: string[] = [];
        const identifierParams: Record<string, unknown> = { batch_id: batchId };

        if (sourceType !== undefined) {
          identifierUpdates.push('source_type = :source_type');
          identifierParams.source_type = sourceType;
        }
        if (workOrderNumber !== undefined) {
          identifierUpdates.push('work_order_number = :work_order_number');
          identifierParams.work_order_number = workOrderNumber;
        }
        if (partNumber !== undefined) {
          identifierUpdates.push('part_number = :part_number');
          identifierParams.part_number = partNumber;
        }

        if (identifierUpdates.length > 0) {
          await connection.execute(
            `
              UPDATE unique_label_identifiers
              SET ${identifierUpdates.join(', ')}
              WHERE batch_id = :batch_id
            `,
            identifierParams as unknown as never[],
          );
        }
      });

      return { success: true, message: 'Batch updated successfully' };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update batch: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async archiveBatch(idRaw?: string, body: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.setBatchLifecycle(idRaw, {
      nextStatus: 'archived',
      actorName: String(body.actor_name || body.updated_by_name || '').trim() || 'Admin',
      reason: this.nullableString(body.reason),
    });
  }

  async softDeleteBatch(idRaw?: string, body: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.setBatchLifecycle(idRaw, {
      nextStatus: 'deleted',
      actorName: String(body.actor_name || body.updated_by_name || '').trim() || 'Admin',
      reason: this.nullableString(body.reason),
    });
  }

  async restoreBatch(idRaw?: string, body: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.setBatchLifecycle(idRaw, {
      nextStatus: 'active',
      actorName: String(body.actor_name || body.updated_by_name || '').trim() || 'Admin',
      reason: null,
    });
  }

  async hardDeleteBatch(idRaw?: string, body: Record<string, unknown> = {}): Promise<ApiResponse> {
    const batchId = Number(idRaw || 0);
    if (!Number.isFinite(batchId) || batchId <= 0) {
      return { success: false, message: 'batch id is required' };
    }

    const confirm = String(body.confirm || '').trim().toUpperCase();
    if (confirm !== 'DELETE') {
      return { success: false, message: 'Hard delete requires confirm = DELETE' };
    }

    try {
      await this.ensureTables();
      const result = await this.mysqlService.execute<ResultSetHeader>(
        `DELETE FROM unique_label_batches WHERE id = :id`,
        { id: batchId },
      );

      if (result.affectedRows === 0) {
        return { success: false, message: 'Batch not found' };
      }

      return { success: true, message: 'Batch hard deleted successfully' };
    } catch (error) {
      return {
        success: false,
        message: `Failed to hard delete batch: ${this.getErrorMessage(error)}`,
      };
    }
  }

  private async setBatchLifecycle(
    idRaw: string | undefined,
    options: {
      nextStatus: 'active' | 'archived' | 'deleted';
      actorName: string;
      reason: string | null;
    },
  ): Promise<ApiResponse> {
    const batchId = Number(idRaw || 0);
    if (!Number.isFinite(batchId) || batchId <= 0) {
      return { success: false, message: 'batch id is required' };
    }

    try {
      await this.ensureTables();

      await this.mysqlService.withTransaction(async (connection) => {
        const baseUpdate = [
          'status = :status',
          'updated_by_name = :actor_name',
          'updated_at = NOW()',
          'archived_at = NULL',
          'archived_by_name = NULL',
          'archive_reason = NULL',
          'deleted_at = NULL',
          'deleted_by_name = NULL',
          'delete_reason = NULL',
        ];

        if (options.nextStatus === 'archived') {
          baseUpdate.push('archived_at = NOW()', 'archived_by_name = :actor_name', 'archive_reason = :reason');
        }

        if (options.nextStatus === 'deleted') {
          baseUpdate.push('deleted_at = NOW()', 'deleted_by_name = :actor_name', 'delete_reason = :reason');
        }

        const [batchUpdateResult] = await connection.execute<ResultSetHeader>(
          `
            UPDATE unique_label_batches
            SET ${baseUpdate.join(', ')}
            WHERE id = :id
          `,
          {
            id: batchId,
            status: options.nextStatus,
            actor_name: options.actorName,
            reason: options.reason,
          },
        );

        if (batchUpdateResult.affectedRows === 0) {
          throw new Error('Batch not found');
        }

        const identifierUpdate = [
          'status = :status',
          'archived_at = NULL',
          'deleted_at = NULL',
        ];

        if (options.nextStatus === 'archived') {
          identifierUpdate.push('archived_at = NOW()');
        }

        if (options.nextStatus === 'deleted') {
          identifierUpdate.push('deleted_at = NOW()');
        }

        await connection.execute(
          `
            UPDATE unique_label_identifiers
            SET ${identifierUpdate.join(', ')}
            WHERE batch_id = :batch_id
          `,
          {
            batch_id: batchId,
            status: options.nextStatus,
          },
        );
      });

      const statusMessage =
        options.nextStatus === 'archived'
          ? 'Batch archived successfully'
          : options.nextStatus === 'deleted'
            ? 'Batch soft deleted successfully'
            : 'Batch restored successfully';

      return { success: true, message: statusMessage };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update lifecycle: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async getBatchDetails(idRaw?: string): Promise<ApiResponse<Record<string, unknown>>> {
    const batchId = Number(idRaw || 0);
    if (!Number.isFinite(batchId) || batchId <= 0) {
      return { success: false, message: 'batch id is required' };
    }

    try {
      await this.ensureTables();

      const batchRows = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT
            id,
            source_type,
            work_order_number,
            part_number,
            requested_quantity,
            created_by_name,
            status,
            created_at
          FROM unique_label_batches
          WHERE id = :id
          LIMIT 1
        `,
        { id: batchId },
      );

      if (!batchRows[0]) {
        return { success: false, message: 'Batch not found', error: 'NOT_FOUND' };
      }

      const identifierRows = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT
            id,
            unique_identifier,
            part_number,
            work_order_number,
            quantity_printed,
            status,
            created_at
          FROM unique_label_identifiers
          WHERE batch_id = :batch_id
          ORDER BY id ASC
        `,
        { batch_id: batchId },
      );

      return {
        success: true,
        data: {
          batch: batchRows[0],
          identifiers: identifierRows,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to load batch details: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async getReportSummary(daysRaw?: string): Promise<ApiResponse<Record<string, unknown>>> {
    const parsedDays = Number(daysRaw || 30);
    const days = Number.isFinite(parsedDays) ? Math.min(Math.max(parsedDays, 1), 365) : 30;

    try {
      await this.ensureTables();

      const totalsRows = await this.mysqlService.query<Array<RowDataPacket & {
        total_batches: number;
        total_labels: number;
        wo_batches: number;
        manual_batches: number;
      }>>(
        `
          SELECT
            COUNT(DISTINCT b.id) AS total_batches,
            COUNT(i.id) AS total_labels,
            SUM(CASE WHEN b.source_type = 'WO' THEN 1 ELSE 0 END) AS wo_batches,
            SUM(CASE WHEN b.source_type = 'MANUAL' THEN 1 ELSE 0 END) AS manual_batches
          FROM unique_label_batches b
          LEFT JOIN unique_label_identifiers i ON i.batch_id = b.id
          WHERE b.created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
            AND b.status != 'deleted'
            AND (i.status IS NULL OR i.status != 'deleted')
        `,
        { days },
      );

      const topParts = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT
            part_number,
            COUNT(*) AS labels_generated
          FROM unique_label_identifiers
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
            AND status != 'deleted'
          GROUP BY part_number
          ORDER BY labels_generated DESC
          LIMIT 10
        `,
        { days },
      );

      const weekUsage = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT
            ws.year_num,
            ws.week_num,
            ws.last_sequence,
            (999 - ws.last_sequence) AS remaining
          FROM unique_label_weekly_sequences ws
          INNER JOIN (
            SELECT DISTINCT year_num, week_num
            FROM unique_label_identifiers
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
              AND status != 'deleted'
          ) filtered_weeks
            ON filtered_weeks.year_num = ws.year_num
           AND filtered_weeks.week_num = ws.week_num
          ORDER BY ws.year_num DESC, ws.week_num DESC
          LIMIT 8
        `,
        { days },
      );

      return {
        success: true,
        data: {
          days,
          totals: totalsRows[0] || {
            total_batches: 0,
            total_labels: 0,
            wo_batches: 0,
            manual_batches: 0,
          },
          top_parts: topParts,
          week_usage: weekUsage,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to load report summary: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async getSettings(): Promise<ApiResponse<UniqueLabelSettings>> {
    try {
      await this.ensureTables();
      const settings = await this.getSettingsValues();
      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to load settings: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async updateSettings(body: Record<string, unknown>): Promise<ApiResponse<UniqueLabelSettings>> {
    try {
      await this.ensureTables();

      const quantityPrinted = Number(body.quantity_printed_default);
      const templateName = String(body.label_template_name || '').trim();
      const allowReprint = Boolean(body.allow_reprint);

      if (!Number.isFinite(quantityPrinted) || quantityPrinted < 1 || quantityPrinted > 20) {
        return { success: false, message: 'quantity_printed_default must be between 1 and 20' };
      }

      if (!templateName) {
        return { success: false, message: 'label_template_name is required' };
      }

      await this.mysqlService.withTransaction(async (connection) => {
        await connection.execute(
          `
            INSERT INTO unique_label_settings (setting_key, setting_value)
            VALUES ('quantity_printed_default', :value)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
          `,
          { value: String(quantityPrinted) },
        );

        await connection.execute(
          `
            INSERT INTO unique_label_settings (setting_key, setting_value)
            VALUES ('label_template_name', :value)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
          `,
          { value: templateName },
        );

        await connection.execute(
          `
            INSERT INTO unique_label_settings (setting_key, setting_value)
            VALUES ('allow_reprint', :value)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
          `,
          { value: allowReprint ? '1' : '0' },
        );
      });

      const settings = await this.getSettingsValues();
      return {
        success: true,
        data: settings,
        message: 'Settings saved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update settings: ${this.getErrorMessage(error)}`,
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
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by_name VARCHAR(128) NULL,
        archived_at DATETIME NULL,
        archived_by_name VARCHAR(128) NULL,
        archive_reason VARCHAR(255) NULL,
        deleted_at DATETIME NULL,
        deleted_by_name VARCHAR(128) NULL,
        delete_reason VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_unique_label_batches_status (status),
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
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        archived_at DATETIME NULL,
        deleted_at DATETIME NULL,
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

    await this.mysqlService.execute(`
      CREATE TABLE IF NOT EXISTS unique_label_settings (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        setting_key VARCHAR(64) NOT NULL,
        setting_value VARCHAR(255) NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_unique_label_settings_key (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.ensureColumnExists('unique_label_batches', 'status', "VARCHAR(20) NOT NULL DEFAULT 'active'");
    await this.ensureColumnExists(
      'unique_label_batches',
      'updated_at',
      'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    );
    await this.ensureColumnExists('unique_label_batches', 'updated_by_name', 'VARCHAR(128) NULL');
    await this.ensureColumnExists('unique_label_batches', 'archived_at', 'DATETIME NULL');
    await this.ensureColumnExists('unique_label_batches', 'archived_by_name', 'VARCHAR(128) NULL');
    await this.ensureColumnExists('unique_label_batches', 'archive_reason', 'VARCHAR(255) NULL');
    await this.ensureColumnExists('unique_label_batches', 'deleted_at', 'DATETIME NULL');
    await this.ensureColumnExists('unique_label_batches', 'deleted_by_name', 'VARCHAR(128) NULL');
    await this.ensureColumnExists('unique_label_batches', 'delete_reason', 'VARCHAR(255) NULL');

    await this.ensureColumnExists('unique_label_identifiers', 'status', "VARCHAR(20) NOT NULL DEFAULT 'active'");
    await this.ensureColumnExists('unique_label_identifiers', 'archived_at', 'DATETIME NULL');
    await this.ensureColumnExists('unique_label_identifiers', 'deleted_at', 'DATETIME NULL');

    await this.mysqlService.execute(`
      UPDATE unique_label_batches
      SET status = 'active'
      WHERE status IS NULL OR status = '';
    `);

    await this.mysqlService.execute(`
      UPDATE unique_label_identifiers
      SET status = 'active'
      WHERE status IS NULL OR status = '';
    `);

    await this.mysqlService.execute(`
      INSERT IGNORE INTO unique_label_settings (setting_key, setting_value)
      VALUES
        ('quantity_printed_default', '2'),
        ('label_template_name', 'default-2x4'),
        ('allow_reprint', '1');
    `);

    this.tablesReady = true;
  }

  private async getSettingsValues(): Promise<UniqueLabelSettings> {
    const rows = await this.mysqlService.query<Array<RowDataPacket & { setting_key: string; setting_value: string }>>(
      `
        SELECT setting_key, setting_value
        FROM unique_label_settings
      `,
    );

    const map = new Map<string, string>();
    for (const row of rows) {
      map.set(row.setting_key, row.setting_value);
    }

    return {
      quantity_printed_default: Number(map.get('quantity_printed_default') || 2),
      label_template_name: String(map.get('label_template_name') || 'default-2x4'),
      allow_reprint: String(map.get('allow_reprint') || '1') === '1',
    };
  }

  private async ensureColumnExists(tableName: string, columnName: string, definition: string): Promise<void> {
    if (!/^[a-zA-Z0-9_]+$/.test(tableName) || !/^[a-zA-Z0-9_]+$/.test(columnName)) {
      throw new Error('Invalid table or column name for schema migration');
    }

    const existing = await this.mysqlService.query<Array<RowDataPacket & { column_count: number }>>(
      `
        SELECT COUNT(*) AS column_count
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :table_name
          AND COLUMN_NAME = :column_name
      `,
      {
        table_name: tableName,
        column_name: columnName,
      },
    );

    if (Number(existing[0]?.column_count || 0) > 0) {
      return;
    }

    await this.mysqlService.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
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
