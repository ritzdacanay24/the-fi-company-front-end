import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class TripDetailRepository extends BaseRepository<RowDataPacket> {
  private readonly allowedColumns = new Set([
    'fsId',
    'fs_travel_header_id',
    'type_of_travel',
    'address_name',
    'address',
    'address1',
    'city',
    'state',
    'zip_code',
    'start_datetime_name',
    'end_datetime_name',
    'start_datetime',
    'end_datetime',
    'confirmation',
    'location_name',
    'flight_out',
    'flight_in',
    'rental_car_driver',
    'notes',
    'flight_number',
    'email_sent',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_travel_det', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }

  async getAll(): Promise<RowDataPacket[]> {
    return this.find();
  }

  async getById(id: number): Promise<RowDataPacket | null> {
    return this.findOne({ id });
  }

  async update(id: number, payload: Record<string, unknown>): Promise<number> {
    return this.updateById(id, payload);
  }

  async delete(id: number): Promise<number> {
    return this.deleteById(id);
  }

  async findByFsId(id: number): Promise<RowDataPacket[]> {
    const idAsString = String(id);

    // Primary lookup: same as legacy (fsId equality).
    let headerRows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT fs_travel_header_id FROM eyefidb.fs_travel_det WHERE fsId = ?`,
      [idAsString],
    );

    // Fallback for inconsistent data typing/formatting in fsId values.
    if (!headerRows.length) {
      headerRows = await this.mysqlService.query<RowDataPacket[]>(
        `SELECT fs_travel_header_id
         FROM eyefidb.fs_travel_det
         WHERE TRIM(CAST(fsId AS CHAR)) = ?
            OR FIND_IN_SET(?, TRIM(CAST(fsId AS CHAR))) > 0
         LIMIT 1`,
        [idAsString, idAsString],
      );
    }

    const headerId = headerRows[0]?.fs_travel_header_id as number | undefined;
    if (!headerId) {
      return [];
    }

    return this.mysqlService.query<RowDataPacket[]>(
      `SELECT * FROM eyefidb.fs_travel_det WHERE fs_travel_header_id = ?`,
      [headerId],
    );
  }

  async findByGroupFsId(id: number): Promise<RowDataPacket[]> {
    const details = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT * FROM eyefidb.fs_travel_det WHERE fs_travel_header_id = ?`,
      [id],
    );

    const attachments = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT *, CONCAT('https://dashboard.eye-fi.com/attachments/fieldService/', fileName) AS url
       FROM eyefidb.attachments
       WHERE uniqueId = ?
         AND FIELD = 'Field Service Trip Details'`,
      [id],
    );

    return details.map((detail) => ({
      ...detail,
      attachments: attachments.filter((att) => Number(att.mainId) === Number(detail.id)),
    })) as RowDataPacket[];
  }

  async getEmailJobs(fsId: number): Promise<RowDataPacket[]> {
    return this.mysqlService.query<RowDataPacket[]>(
      `SELECT b.customer,
              b.request_date,
              b.start_time,
              b.address1 AS job_address_1,
              b.address2 AS job_address_2,
              b.city AS job_city,
              b.state AS job_state,
              b.zip_code AS job_zip_code,
              b.sign_theme,
              b.service_type,
              b.id AS fsId,
              b.property
       FROM eyefidb.fs_travel_det a
       LEFT JOIN eyefidb.fs_scheduler b ON b.id = a.fsId
       WHERE a.fs_travel_header_id = ?
       GROUP BY b.customer,
                b.request_date,
                b.start_time,
                b.address1,
                b.address2,
                b.city,
                b.state,
                b.zip_code,
                b.sign_theme,
                b.service_type,
                b.id,
                b.property`,
      [fsId],
    );
  }

  async getEmailTripDetails(fsId: number): Promise<RowDataPacket[]> {
    return this.mysqlService.query<RowDataPacket[]>(
      `SELECT a.*,
              b.customer,
              b.request_date,
              b.start_time,
              b.address1 AS job_address_1,
              b.address2 AS job_address_2,
              b.city AS job_city,
              b.state AS job_state,
              b.zip_code AS job_zip_code,
              b.sign_theme,
              b.service_type,
              DATE_FORMAT(a.start_datetime,'%m/%d/%Y %H:%i') AS start_datetime,
              DATE_FORMAT(a.end_datetime,'%m/%d/%Y %H:%i') AS end_datetime
       FROM eyefidb.fs_travel_det a
       LEFT JOIN eyefidb.fs_scheduler b ON b.id = a.fsId
       WHERE a.fs_travel_header_id = ?
       ORDER BY DATE_FORMAT(a.start_datetime,'%m/%d/%Y %H:%i') ASC`,
      [fsId],
    );
  }

  async getEmailRecipients(fsId: number): Promise<RowDataPacket | null> {
    const results = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT GROUP_CONCAT(DISTINCT resolved.email) AS emails,
              GROUP_CONCAT(DISTINCT resolved.name) AS names
       FROM eyefidb.fs_team a
       LEFT JOIN (
         SELECT
           t.id,
           COALESCE(uById.email, uByName.email) AS email,
           COALESCE(
             NULLIF(TRIM(CONCAT(COALESCE(uById.first, ''), ' ', COALESCE(uById.last, ''))), ''),
             NULLIF(TRIM(CONCAT(COALESCE(uByName.first, ''), ' ', COALESCE(uByName.last, ''))), ''),
             NULLIF(TRIM(t.user), '')
           ) AS name
         FROM eyefidb.fs_team t
         LEFT JOIN db.users uById ON uById.id = t.user_id
         LEFT JOIN db.users uByName
           ON t.user_id IS NULL
          AND LOWER(TRIM(CONCAT(COALESCE(uByName.first, ''), ' ', COALESCE(uByName.last, '')))) = LOWER(TRIM(t.user))
       ) resolved ON resolved.id = a.id
       WHERE a.fs_det_id IN (
         SELECT DISTINCT fsId
         FROM eyefidb.fs_travel_det
         WHERE fs_travel_header_id = ?
       )
         AND resolved.email IS NOT NULL
         AND resolved.email <> ''`,
      [fsId],
    );

    return results[0] ?? null;
  }

  async markEmailSent(fsId: number): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `UPDATE eyefidb.fs_travel_det
       SET email_sent = NOW()
       WHERE fs_travel_header_id = ?`,
      [fsId],
    );

    return Number(result.affectedRows || 0);
  }
}
