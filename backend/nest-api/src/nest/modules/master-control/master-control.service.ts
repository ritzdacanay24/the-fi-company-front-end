import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { toJsonSafe } from '@/shared/utils/json-safe.util';
import { addLowercaseAliases } from '@/shared/utils/row-alias.util';

type MasterRow = Record<string, unknown>;

type CommentRow = {
  orderNum: string;
  comments_html: string;
  comments: string;
  createdDate: string;
  byDate: string;
  color_class_name: string;
  bg_class_name: string;
  comment_title: string;
  created_by_name: string;
};

type PrintDetailRow = {
  id: number;
  assignedTo: string;
  printedDate: string;
  createdBy: number;
  workOrder: string;
  createdByName: string;
  comments: string;
};

type MiscRow = Record<string, unknown> & { so?: string };
type KanbanRow = Record<string, unknown> & { wo_nbr?: string };
type WedgeReworkRow = Record<string, unknown> & { work_order_number?: string };

@Injectable()
export class MasterControlService {
  private static readonly ROUTING_ALL = [10, 20, 30, 40, 50] as const;

  constructor(
    @Inject(QadOdbcService) private readonly qadOdbcService: QadOdbcService,
    @Inject(MysqlService) private readonly mysqlService: MysqlService,
  ) {}

  async getMasterProductionReportByRouting(routingInput: string): Promise<MasterRow[]> {
    const { routingOps, all } = this.resolveRouting(routingInput);
    const details = await this.getRoutingRows(routingOps, all);
    const formatted = await this.formatDataStructure(details);
    return toJsonSafe(formatted) as MasterRow[];
  }

  async getPickDetailsByWorkOrderNumber(
    workOrderNumber: string,
    filteredSections: string,
  ): Promise<Record<string, unknown>> {
    const result = await this.getWorkOrderDetailByWorkOrderNumber(workOrderNumber);
    const partNumbers = result
      .map((row) => String(row.WOD_PART || row.wod_part || ''))
      .filter(Boolean);

    const inventoryItems = partNumbers.length ? await this.getLocations(partNumbers) : [];
    const printDetails = await this.getLatestPrintDetailByWorkOrder(workOrderNumber);
    const details: Array<Record<string, unknown>> = [];
    const hardware: Array<Record<string, unknown>> = [];

    let openWorkOrderCount = 0;
    let totalWorkOrderCount = 0;
    let completedWorkOrderCount = 0;
    let totalWorkOrderQtyRequired = 0;
    let totalWorkOrderQtyIssued = 0;

    const filtered = filteredSections
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    for (const sourceRow of result) {
      const row = addLowercaseAliases(sourceRow);
      const qtyReq = Number(row.WOD_QTY_REQ || 0);
      const qtyIss = Number(row.WOD_QTY_ISS || 0);
      const openPicks = qtyReq - qtyIss;

      totalWorkOrderQtyRequired += qtyReq;
      totalWorkOrderQtyIssued += qtyIss;
      totalWorkOrderCount += 1;

      row.locations = inventoryItems
        .filter((loc) => String(loc.LD_PART || loc.ld_part || '') === String(row.WOD_PART || row.wod_part || ''))
        .map((loc) => addLowercaseAliases(loc));

      if (openPicks > 0) {
        openWorkOrderCount += 1;
      }

      if (openPicks <= 0) {
        completedWorkOrderCount += 1;
      }

      if (!filtered.length) {
        details.push(row);
        continue;
      }

      if (filtered.includes('Open Picks') && openPicks > 0) {
        details.push(row);
      }

      if (filtered.includes('Completed Picks') && openPicks <= 0) {
        details.push(row);
      }
    }

    const workOrderPercentComplete =
      totalWorkOrderQtyRequired === 0 ? 0 : (totalWorkOrderQtyIssued / totalWorkOrderQtyRequired) * 100;

    const payload = {
      0: result,
      details,
      filteredSections: filtered,
      hardware,
      mainDetails: addLowercaseAliases(await this.getWoMstrByWorkOrderNumber(workOrderNumber)),
      totalWorkOrderCount,
      openWorkOrderCount,
      completedWorkOrderCount,
      workOrderPercentComplete,
      doesOrderHaveLines: result.length > 0,
      printDetails: printDetails ? addLowercaseAliases(printDetails) : {},
    };

    return toJsonSafe(payload) as Record<string, unknown>;
  }

