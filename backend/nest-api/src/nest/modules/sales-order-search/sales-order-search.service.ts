import { Injectable } from '@nestjs/common';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { addLowercaseAliases } from '@/shared/utils/row-alias.util';
import { toJsonSafe } from '@/shared/utils/json-safe.util';

type GenericRow = Record<string, unknown>;

@Injectable()
export class SalesOrderSearchService {
  constructor(
    private readonly qadOdbcService: QadOdbcService,
    private readonly mysqlService: MysqlService,
  ) {}

  async getCustomerOrderNumbers(order: string): Promise<GenericRow[]> {
    const sql = `
      SELECT sod_nbr
        , sod_order_category
        , sod_custpart
        , sod_due_date
        , sod_part
        , a.*
      FROM sod_det
      LEFT JOIN (
        SELECT a.so_nbr
          , a.so_cust
          , a.so_ship
          , a.so_ord_date
          , a.so_req_date
          , a.so_due_date
          , a.so_shipvia
          , a.so_inv_date
          , a.so_ship_date
          , a.so_po
        FROM so_mstr a
        WHERE so_domain = 'EYE'
      ) a ON a.so_nbr = sod_det.sod_nbr
      WHERE sod_domain = 'EYE'
        AND sod_order_category = ?
      WITH (NOLOCK)
    `;

    const rows = await this.qadOdbcService.queryWithParams<GenericRow[]>(sql, [order], {
      keyCase: 'upper',
    });

    return rows.map((row) => addLowercaseAliases(row));
  }

