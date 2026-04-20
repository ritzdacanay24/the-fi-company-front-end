import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { CrashKitRepository } from './crash-kit.repository';

interface PartSearchRow {
  pt_part: string;
  description: string;
  pt_status: string;
  qty_on_hand: number | string;
  total_available: number | string;
  sct_cst_tot: number | string;
}

@Injectable()
export class CrashKitService {
  constructor(
    private readonly repository: CrashKitRepository,
    private readonly qadOdbcService: QadOdbcService,
  ) {}

  async getById(id: number) {
    return this.repository.findOne({ id });
  }

  async getByWorkOrderId(workOrderId: number) {
    return this.repository.getByWorkOrderId(workOrderId);
  }

  async partSearch(partNumber?: string) {
    const term = (partNumber || '').trim();
    if (!term) {
      return [];
    }

    const sql = `
      SELECT a.pt_part,
             a.pt_desc1 || '-' || a.pt_desc2 AS description,
             a.pt_status,
             qty_on_hand,
             total_available,
             CAST(sct_cst_tot AS NUMERIC(36,2)) AS sct_cst_tot
      FROM pt_mstr a
      LEFT JOIN (
        SELECT SUM(CAST(in_qty_oh AS NUMERIC(36,2))) AS qty_on_hand,
               SUM(CAST(in_qty_all AS NUMERIC(36,2))) AS total_available,
               in_part
        FROM in_mstr
        GROUP BY in_part
      ) b ON b.in_part = a.pt_part
      LEFT JOIN (
        SELECT UPPER(sct_part) AS sct_part,
               MAX(sct_cst_tot) AS sct_cst_tot
        FROM sct_det
        WHERE sct_sim = 'Standard'
          AND sct_domain = 'EYE'
          AND sct_site = 'EYE01'
        GROUP BY UPPER(sct_part)
      ) sct ON sct.sct_part = a.pt_part
      WHERE (a.pt_part LIKE ? OR a.pt_desc1 || '-' || a.pt_desc2 LIKE ?)
        AND a.pt_domain = 'EYE'
    `;

    const search = `%${term}%`;
    return this.qadOdbcService.queryWithParams<PartSearchRow[]>(sql, [search, search]);
  }

  async create(payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const insertId = await this.repository.create(sanitized);
    return this.repository.findOne({ id: insertId });
  }

  async update(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`Crash kit item ${id} not found`);
    }

    return this.repository.findOne({ id });
  }

  async delete(id: number) {
    const affectedRows = await this.repository.deleteById(id);
    if (!affectedRows) {
      throw new NotFoundException(`Crash kit item ${id} not found`);
    }

    return { success: true };
  }
}