  private resolveRouting(routingInput: string): { routingOps: number[]; all: boolean } {
    const normalized = String(routingInput || '').trim();
    const value = Number(normalized);
    if ([10, 20, 30, 40, 50].includes(value)) {
      return { routingOps: [value], all: false };
    }

    return { routingOps: [...MasterControlService.ROUTING_ALL], all: true };
  }

  private async getRoutingRows(routingOps: number[], all: boolean): Promise<MasterRow[]> {
    const opCsv = routingOps.join(',');
    let sql = `
      SELECT a.wr_nbr
        , LTRIM(RTRIM(TO_CHAR(a.wr_nbr))) || '-' || LTRIM(RTRIM(TO_CHAR(a.wr_op))) so
        , a.wr_op
        , a.wr_qty_ord
        , a.wr_qty_ord-a.wr_qty_comp openQty
        , a.wr_qty_wip
        , a.wr_qty_comp
        , wr_domain
        , a.wr_status
        , a.wr_due
        , a.wr_part
        , a.wr_queue
        , a.wr_qty_inque
        , a.wr_desc
        , a.wr_wkctr
        , b.wo_ord_date
        , b.wo_so_job
        , b.wo_rmks
        , REPLACE(CONCAT(a.wr_nbr, TO_CHAR(a.wr_op)), ' ', '') id
        , lineStatus
        , CONCAT(pt_desc1, pt_desc2) fullDesc
        , b.wo_status
        , b.wo_qty_comp
        , b.wo_qty_ord
        , b.wo_rel_date
        , a.wr_qty_inque
        , a.wr_qty_outque
        , e.total_lines
        , CASE
            WHEN b.wo_so_job = 'dropin' THEN wr_due
            ELSE
              CASE
                WHEN a.wr_op = 10 THEN
                  CASE
                    WHEN DAYOFWEEK(wr_due) IN (1, 2, 3) THEN wr_due - 4
                    WHEN DAYOFWEEK(wr_due) IN (4, 5, 6) THEN wr_due - 2
                    WHEN DAYOFWEEK(wr_due) IN (7) THEN wr_due - 3
                    ELSE wr_due - 2
                  END
                WHEN a.wr_op = 20 THEN
                  CASE
                    WHEN DAYOFWEEK(wr_due) IN (1, 2) THEN wr_due - 3
                    WHEN DAYOFWEEK(wr_due) IN (3, 4, 5, 6) THEN wr_due - 1
                    WHEN DAYOFWEEK(wr_due) IN (7) THEN wr_due - 2
                    ELSE wr_due - 1
                  END
                WHEN a.wr_op = 30 THEN
                  CASE
                    WHEN DAYOFWEEK(wr_due) IN (1) THEN wr_due - 2
                    WHEN DAYOFWEEK(wr_due) IN (2, 3, 4) THEN wr_due - 0
                    ELSE wr_due - 0
                  END
                ELSE wo_due_date
              END
          END dueBy
      FROM wr_route a
      LEFT JOIN (
        SELECT wo_nbr
          , wo_so_job
          , wo_rmks
          , wo_status
          , wo_rel_date
          , wo_ord_date
          , wo_qty_comp
          , wo_qty_ord
          , wo_due_date
        FROM wo_mstr
        WHERE wo_domain = 'EYE'
          AND wo_status IN ('R', 'F', 'A', 'E')
      ) b ON b.wo_nbr = a.wr_nbr
      LEFT JOIN (
        SELECT a.wod_nbr
          , SUM(a.wod_qty_req - a.wod_qty_iss) lineStatus
          , COUNT(a.wod_nbr) total_lines
        FROM wod_det a
        JOIN pt_mstr c
          ON c.pt_part = a.wod_part
          AND pt_domain = 'EYE'
          AND c.pt_part_type != 'Hardware'
          AND c.pt_part_type != 'HDW'
        WHERE wod_domain = 'EYE'
          AND a.wod_qty_req > 0
        GROUP BY a.wod_nbr
      ) e ON e.wod_nbr = a.wr_nbr
      LEFT JOIN (
        SELECT pt_part
          , MAX(pt_desc1) pt_desc1
          , MAX(pt_desc2) pt_desc2
        FROM pt_mstr
        WHERE pt_domain = 'EYE'
        GROUP BY pt_part
      ) f ON f.pt_part = a.wr_part
      WHERE wr_status != 'c'
        AND wr_domain = 'EYE'
        AND wr_op IN (${opCsv})
    `;

    if (all) {
      sql += `
        AND wr_qty_ord != wr_qty_comp
        AND wo_status != 'c'
      `;
    } else {
      sql += `
        AND (
          (a.wr_op != 10 AND a.wr_qty_inque > 0 AND a.wr_qty_ord != a.wr_qty_comp)
          OR (a.wr_op = 10 AND (a.wr_qty_ord - a.wr_qty_comp != 0))
        )
      `;
    }

    sql += ' WITH (NOLOCK)';

    return this.qadOdbcService.query<MasterRow[]>(sql, { keyCase: 'upper' });
  }

