import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class TripDetailRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

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
}
