import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class LicenseRepository extends BaseRepository<RowDataPacket> {
  private readonly allowedColumns = new Set([
    'property',
    'address1',
    'address2',
    'city',
    'state',
    'zip_code',
    'country',
    'property_phone',
    'active',
    'notes',
    'license_required',
    'license_expired_date',
    'created_by',
    'created_date',
    'website',
    'documents_required',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_license_property', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }

  async findMapRows(): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT
        address1,
        address2,
        city,
        state,
        zip_code,
        CONCAT_WS(', ',
          NULLIF(address1, ''),
          NULLIF(address2, ''),
          NULLIF(city, ''),
          NULLIF(state, ''),
          NULLIF(zip_code, '')
        ) AS full_address,
        id
      FROM eyefidb.fs_license_property`,
    );
  }

  async getAll(selectedViewType?: string): Promise<RowDataPacket[]> {
    let sql = `SELECT
      a.*,
      CASE
        WHEN COALESCE(a.property, '') = ''
          OR COALESCE(a.address1, '') = ''
          OR COALESCE(a.city, '') = ''
          OR COALESCE(a.state, '') = ''
          OR COALESCE(a.zip_code, '') = ''
          THEN 'No'
        ELSE 'Yes'
      END AS address_complete
    FROM eyefidb.fs_license_property a`;

    if (selectedViewType === 'Active') {
      sql += ' WHERE a.active = 1';
    } else if (selectedViewType === 'Inactive') {
      sql += ' WHERE a.active = 0';
    }

    return this.rawQuery<RowDataPacket>(sql);
  }

  async searchLicense(text: string): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT a.*
      FROM eyefidb.fs_license_property a
      WHERE a.property LIKE ?
        AND a.active = 1`,
      [`%${text}%`],
    );
  }

  async getLicensedTechsByLicenseId(id: number): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT *
      FROM eyefidb.fs_licensed_techs
      WHERE fs_licensed_id = ?`,
      [id],
    );
  }
}
