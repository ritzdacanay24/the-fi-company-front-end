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

  async getWorkOrderSearch(graphicsWoNumber?: string) {
    const woNumber = String(graphicsWoNumber || '').trim();
    if (!woNumber) {
      return {
        woInfo: null,
        bomInfo: null,
        woDetails: [],
        graphicsDemandInfo: null,
        salesOrderInfo: null,
      };
    }

    const woInfo = await this.getWorkOrderInformation(woNumber);
    if (!woInfo) {
      return {
        woInfo: null,
        bomInfo: null,
        woDetails: [],
        graphicsDemandInfo: null,
        salesOrderInfo: null,
      };
    }

    const [woDetails, graphicsDemandInfo, bomInfo] = await Promise.all([
      this.getWorkOrderDetails(woNumber),
      this.repository.getGraphicsDemandByWo(woNumber),
      this.repository.getBomInformationTest(String(woInfo['WO_PART'] || woInfo['wo_part'] || '')),
    ]);

    let salesOrderInfo: Record<string, unknown> | null = null;
    if (graphicsDemandInfo?.so && graphicsDemandInfo?.line) {
      salesOrderInfo = await this.getSalesOrderInfoBySalesLine(
        String(graphicsDemandInfo.so),
        String(graphicsDemandInfo.line),
      );
    }

    return {
      woInfo,
      bomInfo,
      woDetails,
      graphicsDemandInfo,
      salesOrderInfo,
    };
  }

  private async getWorkOrderInformation(woNumber: string): Promise<Record<string, unknown> | null> {
    const sql = `
      SELECT a.wo_nbr
        , a.wo_ord_date
        , a.wo_rel_date
        , a.wo_due_date
        , a.wo_part
        , a.wo_qty_ord
        , a.wo_qty_comp
        , a.wo_status
        , a.wo_rmks
        , a.wo_close_date
        , b.wr_op
        , b.wr_desc
        , c.full_desc
        , c.pt_part_type
        , a.wo_so_job
      FROM wr_route b
      LEFT JOIN (
        SELECT a.wo_nbr
          , a.wo_ord_date
          , a.wo_rel_date
          , CASE
              WHEN DAYOFWEEK(a.wo_due_date) IN (1) THEN a.wo_due_date - 2
              WHEN DAYOFWEEK(a.wo_due_date) IN (2, 3) THEN a.wo_due_date - 4
              WHEN DAYOFWEEK(a.wo_due_date) IN (4) THEN a.wo_due_date - 2
              ELSE a.wo_due_date - 2
            END wo_due_date
          , a.wo_part
          , a.wo_qty_ord
          , a.wo_qty_comp
          , a.wo_status
          , a.wo_rmks
          , a.wo_close_date
          , a.wo_so_job
        FROM wo_mstr a
        WHERE wo_domain = 'EYE'
      ) a ON a.wo_nbr = b.wr_nbr
      LEFT JOIN (
        SELECT pt_part
          , MAX(pt_desc1 || ' ' || pt_desc2) full_desc
          , MAX(pt_part_type) pt_part_type
        FROM pt_mstr
        WHERE pt_domain = 'EYE'
        GROUP BY pt_part
      ) c ON c.pt_part = b.wr_part
      WHERE b.wr_op IN (040, 050, 060, 070)
        AND wr_domain = 'EYE'
        AND a.wo_nbr = ?
      WITH (NOLOCK)
    `;

    const rows = await this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, [woNumber], {
      keyCase: 'upper',
    });

    return rows[0] || null;
  }

  private async getWorkOrderDetails(woNumber: string): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SELECT wod_nbr
        , wod_iss_date
        , wod_part
        , wod_qty_req
        , wod_qty_all
        , wod_qty_iss
        , wod_op
        , ld_qty_oh
      FROM wod_det
      LEFT JOIN (
        SELECT SUM(a.ld_qty_oh) ld_qty_oh
          , ld_part
        FROM ld_det a
        WHERE ld_domain = 'EYE'
        GROUP BY ld_part
      ) b ON b.ld_part = wod_det.wod_part
      WHERE wod_nbr = ?
      WITH (NOLOCK)
    `;

    return this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, [woNumber], {
      keyCase: 'upper',
    });
  }

  private async getSalesOrderInfoBySalesLine(
    salesOrder: string,
    lineNumber: string,
  ): Promise<Record<string, unknown> | null> {
    const sql = `
      SELECT a.sod_ship
        , a.sod_nbr
        , a.sod_line
        , a.sod_contr_id
        , c.so_ship
        , a.sod_due_date
        , c.so_cust
      FROM sod_det a
      LEFT JOIN (
        SELECT so_nbr
          , so_cust
          , so_ord_date
          , so_ship
          , so_bol
          , so_cmtindx
          , so_cust
        FROM so_mstr
        WHERE so_domain = 'EYE'
      ) c ON c.so_nbr = a.sod_nbr
      WHERE a.sod_nbr = ?
        AND a.sod_line = ?
      WITH (NOLOCK)
    `;

    const rows = await this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(
      sql,
      [salesOrder, lineNumber],
      { keyCase: 'upper' },
    );

    return rows[0] || null;
  }
}
