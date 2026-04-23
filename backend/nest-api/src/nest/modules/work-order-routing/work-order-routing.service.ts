import { Inject, Injectable } from '@nestjs/common';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';

@Injectable()
export class WorkOrderRoutingService {
  constructor(
    @Inject(QadOdbcService) private readonly qadOdbcService: QadOdbcService,
  ) {}

  async readSingle(partNumber: string): Promise<Record<string, unknown>[]> {
    const sql = this.baseSql() + `
      WHERE a.wr_domain = 'EYE'
        AND wr_qty_comp != a.wr_qty_ord
        AND a.wr_part = ?
        AND a.wr_status != 'C'
      WITH (NOLOCK)
    `;

    const rows = await this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(
      sql,
      [partNumber],
      { keyCase: 'upper' },
    );

    return this.toJsonSafe(rows);
  }

  async getRoutingByWoNumber(woNumber: string): Promise<Record<string, unknown>[]> {
    const sql = this.baseSql() + `
      WHERE a.wr_domain = 'EYE'
        AND a.wr_nbr = ?
      WITH (NOLOCK)
    `;

    const rows = await this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(
      sql,
      [woNumber],
      { keyCase: 'upper' },
    );

    return this.toJsonSafe(rows);
  }

  private baseSql(): string {
    return `
      SELECT a.wr_nbr wr_nbr
        , a.wr_op wr_op
        , a.wr_desc wr_desc
        , a.wr_wkctr wr_wkctr
        , a.wr_qty_ord wr_qty_ord
        , a.wr_qty_comp wr_qty_comp
        , a.wr_due wr_due
        , a.wr_part wr_part
        , a.wr_status wr_status
        , a.wr_qty_ord-a.wr_qty_comp openQty
        , wo_ord_date wo_ord_date
        , CASE WHEN b.wo_so_job = 'dropin' THEN 1 ELSE 0 END dropInClass
        , b.wo_so_job wo_so_job
        , b.wo_rmks wo_rmks
        , CASE
            WHEN b.wo_so_job = 'dropin' THEN wr_due
            ELSE
              CASE
                WHEN a.wr_op = 10 THEN
                  CASE
                    WHEN DAYOFWEEK(wr_due) IN (1) THEN wr_due - 6
                    WHEN DAYOFWEEK(wr_due) IN (2) THEN wr_due - 7
                    WHEN DAYOFWEEK(wr_due) IN (3) THEN wr_due - 7
                    WHEN DAYOFWEEK(wr_due) IN (4) THEN wr_due - 7
                    WHEN DAYOFWEEK(wr_due) IN (5) THEN wr_due - 7
                    WHEN DAYOFWEEK(wr_due) IN (6) THEN wr_due - 8
                    WHEN DAYOFWEEK(wr_due) IN (7) THEN wr_due - 5
                    ELSE wr_due - 5
                  END
                WHEN a.wr_op = 20 THEN
                  CASE
                    WHEN DAYOFWEEK(wr_due) IN (1) THEN wr_due - 4
                    WHEN DAYOFWEEK(wr_due) IN (2) THEN wr_due - 5
                    WHEN DAYOFWEEK(wr_due) IN (3) THEN wr_due - 5
                    WHEN DAYOFWEEK(wr_due) IN (4) THEN wr_due - 5
                    WHEN DAYOFWEEK(wr_due) IN (5) THEN wr_due - 3
                    WHEN DAYOFWEEK(wr_due) IN (6) THEN wr_due - 3
                    WHEN DAYOFWEEK(wr_due) IN (7) THEN wr_due - 3
                    ELSE wr_due - 3
                  END
                WHEN a.wr_op = 30 THEN
                  CASE
                    WHEN DAYOFWEEK(wr_due) IN (1) THEN wr_due - 2
                    WHEN DAYOFWEEK(wr_due) IN (2, 3) THEN wr_due - 4
                    WHEN DAYOFWEEK(wr_due) IN (4) THEN wr_due - 2
                    ELSE wr_due - 2
                  END
              END
          END dueBy
        , CONCAT(pt_desc1, pt_desc2) fullDesc
      FROM wr_route a
      LEFT JOIN (
        SELECT wo_nbr
          , MIN(wo_ord_date) wo_ord_date
          , MAX(wo_so_job) wo_so_job
          , MAX(wo_rmks) wo_rmks
        FROM wo_mstr
        WHERE wo_domain = 'EYE'
        GROUP BY wo_nbr
      ) b ON b.wo_nbr = a.wr_nbr
      LEFT JOIN (
        SELECT pt_part
          , MAX(pt_desc1) pt_desc1
          , MAX(pt_desc2) pt_desc2
        FROM pt_mstr
        WHERE pt_domain = 'EYE'
        GROUP BY pt_part
      ) c ON c.pt_part = a.wr_part
    `;
  }

  private toJsonSafe<T>(value: T): T {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'bigint') {
      return value.toString() as T;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.toJsonSafe(item)) as T;
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        this.toJsonSafe(item),
      ]);
      return Object.fromEntries(entries) as T;
    }

    return value;
  }
}
