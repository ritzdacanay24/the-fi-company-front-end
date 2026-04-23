import { BadRequestException, Injectable } from '@nestjs/common';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

type PriorityRow = RowDataPacket & {
  id: number;
  order_id: string;
  sales_order_number: string;
  sales_order_line: string | null;
  priority_level: number;
  notes: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string | null;
  is_active: number;
  full_order_reference?: string;
};

@Injectable()
export class ShippingPrioritiesService {
  constructor(private readonly mysqlService: MysqlService) {}

  async getActivePriorities(orderId?: string) {
    const normalizedOrderId = String(orderId || '').trim();
    const where = normalizedOrderId ? 'AND order_id = ?' : '';
    const params = normalizedOrderId ? [normalizedOrderId] : [];

    const rows = await this.mysqlService.query<PriorityRow[]>(
      `
        SELECT id
          , order_id
          , sales_order_number
          , sales_order_line
          , priority_level
          , notes
          , created_at
          , created_by
          , updated_at
          , updated_by
          , is_active
          , CONCAT(
              sales_order_number,
              CASE
                WHEN sales_order_line IS NULL OR sales_order_line = '' THEN ''
                ELSE CONCAT('-', sales_order_line)
              END
            ) AS full_order_reference
        FROM shipping_priorities
        WHERE is_active = 1
          ${where}
        ORDER BY priority_level ASC, id ASC
      `,
      params,
    );

    return {
      success: true,
      message: 'Priorities retrieved',
      data: rows,
    };
  }

  async applyChange(payload: Record<string, unknown>) {
    const orderId = String(payload.order_id || '').trim();
    const salesOrderNumber = String(payload.sales_order_number || '').trim();
    const salesOrderLine = this.normalizeOptionalString(payload.sales_order_line);
    const notes = this.normalizeOptionalString(payload.notes);
    const priority = this.toPositiveIntOrZero(payload.priority);
    const updatedBy = this.normalizeOptionalString(payload.updated_by) || 'api_user';
    const createdBy = this.normalizeOptionalString(payload.created_by) || updatedBy;

    if (!orderId) {
      throw new BadRequestException('order_id is required');
    }

    if (priority > 0 && !salesOrderNumber) {
      throw new BadRequestException('sales_order_number is required when setting a priority');
    }

    const result = await this.mysqlService.withTransaction(async (connection) => {
      const activeRows = await this.getActiveRows(connection);
      const existing = activeRows.find((row) => row.order_id === orderId) || null;

      if (priority === 0) {
        if (existing) {
          await this.deactivateByOrderId(connection, orderId, updatedBy);
        }

        const resequenced = await this.resequenceActiveRows(connection, updatedBy);
        return {
          success: true,
          message: existing ? 'Priority removed' : 'Priority not found (already removed)',
          data: resequenced,
        };
      }

      let targetId: number;

      if (existing) {
        targetId = existing.id;
        await connection.execute<ResultSetHeader>(
          `
            UPDATE shipping_priorities
            SET sales_order_number = ?
              , sales_order_line = ?
              , notes = ?
              , updated_by = ?
              , updated_at = NOW()
            WHERE id = ?
            LIMIT 1
          `,
          [salesOrderNumber, salesOrderLine, notes, updatedBy, targetId],
        );
      } else {
        const insert = await connection.execute<ResultSetHeader>(
          `
            INSERT INTO shipping_priorities (
              order_id,
              sales_order_number,
              sales_order_line,
              priority_level,
              notes,
              created_by,
              updated_by,
              is_active
            )
            VALUES (?, ?, ?, 999999, ?, ?, ?, 1)
          `,
          [orderId, salesOrderNumber, salesOrderLine, notes, createdBy, updatedBy],
        );

        targetId = insert[0].insertId;
      }

      const movedRows = await this.moveToPriority(connection, targetId, priority, updatedBy);

      return {
        success: true,
        message: 'Priority updated',
        data: movedRows,
      };
    });

    return result;
  }

