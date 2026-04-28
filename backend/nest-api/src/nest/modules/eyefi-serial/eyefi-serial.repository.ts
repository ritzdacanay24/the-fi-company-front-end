import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { EyeFiSerialRecord } from './dto/eyefi-serial.interface';
import { CreateEyeFiSerialDto } from './dto/create-eyefi-serial.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

const TABLE = 'eyefi_serial_numbers';

@Injectable()
export class EyeFiSerialRepository extends BaseRepository<EyeFiSerialRecord> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super(TABLE, mysqlService);
  }

  async search(params: {
    search?: string;
    status?: string;
    product_model?: string;
    batch_number?: string;
    date_from?: string;
    date_to?: string;
    sort?: string;
    order?: string;
    limit?: number;
    offset?: number;
  }): Promise<EyeFiSerialRecord[]> {
    let sql = `
      SELECT
        esn.*,
        COALESCE(ags.id, ul.id, sg.id) AS assigned_to_id,
        CASE
          WHEN ags.id IS NOT NULL THEN 'agsSerialGenerator'
          WHEN ul.id  IS NOT NULL THEN 'ul_label_usages'
          WHEN sg.id  IS NOT NULL THEN 'sgAssetGenerator'
          ELSE NULL
        END AS assigned_to_table
      FROM \`${TABLE}\` esn
      LEFT JOIN agsSerialGenerator ags ON esn.serial_number = ags.serialNumber
      LEFT JOIN ul_label_usages    ul  ON esn.serial_number = ul.eyefi_serial_number
      LEFT JOIN sgAssetGenerator   sg  ON esn.serial_number = sg.serialNumber
      WHERE 1=1
    `;
    const sqlParams: unknown[] = [];

    if (params.search?.trim()) {
      sql += ' AND (esn.serial_number LIKE ? OR esn.product_model LIKE ?)';
      const term = `%${params.search.trim()}%`;
      sqlParams.push(term, term);
    }

    if (params.status) {
      sql += ' AND esn.status = ?';
      sqlParams.push(params.status);
    }

    if (params.product_model) {
      sql += ' AND esn.product_model = ?';
      sqlParams.push(params.product_model);
    }

    if (params.batch_number) {
      sql += ' AND esn.batch_number LIKE ?';
      sqlParams.push(`%${params.batch_number}%`);
    }

    if (params.date_from) {
      sql += ' AND esn.created_at >= ?';
      sqlParams.push(`${params.date_from} 00:00:00`);
    }

    if (params.date_to) {
      sql += ' AND esn.created_at <= ?';
      sqlParams.push(`${params.date_to} 23:59:59`);
    }

    const sortMap: Record<string, string> = {
      serial_number: 'esn.serial_number',
      product_model: 'esn.product_model',
      status: 'esn.status',
      created_at: 'esn.created_at',
    };
    const sortCol = sortMap[params.sort ?? ''] ?? 'esn.serial_number';
    const sortDir = params.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    sql += ` ORDER BY ${sortCol} ${sortDir}`;

    if (params.limit != null) {
      sql += ` LIMIT ${Math.max(1, Math.floor(params.limit))}`;
      if (params.offset != null) {
        sql += ` OFFSET ${Math.max(0, Math.floor(params.offset))}`;
      }
    }

    return this.rawQuery<EyeFiSerialRecord>(sql, sqlParams);
  }

  async getBySerialNumber(serialNumber: string): Promise<EyeFiSerialRecord | null> {
    const rows = await this.rawQuery<EyeFiSerialRecord>(
      `SELECT * FROM \`${TABLE}\` WHERE serial_number = ? LIMIT 1`,
      [serialNumber],
    );
    return rows[0] || null;
  }

  async getById(id: number): Promise<EyeFiSerialRecord | null> {
    const rows = await this.rawQuery<EyeFiSerialRecord>(
      `SELECT * FROM \`${TABLE}\` WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }

  async updateStatus(
    serialNumber: string,
    newStatus: string,
    reason?: string,
  ): Promise<number> {
    const validStatuses = ['available', 'assigned', 'shipped', 'returned', 'defective'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    const setClauses: string[] = ['status = ?'];
    const values: unknown[] = [newStatus];

    if (newStatus === 'defective' && reason) {
      setClauses.push('defective_reason = ?');
      values.push(reason);
    }

    values.push(serialNumber);
    const sql = `UPDATE \`${TABLE}\` SET ${setClauses.join(', ')} WHERE serial_number = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, values);
    return result.affectedRows;
  }

  async getStatistics(): Promise<{
    overall: RowDataPacket | null;
    model_distribution: RowDataPacket[];
  }> {
    const modelDist = await this.rawQuery<RowDataPacket>(
      `SELECT
         product_model,
         COUNT(*) AS count,
         ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM \`${TABLE}\`), 2) AS percentage
       FROM \`${TABLE}\`
       GROUP BY product_model
       ORDER BY count DESC`,
    );

    return { overall: null, model_distribution: modelDist };
  }

  async bulkCreate(serials: CreateEyeFiSerialDto[]): Promise<{ inserted: number; duplicates: number }> {
    if (serials.length === 0) return { inserted: 0, duplicates: 0 };

    let inserted = 0;
    let duplicates = 0;

    await this.mysqlService.withTransaction(async (conn) => {
      for (const s of serials) {
        const sql = `
          INSERT IGNORE INTO \`${TABLE}\`
            (serial_number, product_model, status, hardware_version, firmware_version,
             manufacture_date, batch_number, qr_code, notes, category, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await conn.execute<ResultSetHeader>(sql, [
          s.serial_number,
          s.product_model ?? 'EyeFi Pro X1',
          s.status ?? 'available',
          s.hardware_version ?? null,
          s.firmware_version ?? null,
          s.manufacture_date ?? null,
          s.batch_number ?? null,
          s.qr_code ?? null,
          s.notes ?? null,
          s.category ?? null,
          s.created_by ?? 'api',
        ]);
        if (result[0].affectedRows > 0) inserted++;
        else duplicates++;
      }
    });

    return { inserted, duplicates };
  }

  async getProductModels(): Promise<string[]> {
    const rows = await this.rawQuery<RowDataPacket>(
      `SELECT DISTINCT product_model FROM \`${TABLE}\` WHERE product_model IS NOT NULL ORDER BY product_model ASC`,
    );
    return rows.map((r) => r['product_model'] as string);
  }

  async getExportData(serialNumbers?: string[]): Promise<EyeFiSerialRecord[]> {
    if (serialNumbers?.length) {
      const placeholders = serialNumbers.map(() => '?').join(',');
      return this.rawQuery<EyeFiSerialRecord>(
        `SELECT * FROM \`${TABLE}\` WHERE serial_number IN (${placeholders}) ORDER BY serial_number ASC`,
        serialNumbers,
      );
    }
    return this.rawQuery<EyeFiSerialRecord>(
      `SELECT * FROM \`${TABLE}\` ORDER BY serial_number ASC`,
    );
  }

  // ── Assignment methods ─────────────────────────────────────────────────────

  async createAssignment(dto: CreateAssignmentDto): Promise<number> {
    const sql = `
      INSERT INTO eyefi_serial_assignments
        (serial_number, customer_name, customer_po, work_order_number, wo_part,
         wo_qty_ord, wo_due_date, wo_description, assigned_date, assigned_by_name,
         shipped_date, tracking_number, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [
      dto.serial_number,
      dto.customer_name,
      dto.customer_po ?? null,
      dto.work_order_number ?? null,
      dto.wo_part ?? null,
      dto.wo_qty_ord ?? null,
      dto.wo_due_date ?? null,
      dto.wo_description ?? null,
      dto.assigned_date,
      dto.assigned_by_name,
      dto.shipped_date ?? null,
      dto.tracking_number ?? null,
      dto.notes ?? null,
      'api',
    ]);
    return result.insertId;
  }

  async getAssignments(filters: {
    serial_number?: string;
    customer_name?: string;
    work_order_number?: string;
    limit?: number;
  }): Promise<RowDataPacket[]> {
    let sql = 'SELECT * FROM eyefi_serial_assignments WHERE is_active = 1';
    const params: unknown[] = [];

    if (filters.serial_number) {
      sql += ' AND serial_number = ?';
      params.push(filters.serial_number);
    }
    if (filters.customer_name) {
      sql += ' AND customer_name LIKE ?';
      params.push(`%${filters.customer_name}%`);
    }
    if (filters.work_order_number) {
      sql += ' AND work_order_number = ?';
      params.push(filters.work_order_number);
    }

    sql += ' ORDER BY assigned_date DESC, created_at DESC';

    if (filters.limit) {
      sql += ` LIMIT ${Math.max(1, Math.floor(filters.limit))}`;
    }

    return this.rawQuery<RowDataPacket>(sql, params);
  }

  async getAssignmentById(id: number): Promise<RowDataPacket | null> {
    const rows = await this.rawQuery<RowDataPacket>(
      'SELECT * FROM eyefi_serial_assignments WHERE id = ? LIMIT 1',
      [id],
    );
    return rows[0] ?? null;
  }

  async getActiveUserEmailById(userId: number): Promise<string | null> {
    const rows = await this.rawQuery<RowDataPacket>(
      `
        SELECT email
        FROM db.users
        WHERE id = ?
          AND active = 1
          AND COALESCE(TRIM(email), '') <> ''
        LIMIT 1
      `,
      [userId],
    );

    const email = String(rows[0]?.email || '').trim();
    return email || null;
  }

  async updateAssignment(id: number, dto: UpdateAssignmentDto): Promise<number> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.customer_name !== undefined) { fields.push('customer_name = ?'); values.push(dto.customer_name); }
    if (dto.customer_po !== undefined) { fields.push('customer_po = ?'); values.push(dto.customer_po); }
    if (dto.work_order_number !== undefined) { fields.push('work_order_number = ?'); values.push(dto.work_order_number); }
    if (dto.wo_part !== undefined) { fields.push('wo_part = ?'); values.push(dto.wo_part); }
    if (dto.wo_qty_ord !== undefined) { fields.push('wo_qty_ord = ?'); values.push(dto.wo_qty_ord); }
    if (dto.wo_due_date !== undefined) { fields.push('wo_due_date = ?'); values.push(dto.wo_due_date); }
    if (dto.wo_description !== undefined) { fields.push('wo_description = ?'); values.push(dto.wo_description); }
    if (dto.assigned_date !== undefined) { fields.push('assigned_date = ?'); values.push(dto.assigned_date); }
    if (dto.assigned_by_name !== undefined) { fields.push('assigned_by_name = ?'); values.push(dto.assigned_by_name); }
    if (dto.shipped_date !== undefined) { fields.push('shipped_date = ?'); values.push(dto.shipped_date); }
    if (dto.tracking_number !== undefined) { fields.push('tracking_number = ?'); values.push(dto.tracking_number); }
    if (dto.notes !== undefined) { fields.push('notes = ?'); values.push(dto.notes); }

    if (fields.length === 0) return 0;

    values.push(id);
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `UPDATE eyefi_serial_assignments SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    return result.affectedRows;
  }
}
