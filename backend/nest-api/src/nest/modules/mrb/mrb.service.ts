import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { MysqlService } from '@/shared/database/mysql.service';
import { MrbRepository } from './mrb.repository';

interface QirRow extends RowDataPacket {
  id: number;
  failureType: string | null;
  componentType: string | null;
  type1: string | null;
  eyefiPartNumber: string | null;
  customerReportedDate: string | null;
  qtyAffected: number | null;
  purchaseOrder: string | null;
  disposition: string | null;
  comments: string | null;
  rma: string | null;
  active: number | null;
  lotNumber: string | null;
}

interface QadPartRow extends RowDataPacket {
  pt_part: string;
  pt_price: number | string | null;
  fulldesc: string | null;
}

@Injectable()
export class MrbService {
  constructor(
    private readonly repository: MrbRepository,
    @Inject(MysqlService) private readonly mysqlService: MysqlService,
    @Inject(QadOdbcService) private readonly qadOdbcService: QadOdbcService,
  ) {}

  async getList(query: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll?: boolean;
  }): Promise<RowDataPacket[]> {
    return this.repository.getList({
      selectedViewType: query.selectedViewType,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      isAll: Boolean(query.isAll),
    });
  }

  async getAll() {
    return this.repository.getAll();
  }

  async getById(id: number): Promise<RowDataPacket> {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_MRB_NOT_FOUND',
        message: `MRB request with id ${id} not found`,
      });
    }

    return row;
  }

  async find(filters: Record<string, string>) {
    return this.repository.find(filters);
  }

  async create(payload: Record<string, unknown>) {
    const insertId = await this.repository.create(payload);
    return { insertId };
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    await this.getById(id);
    const rowCount = await this.repository.updateById(id, payload);
    return { rowCount };
  }

  async deleteById(id: number) {
    await this.getById(id);
    const rowCount = await this.repository.deleteById(id);
    return { rowCount };
  }

  async getQirForMrb(id: number) {
    const qirSql = `
      SELECT *
      FROM eyefidb.qa_capaRequest
      WHERE id = ?
      LIMIT 1
    `;

    const rows = await this.mysqlService.query<QirRow[]>(qirSql, [id]);
    const row = rows[0];

    if (!row) {
      return { qirNumber: id, found: false };
    }

    const eyePartNumber = String(row.eyefiPartNumber || '');
    const normalizedPart = eyePartNumber.replace(/\//g, '').replace(/\s+/g, '');

    let qadPart: QadPartRow | null = null;

    if (normalizedPart) {
      const qadSql = `
        SELECT
          pt_part,
          b.sct_cst_tot AS pt_price,
          pt_desc1 || pt_desc2 AS fulldesc
        FROM pt_mstr a
        LEFT JOIN sct_det b ON a.pt_part = b.sct_part
          AND b.sct_sim = 'Standard'
          AND b.sct_domain = 'EYE'
          AND b.sct_site = 'EYE01'
        WHERE a.pt_part = ?
      `;

      const qadRows = await this.qadOdbcService.queryWithParams<QadPartRow[]>(qadSql, [normalizedPart]);
      qadPart = qadRows[0] || null;
    }

    return {
      failureType: row.failureType,
      qirNumber: id,
      componentType: row.componentType,
      type: row.type1,
      partNumber: row.eyefiPartNumber,
      partDescription: qadPart?.fulldesc || null,
      itemCost: qadPart?.pt_price || null,
      dateReported: row.customerReportedDate,
      qtyRejected: row.qtyAffected,
      wo_so: row.purchaseOrder,
      id: row.id,
      disposition: row.disposition || null,
      comments: row.comments || '',
      rma: row.rma || '',
      status: null,
      mrbFound: 'false',
      found: true,
      active: row.active,
      mrbNumber: '',
      lotNumber: row.lotNumber || '',
    };
  }
}
