import { Inject, Injectable } from '@nestjs/common';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';

function pick(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return obj[key];
    }
  }

  const lower = Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v])
  );

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(lower, key.toLowerCase())) {
      return lower[key.toLowerCase()];
    }
  }

  return null;
}

@Injectable()
export class WipService {
  constructor(
    @Inject(QadOdbcService)
    private readonly qadOdbcService: QadOdbcService,
  ) {}

  async getWipReport(limit: number): Promise<Record<string, unknown>[]> {
    const sql = `
      select wo_nbr id
      , wo_nbr
      , wo_wip_tot wo_wip_tot
      , wo_so_job
      , wo_routing
      , wo_rel_date
      , wo_qty_ord
      , wo_qty_comp
      , wo_need_date
      , wo_line
      , wo_due_date
      , wo_part
      , wo_status
      from wo_mstr
      left join (
        select
          sum(wod_qty_req - wod_qty_iss) open_qty,
          sum((wod_qty_req) * wod_bom_amt) total_amount,
          sum(((wod_qty_req-wod_qty_iss) * wod_bom_amt)-wod_mvrte_accr) total_open_amount,
          wod_nbr,
          sum(wod_qty_iss) wod_qty_iss
        from wod_det
        where wod_domain = 'EYE'
        group by wod_nbr
      ) a ON a.wod_nbr = wo_mstr.wo_nbr
      where wo_domain = 'EYE'
      and wo_wip_tot > 0
      order by wo_due_date DESC
    `;

    const rows = await this.qadOdbcService.query<Record<string, unknown>[]>(sql);

    const normalized = rows.map((row) => ({
      ...row,
      id: pick(row, 'wo_nbr', 'WO_NBR') ?? pick(row, 'id', 'ID'),
    }));

    if (limit > 0) {
      return normalized.slice(0, limit);
    }

    return normalized;
  }
}
