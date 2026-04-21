import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { BaseRepository } from '@/shared/repositories';

@Injectable()
export class PlacardRepository extends BaseRepository<RowDataPacket> {
  private static readonly ALLOWED_COLUMNS = [
    'id',
    'order_number',
    'part_number',
    'line_number',
    'customer_name',
    'eyefi_wo_number',
    'po_number',
    'eyefi_so_number',
    'customer_co_por_so',
    'description',
    'eyefi_part_number',
    'customer_part_number',
    'location',
    'customer_serial_tag',
    'eyefi_serial_tag',
    'qty',
    'label_count',
    'total_label_count',
    'created_date',
    'created_by',
    'active',
    'uom',
  ] as const;

  constructor(
    @Inject(MysqlService) mysqlService: MysqlService,
    @Inject(QadOdbcService) private readonly qadOdbcService: QadOdbcService,
  ) {
    super('placard', mysqlService);
  }

  async getList(params: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll: boolean;
  }): Promise<RowDataPacket[]> {
    const queryParams: unknown[] = [];

    let sql = 'SELECT * FROM placard a WHERE 1 = 1';

    if (!params.isAll && params.dateFrom && params.dateTo) {
      sql += ' AND DATE(a.created_date) BETWEEN ? AND ?';
      queryParams.push(params.dateFrom, params.dateTo);
    }

    if (params.selectedViewType === 'Active') {
      sql += ' AND a.active = 1';
    } else if (params.selectedViewType === 'Inactive') {
      sql += ' AND a.active = 0';
    }

    sql += ' ORDER BY a.created_date DESC';

    return this.rawQuery<RowDataPacket>(sql, queryParams);
  }

  async find(filters: Record<string, unknown>): Promise<RowDataPacket[]> {
    const safeFilters = Object.fromEntries(
      Object.entries(filters).filter(([key]) =>
        (PlacardRepository.ALLOWED_COLUMNS as readonly string[]).includes(key),
      ),
    );
    return super.find(safeFilters);
  }

  async getAll(): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>('SELECT * FROM placard');
  }

  async getById(id: number): Promise<RowDataPacket | null> {
    return super.findOne({ id });
  }

  async create(payload: Record<string, unknown>): Promise<number> {
    const safePayload = this.getSafePayload(payload);
    return super.create(safePayload);
  }

  async updateById(id: number, payload: Record<string, unknown>): Promise<number> {
    const safePayload = this.getSafePayload(payload);
    if (Object.keys(safePayload).length === 0) {
      return 0;
    }
    return super.updateById(id, safePayload);
  }

  async deleteById(id: number): Promise<number> {
    return super.deleteById(id);
  }

  async getPlacardBySoSearch(
    order: string,
    partNumber: string,
    line: string,
  ): Promise<Record<string, unknown> | null> {
    const sql = `
      SELECT a.sod_part AS SOD_PART,
        a.sod_nbr AS SOD_NBR,
        b.so_po AS SO_PO,
        CONCAT(c.pt_desc1, c.pt_desc2) AS FULLDESC,
        d.cp_cust_part AS SOD_CUSTPART,
        a.sod_line AS SOD_LINE,
        b.so_cust AS SO_CUST,
        b.so_ship AS LOCATION,
        REPLACE(f.cmt_cmmt, ';', ' ') AS MISC
      FROM sod_det a
      LEFT JOIN (
        SELECT cmt_cmmt, cmt_indx
        FROM cmt_det
        WHERE cmt_domain = 'EYE'
      ) f ON f.cmt_indx = a.sod_cmtindx
      JOIN (
        SELECT so_cust, so_nbr, so_po, so_ship
        FROM so_mstr
        WHERE so_domain = 'EYE'
      ) b ON b.so_nbr = a.sod_nbr
      LEFT JOIN (
        SELECT pt_part, MAX(pt_desc1) AS pt_desc1, MAX(pt_desc2) AS pt_desc2
        FROM pt_mstr
        WHERE pt_domain = 'EYE'
        GROUP BY pt_part
      ) c ON c.pt_part = a.sod_part
      LEFT JOIN (
        SELECT cp_cust_part, cp_part
        FROM cp_mstr
        WHERE cp_domain = 'EYE'
      ) d ON d.cp_part = a.sod_part
      WHERE a.sod_nbr = ?
        AND a.sod_part = ?
        AND a.sod_line = ?
        AND a.sod_domain = 'EYE'
    `;

    const rows = await this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(
      sql,
      [order, partNumber, line],
      { keyCase: 'upper' },
    );

    return rows[0] ?? null;
  }

  async searchSerialNumber(serialNumber: string): Promise<RowDataPacket | null> {
    const sql = `
      SELECT generated_SG_asset AS customerSerial,
        serialNumber,
        'AGS' AS customer
      FROM eyefidb.agsSerialGenerator
      WHERE generated_SG_asset = ?
        AND active = 1
      UNION ALL
      SELECT generated_SG_asset AS customerSerial,
        serialNumber,
        'SG' AS customer
      FROM eyefidb.sgAssetGenerator
      WHERE generated_SG_asset = ?
        AND active = 1
      LIMIT 1
    `;

    const rows = await this.rawQuery<RowDataPacket>(sql, [serialNumber, serialNumber]);
    return rows[0] ?? null;
  }

  async validateWo(woNumber: string): Promise<Record<string, unknown> | null> {
    const sql = `
      SELECT a.wo_nbr,
        a.wo_part,
        b.fullDesc AS wo_desc
      FROM wo_mstr a
      LEFT JOIN (
        SELECT a.sod_part,
          MAX(CONCAT(c.pt_desc1, c.pt_desc2)) AS fullDesc
        FROM sod_det a
        LEFT JOIN (
          SELECT pt_part,
            MAX(pt_desc1) AS pt_desc1,
            MAX(pt_desc2) AS pt_desc2
          FROM pt_mstr
          WHERE pt_domain = 'EYE'
          GROUP BY pt_part
        ) c ON c.pt_part = a.sod_part
        GROUP BY a.sod_part
      ) b ON b.sod_part = a.wo_part
      WHERE a.wo_domain = 'EYE'
        AND a.wo_nbr = ?
    `;

    const rows = await this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, [woNumber]);
    return rows[0] ?? null;
  }

  private getSafePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) =>
          (PlacardRepository.ALLOWED_COLUMNS as readonly string[]).includes(key) && key !== 'id',
      ),
    );
  }
}
