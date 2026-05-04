import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';

@Injectable()
export class ItemSearchService {
  constructor(
    @Inject(QadOdbcService) private readonly qadOdbcService: QadOdbcService,
    @Inject(MysqlService) private readonly mysqlService: MysqlService,
  ) {}

  async getCustomerPartInfo(partNumber: string): Promise<Record<string, unknown> | null> {
    const trimmedPartNumber = String(partNumber || '').trim();
    if (!trimmedPartNumber) {
      return null;
    }

    const sql = `
      SELECT a.pt_part
        , a.pt_desc1
        , a.pt_desc2
        , b.cp_cust_part
      FROM pt_mstr a
      LEFT JOIN cp_mstr b ON b.cp_part = a.pt_part AND b.cp_domain = 'EYE'
      WHERE a.pt_domain = 'EYE'
        AND (
          UPPER(a.pt_part) = ?
          OR UPPER(b.cp_cust_part) = ?
          OR UPPER(b.cp_cust_part) LIKE ?
        )
      ORDER BY CASE
          WHEN UPPER(b.cp_cust_part) = ? THEN 0
          WHEN UPPER(a.pt_part) = ? THEN 1
          ELSE 2
        END
      WITH (NOLOCK)
    `;

    const normalizedPartNumber = trimmedPartNumber.toUpperCase();
    const rows = await this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(
      sql,
      [
        normalizedPartNumber,
        normalizedPartNumber,
        `%${normalizedPartNumber}%`,
        normalizedPartNumber,
        normalizedPartNumber,
      ],
      { keyCase: 'upper' },
    );

    const row = rows[0];
    return row ? this.withCaseVariants(row) : null;
  }

  async readByItem(item: string, typeOfItemSearch = 'partNumber'): Promise<Record<string, unknown>> {
    const trimmedItem = String(item || '').trim();
    if (!trimmedItem) {
      return {
        locationDet: [],
        locationDetDesc: null,
        POresults: [],
        WOresults: [],
        itemInfo: null,
        orderDemand: [],
        openShortages: [],
      };
    }

    const [locationDetRows, poResultsRows, woResultsRows, itemInfoRows, orderDemandRows, openShortages] =
      await Promise.all([
        this.getLocationDetails(trimmedItem),
        this.getPurchaseOrders(trimmedItem),
        this.getWorkOrders(trimmedItem),
        this.getItemInfo(trimmedItem),
        this.getOrderDemand(trimmedItem),
        this.getShortages(trimmedItem, typeOfItemSearch),
      ]);

    const locationDet = locationDetRows.map((row) => this.withCaseVariants(row));
    const POresults = poResultsRows.map((row) => this.withCaseVariants(row));
    const WOresults = woResultsRows.map((row) => this.withCaseVariants(row));
    const itemInfo = itemInfoRows[0] ? this.withCaseVariants(itemInfoRows[0]) : null;
    const orderDemand = orderDemandRows.map((row) => this.withCaseVariants(row));

    return {
      locationDet,
      locationDetDesc: locationDet.length > 0 ? locationDet[0].FULLDESC : null,
      POresults,
      WOresults,
      itemInfo,
      orderDemand,
      openShortages,
    };
  }

  private async getLocationDetails(item: string): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SELECT CAST(a.ld_loc AS CHAR(25)) ld_loc
        , a.ld_part ld_qty_oh
        , a.ld_qty_oh ld_qty_oh
        , a.ld_site ld_site
        , a.ld_status ld_status
        , a.ld_qty_all ld_qty_all
        , a.ld_qty_oh - a.ld_qty_all available
        , CONCAT(pt_desc1, pt_desc2) fullDesc
        , a.ld_lot
      FROM ld_det a
      LEFT JOIN (
        SELECT pt_part
          , MAX(pt_desc1) pt_desc1
          , MAX(pt_desc2) pt_desc2
        FROM pt_mstr
        WHERE pt_domain = 'EYE'
        GROUP BY pt_part
      ) b ON b.pt_part = a.ld_part
      WHERE a.ld_part = ?
        AND ld_domain = 'EYE'
        AND a.ld_qty_oh > 0
      WITH (NOLOCK)
    `;

    return this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, [item], {
      keyCase: 'upper',
    });
  }

  private async getPurchaseOrders(item: string): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SELECT a.pod_nbr
        , a.pod_part
        , pod_qty_ord
        , pod_qty_rcvd
        , pod_due_date
        , pod_pur_cost
        , pod_um
        , pod_status
        , b.po_vend
        , b.po_shipvia
        , b.po_ord_date
        , b.po_rmks
        , b.po_buyer
      FROM pod_det a
      LEFT JOIN po_mstr b ON a.pod_nbr = b.po_nbr AND po_domain = 'EYE'
      WHERE a.pod_domain = 'EYE'
        AND a.pod_part = ?
        AND a.pod_status != 'c'
      WITH (NOLOCK)
    `;

