import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { CreateIgtSerialDto } from './dto/create-igt-serial.dto';
import { UpdateIgtSerialDto } from './dto/update-igt-serial.dto';

const TABLE = 'igt_serial_numbers';

@Injectable()
export class IgtSerialNumbersRepository extends BaseRepository<RowDataPacket> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super(TABLE, mysqlService);
  }

  async findAll(params: {
    search?: string;
    status?: string;
    category?: string;
    includeInactive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<RowDataPacket[]> {
    let sql = `SELECT * FROM \`${TABLE}\` WHERE 1=1`;
    const sqlParams: unknown[] = [];

    if (!params.includeInactive) {
      sql += ' AND is_active = 1';
    }

    if (params.search?.trim()) {
      sql += ' AND (serial_number LIKE ? OR manufacturer LIKE ? OR model LIKE ?)';
      const term = `%${params.search.trim()}%`;
      sqlParams.push(term, term, term);
    }

    if (params.status) {
      sql += ' AND status = ?';
      sqlParams.push(params.status);
    }

    if (params.category) {
      sql += ' AND category = ?';
      sqlParams.push(params.category);
    }

    sql += ' ORDER BY created_at DESC';

    if (params.limit) {
      const limit = Math.max(1, Math.floor(params.limit));
      const offset = Math.max(0, Math.floor(params.offset ?? 0));
      sql += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    return this.rawQuery<RowDataPacket>(sql, sqlParams);
  }

  async findById(id: number): Promise<RowDataPacket | null> {
    const rows = await this.rawQuery<RowDataPacket>(
      `SELECT * FROM \`${TABLE}\` WHERE id = ?`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findBySerialNumber(serialNumber: string): Promise<RowDataPacket | null> {
    const rows = await this.rawQuery<RowDataPacket>(
      `SELECT * FROM \`${TABLE}\` WHERE serial_number = ?`,
      [serialNumber],
    );
    return rows[0] ?? null;
  }

  async insertOne(dto: CreateIgtSerialDto): Promise<ResultSetHeader> {
    return this.mysqlService.execute<ResultSetHeader>(
      `INSERT INTO \`${TABLE}\`
        (serial_number, category, status, manufacturer, model, notes, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dto.serial_number,
        dto.category ?? 'gaming',
        dto.status ?? 'available',
        dto.manufacturer ?? null,
        dto.model ?? null,
        dto.notes ?? null,
        dto.is_active ?? 1,
        dto.created_by ?? null,
      ],
    );
  }

  async bulkCreate(
    serials: CreateIgtSerialDto[],
    duplicateStrategy: 'skip' | 'replace' | 'error' = 'skip',
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const s of serials) {
      try {
        const existing = await this.findBySerialNumber(s.serial_number);

        if (existing) {
          if (duplicateStrategy === 'skip') continue;
          if (duplicateStrategy === 'error') {
            errors.push(`Duplicate: ${s.serial_number}`);
            continue;
          }
          // replace
          await this.update(existing['id'] as number, s as UpdateIgtSerialDto);
          updated++;
        } else {
          await this.insertOne(s);
          created++;
        }
      } catch (err: any) {
        errors.push(`${s.serial_number}: ${err?.message ?? 'unknown error'}`);
      }
    }

    return { created, updated, errors };
  }

  async update(id: number, dto: UpdateIgtSerialDto): Promise<ResultSetHeader> {
    const fields: string[] = [];
    const vals: unknown[] = [];

    if (dto.serial_number !== undefined) { fields.push('serial_number = ?'); vals.push(dto.serial_number); }
    if (dto.category !== undefined) { fields.push('category = ?'); vals.push(dto.category); }
    if (dto.status !== undefined) { fields.push('status = ?'); vals.push(dto.status); }
    if (dto.manufacturer !== undefined) { fields.push('manufacturer = ?'); vals.push(dto.manufacturer); }
    if (dto.model !== undefined) { fields.push('model = ?'); vals.push(dto.model); }
    if (dto.notes !== undefined) { fields.push('notes = ?'); vals.push(dto.notes); }
    if (dto.is_active !== undefined) { fields.push('is_active = ?'); vals.push(dto.is_active); }
    if (dto.updated_by !== undefined) { fields.push('updated_by = ?'); vals.push(dto.updated_by); }
    if (dto.used_at !== undefined) { fields.push('used_at = ?'); vals.push(dto.used_at); }
    if (dto.used_by !== undefined) { fields.push('used_by = ?'); vals.push(dto.used_by); }
    if (dto.used_in_asset_id !== undefined) { fields.push('used_in_asset_id = ?'); vals.push(dto.used_in_asset_id); }
    if (dto.used_in_asset_number !== undefined) { fields.push('used_in_asset_number = ?'); vals.push(dto.used_in_asset_number); }

    if (!fields.length) return {} as ResultSetHeader;

    vals.push(id);
    return this.mysqlService.execute<ResultSetHeader>(
      `UPDATE \`${TABLE}\` SET ${fields.join(', ')} WHERE id = ?`,
      vals,
    );
  }

  async softDelete(id: number): Promise<ResultSetHeader> {
    return this.mysqlService.execute<ResultSetHeader>(
      `UPDATE \`${TABLE}\` SET is_active = 0 WHERE id = ?`,
      [id],
    );
  }

  async hardDelete(id: number): Promise<ResultSetHeader> {
    return this.mysqlService.execute<ResultSetHeader>(
      `DELETE FROM \`${TABLE}\` WHERE id = ?`,
      [id],
    );
  }

  async bulkSoftDelete(ids: number[]): Promise<ResultSetHeader> {
    const placeholders = ids.map(() => '?').join(',');
    return this.mysqlService.execute<ResultSetHeader>(
      `UPDATE \`${TABLE}\` SET is_active = 0 WHERE id IN (${placeholders})`,
      ids,
    );
  }

  async bulkHardDelete(ids: number[]): Promise<ResultSetHeader> {
    const placeholders = ids.map(() => '?').join(',');
    return this.mysqlService.execute<ResultSetHeader>(
      `DELETE FROM \`${TABLE}\` WHERE id IN (${placeholders})`,
      ids,
    );
  }

  async getStats(): Promise<RowDataPacket> {
    const rows = await this.rawQuery<RowDataPacket>(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'available' AND is_active = 1 THEN 1 ELSE 0 END) AS available,
        SUM(CASE WHEN status = 'reserved' AND is_active = 1 THEN 1 ELSE 0 END) AS reserved,
        SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS used,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive
       FROM \`${TABLE}\``,
    );
    return rows[0];
  }

  async getAvailable(category = 'gaming', limit = 5000): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT * FROM \`${TABLE}\`
       WHERE status = 'available' AND is_active = 1 AND category = ?
       ORDER BY created_at ASC
       LIMIT ${Math.max(1, Math.floor(limit))}`,
      [category],
    );
  }

  async setStatus(serialNumber: string, status: string): Promise<ResultSetHeader> {
    return this.mysqlService.execute<ResultSetHeader>(
      `UPDATE \`${TABLE}\` SET status = ? WHERE serial_number = ?`,
      [status, serialNumber],
    );
  }

  async checkExisting(serialNumbers: string[]): Promise<string[]> {
    const placeholders = serialNumbers.map(() => '?').join(',');
    const rows = await this.rawQuery<RowDataPacket>(
      `SELECT serial_number FROM \`${TABLE}\` WHERE serial_number IN (${placeholders})`,
      serialNumbers,
    );
    return rows.map((r) => r['serial_number'] as string);
  }

}
