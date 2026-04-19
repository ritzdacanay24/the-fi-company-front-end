import { Inject, Injectable } from '@nestjs/common';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { AssignmentsFilterDto } from './dto';

const VIEW = 'eyefidb.vw_all_consumed_serials';
const TABLE = 'serial_assignments';
const AUDIT_TABLE = 'serial_assignment_audit';

@Injectable()
export class SerialAssignmentsRepository extends BaseRepository<RowDataPacket> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super(TABLE, mysqlService);
  }

  async findAll(filters: AssignmentsFilterDto): Promise<{
    data: RowDataPacket[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];

    if (filters.wo_number) {
      conditions.push('(v.wo_number LIKE ? OR v.po_number LIKE ?)');
      params.push(`%${filters.wo_number}%`, `%${filters.wo_number}%`);
    }
    if (filters.eyefi_serial_number) {
      conditions.push('v.eyefi_serial_number LIKE ?');
      params.push(`%${filters.eyefi_serial_number}%`);
    }
    if (filters.ul_number) {
      conditions.push('v.ul_number LIKE ?');
      params.push(`%${filters.ul_number}%`);
    }
    if (filters.consumed_by) {
      conditions.push('v.used_by LIKE ?');
      params.push(`%${filters.consumed_by}%`);
    }
    if (filters.date_from) {
      conditions.push('DATE(v.used_date) >= ?');
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      conditions.push('DATE(v.used_date) <= ?');
      params.push(filters.date_to);
    }
    if (filters.status) {
      conditions.push('v.status = ?');
      params.push(filters.status);
    }
    if (!filters.include_voided) {
      conditions.push('(v.is_voided = 0 OR v.is_voided IS NULL)');
    }

    const where = conditions.join(' AND ');
    const page = Math.max(1, Math.floor(filters.page ?? 1));
    const requestedLimit = filters.limit != null ? Math.floor(filters.limit) : undefined;
    const hasLimit = requestedLimit != null && requestedLimit > 0;
    const limit = hasLimit ? Math.min(500, Math.max(1, requestedLimit)) : undefined;
    const offset = hasLimit && limit != null ? (page - 1) * limit : 0;

    const data = await this.rawQuery<RowDataPacket>(
      `SELECT
         v.unique_id, v.source_table, v.source_type,
         v.source_id AS id,
         v.eyefi_serial_id, v.eyefi_serial_number,
         v.ul_label_id, v.ul_number, v.ul_category,
         v.wo_number, v.po_number, v.batch_id,
         v.used_date AS consumed_at, v.used_by AS consumed_by,
         v.status, v.created_at,
         v.is_voided, v.voided_by, v.voided_at, v.void_reason,
         v.part_number, v.wo_description,
         v.customer_part_number, v.customer_name
       FROM ${VIEW} v
       WHERE ${where}
       ORDER BY v.used_date DESC, v.unique_id DESC
       ${hasLimit && limit != null ? `LIMIT ${limit} OFFSET ${offset}` : ''}`,
      params,
    );

    const total = data.length;

    return {
      data,
      total,
      page: hasLimit ? page : 1,
      limit: hasLimit && limit != null ? limit : total,
      total_pages: hasLimit && limit != null ? Math.ceil(total / limit) : 1,
    };
  }

  async findById(id: number): Promise<RowDataPacket | null> {
    const rows = await this.rawQuery<RowDataPacket>(
      `SELECT
         sa.id, sa.eyefi_serial_id, sa.eyefi_serial_number,
         sa.ul_label_id, sa.ul_number,
         sa.wo_number, sa.po_number, sa.batch_id,
         sa.consumed_at AS used_date, sa.consumed_by AS used_by,
         sa.status, sa.created_at,
         sa.is_voided, sa.voided_by, sa.voided_at, sa.void_reason,
         sa.part_number, sa.wo_description,
         sa.wo_qty_ord AS qty_ord, sa.wo_due_date AS due_date,
         sa.wo_routing AS routing, sa.wo_line AS line,
         sa.cp_cust_part AS customer_part_number, sa.cp_cust AS customer_name,
         sa.inspector_name, sa.customer_type_id, sa.customer_asset_id,
         sa.generated_asset_number,
         sa.verification_status, sa.verification_photo, sa.verified_at, sa.verified_by,
         igt.serial_number AS igt_serial_number,
         ags.generated_SG_asset AS ags_serial_number,
         sg.generated_SG_asset AS sg_asset_number,
         ul.category AS ul_category
       FROM \`${TABLE}\` sa
       LEFT JOIN igt_serial_numbers igt ON sa.customer_type_id = 1 AND sa.customer_asset_id = igt.id
       LEFT JOIN agsSerialGenerator ags ON sa.customer_type_id = 3 AND sa.customer_asset_id = ags.id
       LEFT JOIN sgAssetGenerator sg ON sa.customer_type_id = 2 AND sa.customer_asset_id = sg.id
       LEFT JOIN ul_labels ul ON sa.ul_label_id = ul.id
       WHERE sa.id = ?
       LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async getStatistics(): Promise<RowDataPacket | null> {
    const rows = await this.rawQuery<RowDataPacket>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN status = 'consumed'  THEN 1 ELSE 0 END) AS consumed,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
         SUM(CASE WHEN status = 'returned'  THEN 1 ELSE 0 END) AS returned,
         SUM(CASE WHEN DATE(consumed_at) = CURDATE() THEN 1 ELSE 0 END) AS today,
         SUM(CASE WHEN YEARWEEK(consumed_at, 1) = YEARWEEK(CURDATE(), 1) THEN 1 ELSE 0 END) AS this_week,
         SUM(CASE WHEN is_voided = 1 THEN 1 ELSE 0 END) AS voided
       FROM \`${TABLE}\``,
    );
    return rows[0] ?? null;
  }

  async getAuditTrail(assignmentId?: number, limit = 100): Promise<RowDataPacket[]> {
    const cap = Math.min(1000, Math.max(1, Math.floor(limit)));
    if (assignmentId) {
      return this.rawQuery<RowDataPacket>(
        `SELECT id, assignment_id, action, reason, performed_by, performed_at
         FROM \`${AUDIT_TABLE}\`
         WHERE assignment_id = ?
         ORDER BY performed_at DESC`,
        [assignmentId],
      );
    }
    return this.rawQuery<RowDataPacket>(
      `SELECT id, assignment_id, action, reason, performed_by, performed_at
       FROM \`${AUDIT_TABLE}\`
       ORDER BY performed_at DESC
       LIMIT ${cap}`,
    );
  }

  async voidOne(
    id: number,
    reason: string,
    performedBy: string,
  ): Promise<{ freed_eyefi_serial: string | null; freed_ul_label: string | null }> {
    return this.mysqlService.withTransaction(async (conn: PoolConnection) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM \`${TABLE}\` WHERE id = ? LIMIT 1`,
        [id],
      );
      const assignment = rows[0];
      if (!assignment) throw new Error('Assignment not found');
      if (assignment['is_voided']) throw new Error('Assignment is already voided');

      await conn.execute(
        `UPDATE \`${TABLE}\`
         SET is_voided = 1, voided_by = ?, voided_at = NOW(), void_reason = ?, status = 'cancelled'
         WHERE id = ?`,
        [performedBy, reason, id],
      );

      await conn.execute(
        `UPDATE eyefi_serial_numbers SET status = 'available' WHERE id = ?`,
        [assignment['eyefi_serial_id']],
      );

      if (assignment['ul_label_id']) {
        await conn.execute(
          `UPDATE ul_labels SET status = 'available', is_consumed = 0 WHERE id = ?`,
          [assignment['ul_label_id']],
        );
      }

      await conn.execute(
        `INSERT INTO \`${AUDIT_TABLE}\` (assignment_id, action, reason, performed_by, performed_at)
         VALUES (?, 'voided', ?, ?, NOW())`,
        [id, reason, performedBy],
      );

      return {
        freed_eyefi_serial: (assignment['eyefi_serial_number'] as string) ?? null,
        freed_ul_label: (assignment['ul_number'] as string) ?? null,
      };
    });
  }

  async deleteOne(
    id: number,
    reason: string,
    performedBy: string,
  ): Promise<{ freed_serial: string | null }> {
    return this.mysqlService.withTransaction(async (conn: PoolConnection) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM \`${TABLE}\` WHERE id = ? LIMIT 1`,
        [id],
      );
      const assignment = rows[0];
      if (!assignment) throw new Error('Assignment not found');

      await conn.execute(
        `UPDATE eyefi_serial_numbers SET status = 'available' WHERE id = ?`,
        [assignment['eyefi_serial_id']],
      );

      await conn.execute(
        `INSERT INTO \`${AUDIT_TABLE}\` (assignment_id, action, reason, performed_by, performed_at)
         VALUES (?, 'deleted', ?, ?, NOW())`,
        [id, reason, performedBy],
      );

      await conn.execute(`DELETE FROM \`${TABLE}\` WHERE id = ?`, [id]);

      return { freed_serial: (assignment['eyefi_serial_number'] as string) ?? null };
    });
  }

  async restoreOne(id: number, performedBy: string): Promise<void> {
    await this.mysqlService.withTransaction(async (conn: PoolConnection) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM \`${TABLE}\` WHERE id = ? LIMIT 1`,
        [id],
      );
      const assignment = rows[0];
      if (!assignment) throw new Error('Assignment not found');
      if (!assignment['is_voided']) throw new Error('Assignment is not voided');

      await conn.execute(
        `UPDATE \`${TABLE}\`
         SET is_voided = 0, voided_by = NULL, voided_at = NULL, void_reason = NULL, status = 'consumed'
         WHERE id = ?`,
        [id],
      );

      await conn.execute(
        `UPDATE eyefi_serial_numbers SET status = 'consumed' WHERE id = ?`,
        [assignment['eyefi_serial_id']],
      );

      if (assignment['ul_label_id']) {
        await conn.execute(
          `UPDATE ul_labels SET status = 'consumed', is_consumed = 1 WHERE id = ?`,
          [assignment['ul_label_id']],
        );
      }

      await conn.execute(
        `INSERT INTO \`${AUDIT_TABLE}\` (assignment_id, action, reason, performed_by, performed_at)
         VALUES (?, 'restored', 'Assignment restored', ?, NOW())`,
        [id, performedBy],
      );
    });
  }

  async bulkVoid(
    ids: number[],
    reason: string,
    performedBy: string,
  ): Promise<{ voided: number; errors: { id: number; error: string }[] }> {
    let voided = 0;
    const errors: { id: number; error: string }[] = [];

    for (const id of ids) {
      try {
        await this.voidOne(id, reason, performedBy);
        voided++;
      } catch (err) {
        errors.push({ id, error: (err as Error).message });
      }
    }

    return { voided, errors };
  }

  async getDailyConsumptionTrend(): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT DATE(used_date) AS date, COUNT(*) AS count
       FROM ${VIEW}
       WHERE used_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(used_date)
       ORDER BY date ASC`,
    );
  }

  async getUserConsumptionActivity(): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT used_by, COUNT(*) AS count, MAX(used_date) AS last_activity
       FROM ${VIEW}
       WHERE used_by IS NOT NULL
       GROUP BY used_by
       ORDER BY count DESC`,
    );
  }

  async getWorkOrderSerials(workOrder?: string): Promise<RowDataPacket[]> {
    if (workOrder) {
      return this.rawQuery<RowDataPacket>(
        `SELECT *
         FROM ${VIEW}
         WHERE wo_number LIKE ? OR po_number LIKE ?
         ORDER BY used_date DESC`,
        [`%${workOrder}%`, `%${workOrder}%`],
      );
    }
    return this.rawQuery<RowDataPacket>(
      `SELECT wo_number, COUNT(*) AS serial_count, MAX(used_date) AS last_used
       FROM ${VIEW}
       WHERE wo_number IS NOT NULL
       GROUP BY wo_number
       ORDER BY last_used DESC
       LIMIT 100`,
    );
  }
}
