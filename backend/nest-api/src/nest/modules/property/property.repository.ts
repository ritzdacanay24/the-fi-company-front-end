import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class PropertyRepository extends BaseRepository<RowDataPacket> {
  private readonly allowedColumns = new Set([
    'property',
    'address1',
    'address2',
    'city',
    'state',
    'zip_code',
    'country',
    'fs_customer_id',
    'property_phone',
    'active',
    'lat',
    'lon',
    'out_of_town',
    'license_notes',
    'license_required',
    'zone_code',
    'notes',
    'license_expired_date',
    'licensed_techs',
    'created_by',
    'created_date',
    'compliance_name',
    'compliance_address1',
    'compliance_address2',
    'compliance_city',
    'compliance_state',
    'compliance_zip_code',
    'compliance_website',
    'compliance_phone_numbers',
    'fs_licensed_id',
    'equipment_drop_off_location',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_property_det', mysqlService);
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
        id,
        lat,
        lon
      FROM eyefidb.fs_property_det
      WHERE lat IS NOT NULL AND lon IS NOT NULL`,
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
    FROM eyefidb.fs_property_det a`;

    if (selectedViewType === 'Active') {
      sql += ' WHERE a.active = 1';
    } else if (selectedViewType === 'Inactive') {
      sql += ' WHERE a.active = 0';
    }

    return this.rawQuery<RowDataPacket>(sql);
  }

  async getAllPropertyByText(text: string): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT
        a.*,
        b.fs_property_det_id,
        b.hits,
        CONCAT_WS(', ',
          NULLIF(TRIM(a.property), ''),
          NULLIF(TRIM(a.address1), ''),
          NULLIF(TRIM(a.city), ''),
          NULLIF(TRIM(a.state), ''),
          NULLIF(TRIM(a.zip_code), ''),
          NULLIF(TRIM(a.property_phone), '')
        ) AS full_address,
        CASE
          WHEN COALESCE(a.property, '') = ''
            OR COALESCE(a.address1, '') = ''
            OR COALESCE(a.city, '') = ''
            OR COALESCE(a.state, '') = ''
            OR COALESCE(a.zip_code, '') = ''
            THEN 'No'
          ELSE 'Yes'
        END AS address_complete
      FROM eyefidb.fs_property_det a
      LEFT JOIN (
        SELECT fs_property_det_id, COUNT(*) AS hits
        FROM eyefidb.fs_property_ref
        GROUP BY fs_property_det_id
      ) b
        ON b.fs_property_det_id = a.id
      WHERE CONCAT_WS(', ',
        NULLIF(TRIM(a.property), ''),
        NULLIF(TRIM(a.address1), ''),
        NULLIF(TRIM(a.city), ''),
        NULLIF(TRIM(a.state), ''),
        NULLIF(TRIM(a.zip_code), ''),
        NULLIF(TRIM(a.property_phone), '')
      ) LIKE ?
        AND (a.property IS NOT NULL AND a.property != '')
        AND a.active = 1`,
      [`%${text}%`],
    );
  }
}
