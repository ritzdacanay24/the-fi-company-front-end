import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ResultSetHeader } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { LicenseRepository } from './license.repository';

@Injectable()
export class LicenseService {
  constructor(
    private readonly repository: LicenseRepository,
    private readonly mysqlService: MysqlService,
  ) {}

  private toArrayOrNull(value: unknown): string[] | null {
    if (typeof value !== 'string' || value.trim() === '') {
      return null;
    }
    return value.split(',').map((item) => item.trim()).filter((item) => item.length > 0);
  }

  private prepareDataPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const normalized = { ...payload };

    if (Array.isArray(normalized['property_phone'])) {
      normalized['property_phone'] = (normalized['property_phone'] as unknown[]).join(',');
    }

    return normalized;
  }

  async find() {
    return this.repository.findMapRows();
  }

  async getAll(selectedViewType?: string) {
    return this.repository.getAll(selectedViewType);
  }

  async searchLicense(text: string) {
    return this.repository.searchLicense(text ?? '');
  }

  async getById(id: number) {
    const row = await this.repository.findOne({ id });
    if (!row) {
      return null;
    }

    const record = row as unknown as Record<string, unknown>;
    return {
      ...record,
      property_phone: this.toArrayOrNull(record['property_phone']),
    };
  }

  async getByIdAndTechs(id: number) {
    const details = await this.getById(id);
    const licensedTechs = await this.repository.getLicensedTechsByLicenseId(id);

    return {
      results: details,
      licensed_techs: licensedTechs,
    };
  }

  async create(payload: Record<string, unknown>) {
    const dataPayload = (payload['data'] as Record<string, unknown>) ?? payload;
    const prepared = this.prepareDataPayload(dataPayload);
    const sanitized = this.repository.sanitizePayload(prepared);

    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const techs = Array.isArray(payload['techs']) ? (payload['techs'] as Array<Record<string, unknown>>) : [];

    const insertId = await this.mysqlService.withTransaction(async (connection) => {
      const keys = Object.keys(sanitized);
      const values = Object.values(sanitized);
      const placeholders = keys.map(() => '?').join(', ');
      const sql = `INSERT INTO eyefidb.fs_license_property (${keys.join(', ')}) VALUES (${placeholders})`;
      const [insertResult] = await connection.execute<ResultSetHeader>(sql, values as any[]);
      const createdId = insertResult.insertId;

      if (techs.length > 0) {
        for (const tech of techs) {
          const row = {
            ...tech,
            fs_licensed_id: createdId,
          } as Record<string, unknown>;

          const rowKeys = Object.keys(row);
          const rowValues = Object.values(row);
          const rowPlaceholders = rowKeys.map(() => '?').join(', ');
          const rowSql = `INSERT INTO eyefidb.fs_licensed_techs (${rowKeys.join(', ')}) VALUES (${rowPlaceholders})`;
          await connection.execute<ResultSetHeader>(rowSql, rowValues as any[]);
        }
      }

      return createdId;
    });

    return { insertId };
  }

  async update(id: number, payload: Record<string, unknown>) {
    const prepared = this.prepareDataPayload(payload);
    const sanitized = this.repository.sanitizePayload(prepared);

    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`License ${id} not found`);
    }

    return { success: true };
  }

  async delete(id: number) {
    const affectedRows = await this.repository.deleteById(id);
    if (!affectedRows) {
      throw new NotFoundException(`License ${id} not found`);
    }

    return { success: true };
  }
}
