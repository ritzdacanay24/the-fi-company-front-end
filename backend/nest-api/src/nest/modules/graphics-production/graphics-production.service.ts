import { Inject, Injectable } from '@nestjs/common';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { GraphicsProductionRepository } from './graphics-production.repository';

@Injectable()
export class GraphicsProductionService {
  constructor(
    private readonly repository: GraphicsProductionRepository,
    @Inject(QadOdbcService)
    private readonly qadOdbcService: QadOdbcService,
  ) {}

  async getProductionOrders() {
    const [queues, openOrders] = await Promise.all([
      this.repository.getQueues(),
      this.repository.getOpenOrders(),
    ]);

    const woNumbers = openOrders.map((o) => o['graphicsWorkOrder']).filter(Boolean);

    let woInfo: Record<string, unknown>[] = [];
    if (woNumbers.length > 0) {
      const inClause = woNumbers.map((n) => `'${String(n).replace(/'/g, "''")}'`).join(',');
      const qadSql = `
        SELECT a.wo_routing
          , a.wo_line
          , a.wo_nbr
          , a.wo_ord_date
          , wo_qty_ord
          , wo_qty_comp
          , wo_part
          , wo_due_date actual_due_date
          , wo_status
          , CONCAT(pt_desc1, pt_desc2) fullDesc
          , wo_rmks
          , CASE
              WHEN DAYOFWEEK(a.wo_due_date) IN (1) THEN a.wo_due_date - 2
              WHEN DAYOFWEEK(a.wo_due_date) IN (2, 3) THEN a.wo_due_date - 4
              WHEN DAYOFWEEK(a.wo_due_date) IN (4) THEN a.wo_due_date - 2
              ELSE a.wo_due_date - 2
            END wo_due_date
        FROM wo_mstr a
        LEFT JOIN (
          SELECT pt_part, MAX(pt_desc1) pt_desc1, MAX(pt_desc2) pt_desc2
          FROM pt_mstr
          WHERE pt_domain = 'EYE'
          GROUP BY pt_part
        ) b ON b.pt_part = a.wo_part
        WHERE wo_domain = 'EYE'
          AND wo_nbr IN (${inClause})
      `;
      woInfo = await this.qadOdbcService.query<Record<string, unknown>[]>(qadSql);
    }

    // Build lookup map by wo_nbr (case-insensitive)
    const woMap = new Map<string, Record<string, unknown>>();
    for (const wo of woInfo) {
      const key = String(wo['WO_NBR'] ?? wo['wo_nbr'] ?? '').toUpperCase();
      woMap.set(key, wo);
    }

    // Enrich open orders with QAD data
    const enrichedOrders: Record<string, unknown>[] = openOrders.map((order) => {
      const raw = order as Record<string, unknown>;
      const woKey = String(raw['graphicsWorkOrder'] ?? '').toUpperCase();
      const wo = woMap.get(woKey);
      if (wo) {
        return {
          ...raw,
          itemNumber: wo['WO_PART'] ?? wo['wo_part'] ?? raw['itemNumber'],
          ordered_date: wo['WO_ORD_DATE'] ?? wo['wo_ord_date'] ?? raw['ordered_date'],
          qty: wo['WO_QTY_ORD'] ?? wo['wo_qty_ord'] ?? raw['qty'],
          dueDate: wo['WO_DUE_DATE'] ?? wo['wo_due_date'] ?? raw['dueDate'],
          actual_due_date: wo['ACTUAL_DUE_DATE'] ?? wo['actual_due_date'] ?? null,
          wo_status: wo['WO_STATUS'] ?? wo['wo_status'] ?? null,
          wo_mstr: wo,
        };
      }
      return { ...raw, wo_mstr: null };
    });

    // Group orders into queues
    const result = (queues as Record<string, unknown>[]).map((queue) => ({
      ...queue,
      orderStatus: enrichedOrders.filter(
        (order) => String(order['status']) === String(queue['queueStatus']),
      ),
    }));

    return {
      totalOrders: openOrders.length,
      queues: result,
      queueNames: queues,
    };
  }
}
