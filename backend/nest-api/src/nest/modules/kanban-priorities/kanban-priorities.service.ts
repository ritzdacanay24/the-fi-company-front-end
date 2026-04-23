import { BadRequestException, Injectable } from '@nestjs/common';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

type KanbanPriorityRow = RowDataPacket & {
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
export class KanbanPrioritiesService {
  constructor(private readonly mysqlService: MysqlService) {}

  async getPriorities(orderId?: string) {
    const normalizedOrderId = String(orderId || '').trim();

    if (normalizedOrderId) {
      const rows = await this.mysqlService.query<KanbanPriorityRow[]>(
        `
          SELECT *
          FROM kanban_priorities
          WHERE order_id = ?
            AND is_active = 1
          LIMIT 1
        `,
        [normalizedOrderId],
      );

      return {
        success: true,
        message: 'Priority retrieved successfully',
        data: rows[0] || null,
      };
    }

    const rows = await this.mysqlService.query<KanbanPriorityRow[]>(
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
        FROM kanban_priorities
        WHERE is_active = 1
        ORDER BY priority_level ASC, id ASC
      `,
    );

    return {
      success: true,
      message: 'Priorities retrieved successfully',
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
      throw new BadRequestException('Missing required field: order_id');
    }

    if (priority > 0 && !salesOrderNumber) {
      throw new BadRequestException('Missing required field: sales_order_number');
    }

    return this.mysqlService.withTransaction(async (connection) => {
      const activeRows = await this.getActiveRows(connection);
      const existing = activeRows.find((row) => row.order_id === orderId) || null;

      if (priority === 0) {
        if (existing) {
          await connection.execute<ResultSetHeader>(
            `
              UPDATE kanban_priorities
              SET is_active = 0
                , updated_by = ?
                , updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
              LIMIT 1
            `,
            [updatedBy, existing.id],
          );
        }

        await this.resequence(connection, updatedBy);
        return {
          success: true,
          message: 'Priority removed and remaining priorities resequenced',
        };
      }

      if (existing) {
        const oldPriority = Number(existing.priority_level);

        if (oldPriority === priority) {
          await connection.execute<ResultSetHeader>(
            `
              UPDATE kanban_priorities
              SET notes = ?
                , updated_by = ?
                , updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
              LIMIT 1
            `,
            [notes, updatedBy, existing.id],
          );

          return { success: true, message: 'Notes updated' };
        }

        const remaining = activeRows.filter((row) => row.id !== existing.id);
        const insertIndex = Math.max(0, Math.min(priority - 1, remaining.length));
        remaining.splice(insertIndex, 0, existing);

        for (let i = 0; i < remaining.length; i += 1) {
          const row = remaining[i];
          await connection.execute<ResultSetHeader>(
            `
              UPDATE kanban_priorities
              SET priority_level = ?
                , notes = CASE WHEN id = ? THEN ? ELSE notes END
                , updated_by = ?
                , updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
              LIMIT 1
            `,
            [i + 1, existing.id, notes, updatedBy, row.id],
          );
        }

        return { success: true, message: 'Priority moved and other priorities adjusted' };
      }

      await connection.execute<ResultSetHeader>(
        `
          UPDATE kanban_priorities
          SET priority_level = priority_level + 1
            , updated_by = ?
            , updated_at = CURRENT_TIMESTAMP
          WHERE priority_level >= ?
            AND is_active = 1
        `,
        [updatedBy, priority],
      );

      await connection.execute<ResultSetHeader>(
        `
          INSERT INTO kanban_priorities (
            order_id,
            sales_order_number,
            sales_order_line,
            priority_level,
            notes,
            created_by,
            created_at,
            updated_by,
            updated_at,
            is_active
          )
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, 1)
        `,
        [orderId, salesOrderNumber, salesOrderLine, priority, notes, createdBy, updatedBy],
      );

      return { success: true, message: 'Priority created and others shifted' };
    });
  }

  async reorder(payload: Record<string, unknown>) {
    const priorities = Array.isArray(payload.priorities) ? payload.priorities : [];
    const updatedBy = this.normalizeOptionalString(payload.updated_by) || 'system';

    if (!priorities.length) {
      throw new BadRequestException('No priorities provided for reordering');
    }

    return this.mysqlService.withTransaction(async (connection) => {
      for (const priority of priorities) {
        const entry = priority as Record<string, unknown>;
        const id = Number(entry.id);
        const priorityLevel = this.toPositiveIntOrZero(entry.priority_level);

        if (!Number.isFinite(id) || id <= 0 || priorityLevel <= 0) {
          throw new BadRequestException('Invalid priority data: missing id or priority_level');
        }

        await connection.execute<ResultSetHeader>(
          `
            UPDATE kanban_priorities
            SET priority_level = ?
              , updated_by = ?
              , updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND is_active = 1
            LIMIT 1
          `,
          [priorityLevel, updatedBy, id],
        );
      }

      return {
        success: true,
        message: 'Priorities reordered successfully',
        data: null,
      };
    });
  }

  private async getActiveRows(connection: PoolConnection): Promise<KanbanPriorityRow[]> {
    const [rows] = await connection.query<KanbanPriorityRow[]>(
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
        FROM kanban_priorities
        WHERE is_active = 1
        ORDER BY priority_level ASC, id ASC
      `,
    );

    return rows;
  }

  private async resequence(connection: PoolConnection, updatedBy: string): Promise<void> {
    const rows = await this.getActiveRows(connection);

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const nextPriority = i + 1;
      if (Number(row.priority_level) === nextPriority) {
        continue;
      }

      await connection.execute<ResultSetHeader>(
        `
          UPDATE kanban_priorities
          SET priority_level = ?
            , updated_by = ?
            , updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          LIMIT 1
        `,
        [nextPriority, updatedBy, row.id],
      );
    }
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
