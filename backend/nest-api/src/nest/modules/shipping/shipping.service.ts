import { Inject, Injectable } from '@nestjs/common';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { toJsonSafe } from '@/shared/utils/json-safe.util';
import { UserTransactionsService } from '../user-transactions/user-transactions.service';
import { WorkOrderOwnerService } from '../work-order-owner/work-order-owner.service';
import { CommentsService } from '../comments/comments.service';
import { NotesService } from '../notes/notes.service';
import { OwnersService } from '../owners/owners.service';

type GenericRow = Record<string, unknown>;

@Injectable()
export class ShippingService {
  constructor(
    @Inject(MysqlService) private readonly mysqlService: MysqlService,
    @Inject(QadOdbcService) private readonly qadOdbcService: QadOdbcService,
    @Inject(UserTransactionsService) private readonly userTransactionsService: UserTransactionsService,
    @Inject(WorkOrderOwnerService) private readonly workOrderOwnerService: WorkOrderOwnerService,
    @Inject(CommentsService) private readonly commentsService: CommentsService,
    @Inject(NotesService) private readonly notesService: NotesService,
    @Inject(OwnersService) private readonly ownersService: OwnersService,
  ) {}

  async readOpenReport(): Promise<GenericRow[]> {
    const base = await this.getShippingInfo();
    if (!base.length) {
      return [];
    }

    const ids = base
      .map((row) => `${String(row.SOD_NBR || '').trim()}-${String(row.SOD_LINE || '').trim()}`)
      .filter(Boolean);

    const [comments, miscRows, noteRows, ownerChanges, allMentionComments, ownerProductionMap] =
      await Promise.all([
        this.commentsService.getForShippingByOrderNumbers(ids),
        this.workOrderOwnerService.getBySoArray(ids),
        this.notesService.getLatestByUniqueIds(ids),
        this.userTransactionsService.getChangesToday('Sales Order Shipping', 'New Sales Order Usr Input'),
        this.commentsService.getMentionsByOrderNumbers(ids),
        this.ownersService.getProductionStatusMap(),
      ]);

    const commentMap = new Map(comments.map((row) => [String(row.orderNum), row]));
    const miscMap = new Map(miscRows.map((row) => [String(row.so), row]));
    const noteMap = new Map(noteRows.map((row) => [String(row.uniqueId), row]));
    const ownerChangesMap = new Map(ownerChanges.map((row) => [String(row.so), row]));
    const mentionMap = new Map(allMentionComments.map((row) => [String(row.orderNum), row]));

    const mapped = base.map((row) => {
      const lineKey = String(row.SALES_ORDER_LINE_NUMBER || `${row.SOD_NBR}-${row.SOD_LINE}`);
      const misc = miscMap.get(lineKey) || {};

      const userName = String((misc as GenericRow).userName || '').trim();
      const ownerUpper = userName.toUpperCase();
      const ownerIsProduction = ownerUpper ? Boolean(ownerProductionMap[ownerUpper]) : false;

      const normalizedMisc = {
        ...(misc as GenericRow),
        owner_is_production: ownerIsProduction,
        owner_name: userName || null,
      };

      return {
        ...row,
        id: `${row.SOD_NBR}${row.SOD_LINE}`,
        sales_order_line_number: lineKey,
        SOD_CONTR_ID: String(row.SOD_CONTR_ID || '').replace(/[^a-zA-Z0-9_-]/g, ''),
        CMT_CMMT: String(row.CMT_CMMT || '')
          .replace(/;/g, '')
          .replace(/[^a-zA-Z0-9_-]/g, ' '),
        recent_notes: noteMap.get(lineKey) || {},
        recent_comments: commentMap.get(lineKey) || {},
        misc: normalizedMisc,
        recent_owner_changes: ownerChangesMap.get(lineKey) || {},
        all_mention_comments: mentionMap.get(lineKey) || {},
        owner_name: userName || null,
        owner_is_production: ownerIsProduction,
      };
    });

    return toJsonSafe(mapped) as GenericRow[];
  }

  async saveMisc(payload: Record<string, unknown>): Promise<GenericRow> {
    const so = String(payload.so || '').trim();
    if (!so) {
      throw new Error('So not provided');
    }

    const userId = Number(payload.lastModUser || payload.createdBy || 0) || 0;

    return this.mysqlService.withTransaction(async (connection: PoolConnection) => {
      const oldRow = await this.workOrderOwnerService.getBySo(so, connection);

      if (oldRow) {
        await this.workOrderOwnerService.updateWithAudit(oldRow, payload, userId, connection);
      } else {
        await this.workOrderOwnerService.createWithAudit(payload, userId, connection);
      }

      const updated = await this.workOrderOwnerService.getBySo(so, connection);
      return (updated || {}) as GenericRow;
    });
  }

  private nowDateTime(): string {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }


  private async getShippingInfo(): Promise<GenericRow[]> {
    const sql = `
      SELECT a.sod_nbr sod_nbr
        , a.sod_due_date sod_due_date
        , a.sod_due_date-c.so_ord_date leadTime
        , a.sod_part sod_part
        , a.sod_qty_ord sod_qty_ord
        , a.sod_qty_ship sod_qty_ship
        , a.sod_price sod_price
        , a.sod_contr_id sod_contr_id
        , a.sod_domain sod_domain
        , a.sod_compl_stat sod_compl_stat
        , a.sod_price*(a.sod_qty_ord-a.sod_qty_ship) openBalance
        , a.sod_qty_ord-a.sod_qty_ship qtyOpen
        , a.sod_qty_all sod_qty_all
        , CASE WHEN b.pt_part IS NULL THEN a.sod_desc ELSE b.fullDesc END fullDesc
        , c.so_cust so_cust
        , a.sod_line sod_line
        , c.so_ord_date so_ord_date
        , LTRIM(RTRIM(c.so_ship)) so_ship
        , LTRIM(RTRIM(CASE
            WHEN a.sod_due_date < curdate() THEN 'Past Due'
            WHEN a.sod_due_date = curdate() THEN 'Due Today'
            WHEN a.sod_due_date > curdate() THEN 'Future Order'
          END)) status
        , RTRIM(LTRIM(CASE
            WHEN a.sod_due_date < curdate() THEN 'badge badge-danger'
            WHEN a.sod_due_date = curdate() THEN 'badge badge-warning'
            WHEN a.sod_due_date > curdate() THEN 'badge badge-success'
          END)) statusClass
        , sod_order_category sod_order_category
        , a.sod_custpart cp_cust_part
        , IFNULL(e.ld_qty_oh, 0) ld_qty_oh
        , c.so_bol so_bol
        , sod_cmtindx so_cmtindx
        , pt_routing pt_routing
        , curdate()-a.sod_due_date age
        , a.sod_list_pr sod_list_pr
        , f.cmt_cmmt
        , a.sod_part work_order_routing
        , a.sod_acct
        , RTRIM(LTRIM(c.so_shipvia)) so_shipvia
        , a.sod_nbr || '-' || RTRIM(LTRIM(TO_CHAR(a.sod_line))) sales_order_line_number
        , b.pt_desc1
        , b.pt_desc2
        , a.sod_per_date
        , a.sod_type
        , c.oid_so_order_date
        , c.oid_so_order_time
        , oid_so_mstr
        , a.sod_req_date
        , a.sod_req_date-a.sod_due_date req_due_diff
        , wo_nbr
        , pt_rev
      FROM sod_det a
      LEFT JOIN (
        SELECT pt_part
          , MAX(pt_desc1) pt_desc1
          , MAX(pt_desc2) pt_desc2
          , MAX(CONCAT(pt_desc1, pt_desc2)) fullDesc
          , MAX(pt_routing) pt_routing
          , MAX(pt_rev) pt_rev
        FROM pt_mstr
        WHERE pt_domain = 'EYE'
        GROUP BY pt_part
      ) b ON b.pt_part = a.sod_part
      JOIN (
        SELECT so_nbr
          , so_cust
          , so_ord_date
          , so_ship
          , so_bol
          , so_cmtindx
          , so_compl_date
          , so_shipvia
          , LEFT(TO_CHAR(oid_so_mstr), 8) oid_so_order_date
          , RIGHT(TO_CHAR(ROUND(oid_so_mstr,0)), 10) oid_so_order_time
          , oid_so_mstr
        FROM so_mstr
        WHERE so_domain = 'EYE'
      ) c ON c.so_nbr = a.sod_nbr
      LEFT JOIN (
        SELECT a.ld_part
          , SUM(a.ld_qty_oh) ld_qty_oh
        FROM ld_det a
        JOIN loc_mstr b ON b.loc_loc = a.ld_loc
          AND b.loc_type = 'FG'
          AND loc_domain = 'EYE'
        WHERE a.ld_domain = 'EYE'
          AND ld_status != 'UA'
        GROUP BY a.ld_part
      ) e ON e.ld_part = a.sod_part
      LEFT JOIN (
        SELECT cmt_cmmt
          , cmt_indx
        FROM cmt_det
        WHERE cmt_domain = 'EYE'
      ) f ON f.cmt_indx = a.sod_cmtindx
      LEFT JOIN (
        SELECT MAX(wo_nbr) wo_nbr
          , wo_so_job
        FROM wo_mstr
        GROUP BY wo_so_job
      ) wo ON wo.wo_so_job = a.sod_nbr
      WHERE sod_domain = 'EYE'
        AND sod_qty_ord != sod_qty_ship
        AND so_compl_date IS NULL
        AND sod_project = ''
      ORDER BY a.sod_due_date ASC
      WITH (NOLOCK)
    `;

    return this.qadOdbcService.query<GenericRow[]>(sql, { keyCase: 'upper' });
  }
}