  private async formatDataStructure(details: MasterRow[]): Promise<MasterRow[]> {
    if (!details.length) {
      return [];
    }

    const workOrders = details.map((row) => String(row.WR_NBR || '')).filter(Boolean);
    const soValues = details.map((row) => String(row.SO || '')).filter(Boolean);

    const [comments, miscInfo, kanbanInfo, printDetails, wedgeRework] = await Promise.all([
      this.getCommentsByOrderNumbers(workOrders),
      this.getMiscInfoBySalesOrderNumbers(soValues),
      this.getKanban(workOrders),
      this.getPrintDetails(workOrders),
      this.getWedgeReworkByWorkOrders(workOrders),
    ]);

    const today = new Date().toISOString().slice(0, 10);

    return details.map((row) => {
      const workOrder = String(row.WR_NBR || '');
      const so = String(row.SO || '');
      const dueBy = String(row.DUEBY || '').slice(0, 10);

      const statusInfo = this.statusClass(dueBy, today);
      const recentComment = comments.find((item) => item.orderNum === workOrder) || {};
      const printDetail = printDetails.find((item) => item.workOrder === workOrder) || {};
      const wedge = wedgeRework.find((item) => String(item.work_order_number || '') === workOrder) || {};
      const misc = miscInfo.find((item) => String(item.so || '') === so) || {};
      const kanban = kanbanInfo.find((item) => String(item.wo_nbr || '') === workOrder) || {};

      return {
        ...row,
        recent_comments: recentComment,
        print_details: printDetail,
        wedge_rework: wedge,
        status_info: statusInfo,
        misc,
        kanban_info: kanban,
      };
    });
  }

  private statusClass(dueBy: string, today: string): { status_text: string; status_class: string } {
    if (dueBy === today) {
      return { status_text: 'Due Today', status_class: 'badge badge-warning' };
    }

    if (dueBy > today) {
      return { status_text: 'Future Order', status_class: 'badge badge-success' };
    }

    return { status_text: 'Past Due', status_class: 'badge badge-danger' };
  }

  private async getKanban(workOrders: string[]): Promise<KanbanRow[]> {
    if (!workOrders.length) {
      return [];
    }

    const placeholders = workOrders.map(() => '?').join(', ');
    const sql = `
      SELECT *
      FROM eyefidb.kanban_details a
      WHERE a.wo_nbr IN (${placeholders})
    `;
    return this.mysqlService.query<RowDataPacket[]>(sql, workOrders) as unknown as KanbanRow[];
  }

