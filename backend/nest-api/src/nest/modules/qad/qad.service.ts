import { Inject, Injectable } from '@nestjs/common';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';

interface SalesOrderSearchRow {
  sod_part: string;
  sod_line: string | number;
  sod_nbr: string;
  sod_nbr_line: string;
}

interface PartSearchRow {
  pt_part: string;
  description: string;
  pt_status: string;
  qty_on_hand: number | string;
  total_available: number | string;
  sct_cst_tot: number | string;
}

interface WoSearchRow {
  wo_nbr: string;
  wo_due_date: string;
  wo_part: string;
  wo_qty_ord: number | string;
  wo_routing: string;
  wo_line: string | number;
  description: string;
}

interface CustomerPartSearchRow {
  cp_cust_part: string;
  description: string;
  pt_status: string;
  cp_cust: string;
}

interface CustomerNameRow {
  cm_addr: string;
  cm_sort: string;
  cm_active: number | string;
}

@Injectable()
export class QadService {
  constructor(
    @Inject(QadOdbcService)
    private readonly qadOdbcService: QadOdbcService,
  ) {}

  async searchSalesOrder(text?: string): Promise<SalesOrderSearchRow[]> {
    const term = (text || '').trim();

    if (!term) {
      return [];
    }

    const sql = `
      SELECT sod_part,
             sod_line,
             sod_nbr,
             sod_nbr || '-' || CAST(sod_line AS CHAR(25)) AS sod_nbr_line
      FROM sod_det
      WHERE (
        sod_nbr LIKE ?
        OR sod_nbr || '-' || CAST(sod_line AS CHAR(25)) LIKE ?
      )
        AND sod_domain = 'EYE'

    `;

    const search = `%${term}%`;
    
    return this.qadOdbcService.queryWithParams<SalesOrderSearchRow[]>(sql, [
      search,
      search,
    ]);
  }

  async searchPartNumber(text?: string, matchCase = false): Promise<PartSearchRow[]> {
    const term = (text || '').trim();
    if (!term) {
      return [];
    }

    let sql = `
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
    `;

    let params: readonly (string | number)[];
    if (matchCase) {
      sql += ' WHERE a.pt_part = ?';
      params = [term];
    } else {
      sql += ' WHERE a.pt_part LIKE ? OR a.pt_desc1 || \'-\' || a.pt_desc2 LIKE ?';
      const search = `%${term}%`;
      params = [search, search];
    }

    sql += " AND a.pt_domain = 'EYE'";
    return this.qadOdbcService.queryWithParams<PartSearchRow[]>(sql, params);
  }

  async searchWoNumber(text?: string): Promise<WoSearchRow[]> {
    const term = (text || '').trim();
    if (!term) {
      return [];
    }

    const sql = `
      SELECT wo_nbr,
             wo_due_date,
             wo_part,
             wo_qty_ord,
             wo_routing,
             wo_line,
             pt_desc1 || ' ' || pt_desc2 AS description
      FROM wo_mstr
      LEFT JOIN pt_mstr b ON b.pt_part = wo_part
      WHERE (wo_part LIKE ? OR wo_nbr LIKE ?)
        AND wo_domain = 'EYE'
      ORDER BY wo_due_date DESC
    `;

    const search = `%${term}%`;
    return this.qadOdbcService.queryWithParams<WoSearchRow[]>(sql, [search, search]);
  }

  async searchCustomerPartNumber(text?: string): Promise<CustomerPartSearchRow[]> {
    const term = (text || '').trim();
    if (!term) {
      return [];
    }

    const sql = `
      SELECT a.cp_cust_part,
             b.pt_desc1 || '-' || b.pt_desc2 AS description,
             b.pt_status,
             cp_cust
      FROM cp_mstr a
      LEFT JOIN pt_mstr b ON b.pt_part = a.cp_part
      WHERE a.cp_cust_part LIKE ?
        AND a.cp_domain = 'EYE'
    `;

    const search = `%${term}%`;
    return this.qadOdbcService.queryWithParams<CustomerPartSearchRow[]>(sql, [search]);
  }

  async searchCustomerName(text?: string): Promise<CustomerNameRow[]> {
    const term = (text || '').trim();
    if (!term) {
      return [];
    }

    const sql = `
      SELECT cm_addr,
             cm_sort,
             cm_active
      FROM cm_mstr a
      WHERE (a.cm_addr LIKE ? OR a.cm_sort LIKE ?)
        AND a.cm_domain = 'EYE'
    `;

    const search = `%${term}%`;
    return this.qadOdbcService.queryWithParams<CustomerNameRow[]>(sql, [search, search]);
  }

  async getAllCustomerName(): Promise<CustomerNameRow[]> {
    const sql = `
      SELECT cm_addr,
             cm_sort,
             cm_active
      FROM cm_mstr a
      WHERE a.cm_domain = 'EYE'
        AND cm_active = 1
      ORDER BY cm_sort ASC
    `;

    return this.qadOdbcService.query<CustomerNameRow[]>(sql);
  }
}