  async read(inputOrder: string): Promise<Record<string, unknown>> {
    const mainSql = `
      SELECT a.so_nbr
        , a.so_cust
        , a.so_ship
        , a.so_ord_date
        , a.so_req_date
        , a.so_due_date
        , a.so_shipvia
        , a.so_inv_date
        , a.so_ship_date
        , a.so_domain
        , a.so_ord_date-a.so_ship_date age
        , a.so_po
      FROM so_mstr a
      LEFT JOIN (
        SELECT sod_nbr
          , MAX(sod_order_category) sod_order_category
        FROM sod_det
        WHERE sod_domain = 'EYE'
        GROUP BY sod_nbr
      ) b ON b.sod_nbr = a.so_nbr
      WHERE (a.so_nbr = ? OR b.sod_order_category = ?)
        AND a.so_domain = 'EYE'
      WITH (NOLOCK)
    `;

    const mainRows = await this.qadOdbcService.queryWithParams<GenericRow[]>(mainSql, [inputOrder, inputOrder], {
      keyCase: 'upper',
    });

    const main = mainRows[0];
    if (!main) {
      return toJsonSafe({ orderFound: false }) as Record<string, unknown>;
    }

    const order = String(main.SO_NBR || '').trim();
    const soShip = String(main.SO_SHIP || '').trim();
    const multipleSo = mainRows.slice(1).map((row) => row.SO_NBR);

    const [addressRows, mainDetailRows, shipRows, woDetailRows] = await Promise.all([
      this.qadOdbcService.queryWithParams<GenericRow[]>(
        `
          SELECT ad_addr
            , ad_name
            , ad_line2
            , ad_city
            , ad_state
            , ad_zip
            , ad_type
            , ad_ref
            , ad_country
          FROM ad_mstr
          WHERE ad_addr = ?
            AND ad_domain = 'EYE'
          WITH (NOLOCK)
        `,
        [soShip],
        { keyCase: 'upper' },
      ),
      this.qadOdbcService.queryWithParams<GenericRow[]>(
        `
          SELECT a.sod_part
            , a.sod_due_date
            , a.sod_req_date
            , a.sod_line
            , a.sod_qty_ord
            , a.sod_qty_all
            , a.sod_qty_pick
            , a.sod_qty_ship
            , totalShippedQty sod_qty_inv
            , a.sod_domain
            , a.sod_price
            , (a.sod_qty_ship/NULLIF(a.sod_qty_ord, 0))*100 percent
            , CASE WHEN a.sod_qty_ord = a.sod_qty_ship THEN 'text-success' END statusClass
            , b.abs_shp_date
            , a.sod_qty_ord-(a.sod_qty_all+a.sod_qty_pick+a.sod_qty_ship) short
            , a.sod_nbr
            , a.sod_order_category
            , a.sod_custpart
            , c.cmt_cmmt
            , a.sod_contr_id
          FROM sod_det a
          LEFT JOIN (
            SELECT MAX(abs_shp_date) abs_shp_date
              , abs_item
              , abs_line
              , abs_order
              , SUM(CASE WHEN abs_inv_nbr != '' THEN abs_ship_qty ELSE 0 END) totalShippedQty
            FROM abs_mstr
            WHERE abs_shp_date IS NOT NULL
              AND abs_domain = 'EYE'
            GROUP BY abs_item
              , abs_line
              , abs_order
          ) b ON b.abs_item = a.sod_part
            AND b.abs_line = a.sod_line
            AND b.abs_order = a.sod_nbr
          LEFT JOIN (
            SELECT cmt_cmmt
              , cmt_indx
            FROM cmt_det
            WHERE cmt_domain = 'EYE'
          ) c ON c.cmt_indx = a.sod_cmtindx
          WHERE a.sod_nbr = ?
            AND a.sod_domain = 'EYE'
          ORDER BY a.sod_line
          WITH (NOLOCK)
        `,
        [order],
        { keyCase: 'upper' },
      ),
      this.qadOdbcService.queryWithParams<GenericRow[]>(
        `
          SELECT abs_shipto
            , abs_shp_date
            , abs_item
            , abs_line
            , abs_ship_qty
            , abs_inv_nbr
            , abs_par_id
          FROM abs_mstr
          WHERE abs_order = ?
            AND abs_domain = 'EYE'
          ORDER BY abs_shp_date ASC
          WITH (NOLOCK)
        `,
        [order],
        { keyCase: 'upper' },
      ),
      this.qadOdbcService.queryWithParams<GenericRow[]>(
        `
          SELECT a.wo_nbr
            , b.wod_lot
            , b.wod_iss_date
            , b.wod_qty_req
            , b.wod_qty_all
            , b.wod_qty_pick
            , b.wod_qty_iss
            , b.wod_part
            , CASE
                WHEN b.wod_qty_req = 0 THEN '100.00'
                WHEN b.wod_qty_req > 0 THEN (wod_qty_iss/NULLIF(b.wod_qty_req, 0))*100
              END percent
            , CASE WHEN b.wod_qty_req = b.wod_qty_iss THEN 'Complete' END status
            , CASE WHEN b.wod_qty_req = b.wod_qty_iss THEN 'text-success' END statusClass
            , b.wod_qty_req-(b.wod_qty_all+b.wod_qty_pick+b.wod_qty_iss) short
          FROM wo_mstr a
          INNER JOIN wod_det b ON a.wo_nbr = b.wod_nbr AND wod_domain = 'EYE'
          WHERE CASE WHEN SUBSTRING(a.wo_so_job, 1, 2) = 'SO' THEN a.wo_so_job ELSE CONCAT('SO', a.wo_so_job) END = ?
            AND a.wo_domain = 'EYE'
          WITH (NOLOCK)
        `,
        [order],
        { keyCase: 'upper' },
      ),
    ]);

    const mainDetails: GenericRow[] = [];
    let picked = 0;
    let shipped = 0;
    let ordered = 0;
    let inv = 0;
    let lines = 0;
    let price = 0;

    for (const row of mainDetailRows) {
      const normalized = addLowercaseAliases({ ...row });
      const sodNbr = String(normalized.sod_nbr || normalized.SOD_NBR || '').trim();
      const sodLine = String(normalized.sod_line || normalized.SOD_LINE || '').trim();
      const soLine = `${sodNbr}-${sodLine}`;

      const latestCommentRows = await this.mysqlService.query<any>(
        `
          SELECT a.orderNum
            , comments_html comments_html
            , comments comments
            , a.createdDate
            , DATE(a.createdDate) byDate
            , CASE WHEN DATE(a.createdDate) = CURDATE() THEN 'text-success' ELSE 'text-info' END color_class_name
            , CASE WHEN DATE(a.createdDate) = CURDATE() THEN 'bg-success' ELSE 'bg-info' END bg_class_name
            , CONCAT('SO#:', ' ', a.orderNum) comment_title
            , CONCAT(c.first, ' ', c.last) created_by_name
          FROM eyefidb.comments a
          INNER JOIN (
            SELECT orderNum
              , MAX(id) id
              , MAX(DATE(createdDate)) createdDate
            FROM eyefidb.comments
            WHERE orderNum = ?
              AND active = 1
            GROUP BY orderNum
          ) b ON a.orderNum = b.orderNum AND a.id = b.id
          LEFT JOIN db.users c ON c.id = a.userId
          WHERE a.orderNum = ?
            AND a.active = 1
        `,
        [soLine, soLine],
      );

      const workOrderOwnerRows = await this.mysqlService.query<any>(
        `
          SELECT fs_install_date, fs_install
          FROM eyefidb.workOrderOwner
          WHERE so = ?
          LIMIT 1
        `,
        [soLine],
      );

      normalized.recent_comments = latestCommentRows[0] || {};
      normalized.CMT_CMMT = String(normalized.CMT_CMMT || '').replace(/;/g, '');
      normalized.fs_install_date = workOrderOwnerRows[0]?.fs_install_date || '';
      normalized.fs_install = workOrderOwnerRows[0]?.fs_install || '';

      picked += this.asNumber(normalized.sod_qty_pick ?? normalized.SOD_QTY_PICK);
      shipped += this.asNumber(normalized.sod_qty_ship ?? normalized.SOD_QTY_SHIP);
      ordered += this.asNumber(normalized.sod_qty_ord ?? normalized.SOD_QTY_ORD);
      inv += this.asNumber(normalized.sod_qty_inv ?? normalized.SOD_QTY_INV);
      price += this.asNumber(normalized.sod_price ?? normalized.SOD_PRICE);
      lines += 1;

      mainDetails.push(normalized);
    }

    let woTotal = 0;
    let woIssue = 0;
    const woDetails = woDetailRows.map((row) => {
      const normalized = addLowercaseAliases(row);
      woTotal += this.asNumber(normalized.wod_qty_req ?? normalized.WOD_QTY_REQ);
      woIssue += this.asNumber(normalized.wod_qty_iss ?? normalized.WOD_QTY_ISS);
      return normalized;
    });

    const address = addLowercaseAliases(addressRows[0] || {});
    const ship = shipRows.map((row) => addLowercaseAliases(row));

    return toJsonSafe({
      main: addLowercaseAliases(main),
      multipleSo,
      mainDetails,
      picked,
      ordered,
      shipped,
      inv,
      lines,
      price,
      woDetails,
      ship,
      lastShipDate: ship.length ? ship[ship.length - 1] : null,
      address,
      orderFound: true,
      woOverall: woTotal > 0 ? (woIssue / woTotal) * 100 : '0.00',
      lineOverall: ordered > 0 ? (shipped / ordered) * 100 : '0.00',
    }) as Record<string, unknown>;
  }

  async getTransactions(order: string): Promise<GenericRow[]> {
    const sql = `
      SELECT tr_ship_id
        , tr_part
        , tr_date
        , tr_type
        , tr_last_date
        , tr_nbr
        , tr_addr
        , tr_rmks
        , tr_qty_loc
        , tr_userid
        , tr_type
        , tr_per_date
        , tr_last_date
        , tr_time
        , tr_qty_req
        , tr_qty_chg
      FROM tr_hist
      WHERE tr_so_job = ?
        AND tr_domain = 'EYE'
      WITH (NOLOCK)
    `;

    const rows = await this.qadOdbcService.queryWithParams<GenericRow[]>(sql, [order], {
      keyCase: 'upper',
    });

    return rows.map((row) => addLowercaseAliases(row));
  }

  private asNumber(value: unknown): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }
}