  private async getMiscInfoBySalesOrderNumbers(soValues: string[]): Promise<MiscRow[]> {
    if (!soValues.length) {
      return [];
    }

    const placeholders = soValues.map(() => '?').join(', ');
    const sql = `
      SELECT *
      FROM eyefidb.workOrderOwner a
      WHERE a.so IN (${placeholders})
    `;
    return this.mysqlService.query<RowDataPacket[]>(sql, soValues) as unknown as MiscRow[];
  }

  private async getWedgeReworkByWorkOrders(workOrders: string[]): Promise<WedgeReworkRow[]> {
    if (!workOrders.length) {
      return [];
    }

    const placeholders = workOrders.map(() => '?').join(', ');
    const sql = `
      SELECT a.*, CONCAT(first, ' ', b.last) created_by_name
      FROM eyefidb.wedge_form a
      LEFT JOIN db.users b ON b.id = a.created_by
      WHERE work_order_number IN (${placeholders})
    `;
    return this.mysqlService.query<RowDataPacket[]>(sql, workOrders) as unknown as WedgeReworkRow[];
  }

  private async getCommentsByOrderNumbers(workOrders: string[]): Promise<CommentRow[]> {
    if (!workOrders.length) {
      return [];
    }

    const placeholders = workOrders.map(() => '?').join(', ');
    const sql = `
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
        GROUP BY orderNum
      ) b ON a.orderNum = b.orderNum AND a.id = b.id
      LEFT JOIN db.users c ON c.id = a.userId
      WHERE a.type = 'Work Order'
        AND a.orderNum IN (${placeholders})
        AND a.active = 1
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, workOrders) as unknown as CommentRow[];
  }

  private async getPrintDetails(workOrders: string[]): Promise<PrintDetailRow[]> {
    if (!workOrders.length) {
      return [];
    }

    const placeholders = workOrders.map(() => '?').join(', ');
    const sql = `
      SELECT a.id
        , a.assignedTo
        , a.printedDate
        , a.createdBy
        , a.workOrder
        , CONCAT(c.first, ' ', c.last) createdByName
        , comments
      FROM eyefidb.workOrderPrintDetails a
      INNER JOIN (
        SELECT workOrder
          , MAX(id) id
          , MAX(DATE(printedDate)) printedDate
        FROM eyefidb.workOrderPrintDetails
        GROUP BY workOrder
      ) b ON a.workOrder = b.workOrder AND a.id = b.id
      LEFT JOIN db.users c ON c.id = a.createdBy
      WHERE a.workOrder IN (${placeholders})
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, workOrders) as unknown as PrintDetailRow[];
  }

  private async getWoMstrByWorkOrderNumber(workOrderNumber: string): Promise<Record<string, unknown>> {
    const sql = `
      SELECT a.wo_so_job
        , a.wo_nbr
        , a.wo_lot
        , a.wo_ord_date
        , a.wo_due_date
        , a.wo_part
        , a.wo_qty_ord
        , CONCAT(c.pt_desc1, c.pt_desc2) pt_desc1
        , a.wo_order_sheet_printed
        , a.wo_status
        , a.wo_rmks
        , a.wo_line wo_line
        , a.wo_qty_comp
      FROM wo_mstr a
      LEFT JOIN pt_mstr c
        ON c.pt_part = a.wo_part
        AND pt_domain = 'EYE'
      WHERE a.wo_domain = 'EYE'
        AND a.wo_nbr = ?
      WITH (NOLOCK)
    `;

    const rows = await this.qadOdbcService.queryWithParams<Record<string, unknown>[]>(sql, [workOrderNumber], {
      keyCase: 'upper',
    });
    return rows[0] || {};
  }

  private async getWorkOrderDetailByWorkOrderNumber(workOrderNumber: string): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SELECT a.wod_nbr
        , a.wod_lot
        , a.wod_iss_date
        , a.wod_part
        , a.wod_qty_req wod_qty_req
        , a.wod_qty_pick wod_qty_pick
        , a.wod_qty_iss wod_qty_iss
        , a.wod_qty_all wod_qty_all
        , a.wod_nbr
        , CONCAT(c.pt_desc1, c.pt_desc2) pt_desc1
        , c.pt_um
        , c.pt_part_type
        , d.totalAvail
        , a.wod_qty_req - (a.wod_qty_pick + a.wod_qty_iss) short
        , CASE
            WHEN a.wod_qty_req = 0 THEN 100
            ELSE (a.wod_qty_iss / NULLIF(a.wod_qty_req, 0)) * 100
          END lineStatus
        , CASE
            WHEN a.wod_qty_req = 0 THEN 'text-success'
            WHEN (a.wod_qty_iss / NULLIF(a.wod_qty_req, 0)) * 100 = '100' THEN 'text-success'
          END lineStatusClass
        , wod_op
        , CASE
            WHEN c.pt_part_type = 'Hardware' OR c.pt_part_type = 'HDW' THEN 1
            ELSE 0
          END isHardware
      FROM wod_det a
      LEFT JOIN pt_mstr c
        ON c.pt_part = a.wod_part
        AND pt_domain = 'EYE'
      LEFT JOIN (
        SELECT b.in_part
          , SUM(b.in_qty_avail) totalAvail
          , SUM(b.in_qty_all) totalAll
          , SUM(b.in_qty_oh) totalOnHand
        FROM in_mstr b
        GROUP BY b.in_part
      ) d ON d.in_part = a.wod_part
      WHERE a.wod_nbr = ?
        AND wod_domain = 'EYE'
        AND a.wod_qty_req > 0
      ORDER BY a.wod_nbr ASC
      WITH (NOLOCK)
    `;

    return this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, [workOrderNumber], {
      keyCase: 'upper',
    });
  }

  private async getLocations(parts: string[]): Promise<Array<Record<string, unknown>>> {
    if (!parts.length) {
      return [];
    }

    const placeholders = parts.map(() => '?').join(', ');
    const sql = `
      SELECT CAST(a.ld_loc AS CHAR(25)) ld_loc
        , a.ld_part ld_part
        , a.ld_qty_oh ld_qty_oh
        , a.ld_qty_all ld_qty_all
        , a.ld_qty_oh - a.ld_qty_all availableQty
        , a.ld_lot
        , a.ld_ref
      FROM ld_det a
      WHERE a.ld_part IN (${placeholders})
        AND a.ld_domain = 'EYE'
        AND a.ld_qty_oh > 0
        AND a.ld_loc NOT IN ('JIAXING', 'PCREJ', 'REJECT', 'PROTO')
      ORDER BY CASE WHEN a.ld_loc = 'INTGRTD' THEN 0 END ASC
      WITH (NOLOCK)
    `;

    return this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, parts, {
      keyCase: 'upper',
    });
  }

  private async getLatestPrintDetailByWorkOrder(workOrderNumber: string): Promise<PrintDetailRow | null> {
    const sql = `
      SELECT a.id
        , a.assignedTo
        , a.printedDate
        , a.createdBy
        , a.workOrder
        , CONCAT(c.first, ' ', c.last) createdByName
        , comments
      FROM eyefidb.workOrderPrintDetails a
      INNER JOIN (
        SELECT workOrder
          , MAX(id) id
          , MAX(DATE(printedDate)) printedDate
        FROM eyefidb.workOrderPrintDetails
        GROUP BY workOrder
      ) b ON a.workOrder = b.workOrder AND a.id = b.id
      LEFT JOIN db.users c ON c.id = a.createdBy
      WHERE a.workOrder = ?
      LIMIT 1
    `;

    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [workOrderNumber]);
    return (rows[0] as unknown as PrintDetailRow) || null;
  }

}