  async reorder(payload: Record<string, unknown>) {
    const updates = Array.isArray(payload.priorities) ? payload.priorities : [];
    if (!updates.length) {
      throw new BadRequestException('priorities array is required');
    }

    const updatedBy = this.normalizeOptionalString(payload.updated_by) || 'api_user';
    const debugEnabled = Boolean(payload.debug);

    return this.mysqlService.withTransaction(async (connection) => {
      const debug: Array<Record<string, unknown>> = [];

      for (const item of updates) {
        const typedItem = item as Record<string, unknown>;
        const id = Number(typedItem.id);
        const priorityLevel = this.toPositiveIntOrZero(typedItem.priority_level);

        if (!Number.isFinite(id) || id <= 0 || priorityLevel <= 0) {
          throw new BadRequestException('Each priorities item must include numeric id and priority_level > 0');
        }

        const [result] = await connection.execute<ResultSetHeader>(
          `
            UPDATE shipping_priorities
            SET priority_level = ?
              , updated_by = ?
              , updated_at = NOW()
            WHERE id = ?
              AND is_active = 1
            LIMIT 1
          `,
          [priorityLevel, updatedBy, id],
        );

        if (debugEnabled) {
          debug.push({ id, priority_level: priorityLevel, affectedRows: result.affectedRows });
        }
      }

      const resequenced = await this.resequenceActiveRows(connection, updatedBy);
      const response: Record<string, unknown> = {
        success: true,
        message: 'Priorities reordered',
        data: resequenced,
      };

      if (debugEnabled) {
        response.debug = {
          requested: updates,
          applied: debug,
          finalCount: resequenced.length,
        };
      }

      return response;
    });
  }

  private async moveToPriority(
    connection: PoolConnection,
    targetId: number,
    requestedPriority: number,
    updatedBy: string,
  ): Promise<PriorityRow[]> {
    const activeRows = await this.getActiveRows(connection);
    const target = activeRows.find((row) => row.id === targetId);
    if (!target) {
      throw new BadRequestException('Target priority row not found');
    }

    const withoutTarget = activeRows.filter((row) => row.id !== targetId);
    const insertIndex = Math.max(0, Math.min(requestedPriority - 1, withoutTarget.length));
    withoutTarget.splice(insertIndex, 0, target);

    for (let i = 0; i < withoutTarget.length; i += 1) {
      const row = withoutTarget[i];
      const nextPriority = i + 1;
      await connection.execute<ResultSetHeader>(
        `
          UPDATE shipping_priorities
          SET priority_level = ?
            , updated_by = ?
            , updated_at = NOW()
          WHERE id = ?
          LIMIT 1
        `,
        [nextPriority, updatedBy, row.id],
      );
    }

    return this.getActiveRows(connection);
  }

  private async resequenceActiveRows(connection: PoolConnection, updatedBy: string): Promise<PriorityRow[]> {
    const rows = await this.getActiveRows(connection);

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const nextPriority = i + 1;
      if (Number(row.priority_level) === nextPriority) {
        continue;
      }

      await connection.execute<ResultSetHeader>(
        `
          UPDATE shipping_priorities
          SET priority_level = ?
            , updated_by = ?
            , updated_at = NOW()
          WHERE id = ?
          LIMIT 1
        `,
        [nextPriority, updatedBy, row.id],
      );
    }

    return this.getActiveRows(connection);
  }

  private async deactivateByOrderId(connection: PoolConnection, orderId: string, updatedBy: string): Promise<void> {
    await connection.execute<ResultSetHeader>(
      `
        UPDATE shipping_priorities
        SET is_active = 0
          , updated_by = ?
          , updated_at = NOW()
        WHERE order_id = ?
          AND is_active = 1
      `,
      [updatedBy, orderId],
    );
  }

  private async getActiveRows(connection: PoolConnection): Promise<PriorityRow[]> {
    const [rows] = await connection.query<PriorityRow[]>(
      `
        SELECT id
          , order_id
          , sales_order_number
          , sales_order_line
          , priority_level
          , notes
          , created_at
          , created_by
          , updated_at
          , updated_by
          , is_active
          , CONCAT(
              sales_order_number,
              CASE
                WHEN sales_order_line IS NULL OR sales_order_line = '' THEN ''
                ELSE CONCAT('-', sales_order_line)
              END
            ) AS full_order_reference
        FROM shipping_priorities
        WHERE is_active = 1
        ORDER BY priority_level ASC, id ASC
      `,
    );

    return rows;
  }

  private normalizeOptionalString(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    return normalized ? normalized : null;
  }

  private toPositiveIntOrZero(value: unknown): number {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return 0;
    }
    if (num <= 0) {
      return 0;
    }
    return Math.floor(num);
  }
}