    return this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, [item], {
      keyCase: 'preserve',
    });
  }

  private async getWorkOrders(item: string): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SELECT a.wr_nbr
        , MAX(a.wr_qty_ord) wr_qty_ord
        , MAX(a.wr_due) wr_due
        , MAX(wo_status) wr_status
        , MAX(b.wo_qty_comp) wr_qty_comp
      FROM wr_route a
      JOIN wo_mstr b ON b.wo_nbr = a.wr_nbr AND wo_status != 'C' AND wo_domain = 'EYE'
      WHERE a.wr_domain = 'EYE'
        AND a.wr_part = ?
      GROUP BY a.wr_nbr
      WITH (NOLOCK)
    `;

    return this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, [item], {
      keyCase: 'upper',
    });
  }

  private async getItemInfo(item: string): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SELECT a.pt_part
        , a.pt_desc1
        , a.pt_desc2
        , a.pt_um
        , a.pt_pm_code
        , a.pt_status
        , a.pt_site
        , a.pt_added
        , a.pt_mod_date
        , b.sct_cst_tot pt_price
        , a.pt_desc1 || ' ' || a.pt_desc2 fullDesc
        , pt_draw
        , pt_prod_line
        , pt_part_type
        , pt_abc
        , pt_iss_pol
        , pt_routing
        , pt_rev
      FROM pt_mstr a
      LEFT JOIN sct_det b ON a.pt_part = b.sct_part
        AND sct_sim = 'Standard' AND sct_domain = 'EYE'
        AND sct_site = 'EYE01'
      WHERE a.pt_part = ?
        AND pt_domain = 'EYE'
      WITH (NOLOCK)
    `;

    return this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, [item], {
      keyCase: 'upper',
    });
  }

  private async getOrderDemand(item: string): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SELECT sod_part
        , sod_due_date sod_due_date
        , sod_nbr
        , SUM(sod_qty_ord) totalOrdered
        , SUM(sod_qty_ivcd) totalInvoiced
        , SUM(sod_qty_all) totalAllocated
        , SUM(sod_qty_pick) totalPicked
        , SUM(sod_qty_ship) totalShipped
        , SUM(sod_qty_ord) - SUM(sod_qty_ship) openBalance
      FROM sod_det
      WHERE sod_qty_ship != sod_qty_ord
        AND sod_part = ?
        AND sod_domain = 'EYE'
      GROUP BY sod_part, sod_nbr, sod_due_date
      WITH (NOLOCK)
    `;

    return this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, [item], {
      keyCase: 'upper',
    });
  }

  private async getShortages(
    partNumber: string,
    typeOfItemSearch = 'assemblyNumber',
  ): Promise<Array<Record<string, unknown>>> {
    let sql = `
      SELECT a.*
        , CONCAT(b.first, ' ', b.last) fullName
        , c.status statusGraphics
        , c.graphicsWorkOrder graphicsWorkOrder
      FROM eyefidb.shortageRequest a
      LEFT JOIN db.users b ON b.id = a.createdBy
      LEFT JOIN (
        SELECT purchaseOrder
          , customerPartNumber
          , MAX(c.name) status
          , MAX(graphicsWorkOrder) graphicsWorkOrder
        FROM eyefidb.graphicsSchedule a
        LEFT JOIN eyefidb.graphicsQueues c ON c.queueStatus = a.status
        WHERE a.active = 1
        GROUP BY purchaseOrder, customerPartNumber
      ) c ON c.purchaseOrder = a.poNumber AND c.customerPartNumber = a.partNumber
      WHERE a.active = 1
        AND a.productionIssuedDate IS NULL
    `;

    const params: Array<string> = [];
    if (typeOfItemSearch === 'partNumber') {
      sql += ' AND a.partNumber = ?';
      params.push(partNumber);
    } else if (typeOfItemSearch === 'assemblyNumber') {
      sql += ' AND a.assemblyNumber = ?';
      params.push(partNumber);
    }

    sql += ' ORDER BY a.priority DESC, a.dueDate ASC';

    return this.mysqlService.query<RowDataPacket[]>(sql, params);
  }

  private withCaseVariants(row: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = { ...row };

    for (const [key, value] of Object.entries(row)) {
      const upper = key.toUpperCase();
      const lower = key.toLowerCase();
      if (!(upper in normalized)) {
        normalized[upper] = value;
      }
      if (!(lower in normalized)) {
        normalized[lower] = value;
      }
    }

    return normalized;
  }
}
