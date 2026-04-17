import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { BaseRepository } from '@/shared/repositories';

@Injectable()
export class RfqRepository extends BaseRepository<RowDataPacket> {
  private static readonly ALLOWED_COLUMNS = [
    'id',
    'created_date',
    'created_by',
    'active',
    'full_name',
    'emailToSendTo',
    'ccEmails',
    'bbEmails',
    'vendor',
    'subjectLine',
    'sod_nbr',
    'shipperName',
    'address',
    'city',
    'state',
    'zip',
    'phone',
    'requestorName',
    'contactName',
    'shippingHours',
    'readyDateTime',
    'puNumber',
    'poNumber',
    'poShippingFull',
    'appointmentRequired',
    'liftGateRequired',
    'bolFaxEmail',
    'dest_companyName',
    'dest_address',
    'dest_address2',
    'dest_city',
    'dest_state',
    'dest_zip',
    'dest_country',
    'dest_phone',
    'dest_contactName',
    'dest_deliveryNumber',
    'dest_deliveryDate',
    'dest_appointmentRequired',
    'descriptionOfProduct',
    'piecesQtyUoM',
    'piecesQty',
    'palletSizeInformationSendInfo',
    'weight',
    'value',
    'insuranceIncluded',
    'freightClass',
    'specialRequirements',
    'lines',
    'email_sent_date',
  ] as const;

  constructor(
    @Inject(MysqlService) mysqlService: MysqlService,
    @Inject(QadOdbcService) private readonly qadOdbcService: QadOdbcService,
  ) {
    super('rfq', mysqlService);
  }

  async getList(selectedViewType?: string): Promise<RowDataPacket[]> {
    const queryParams: unknown[] = [];
    let sql = 'SELECT * FROM rfq a WHERE 1 = 1';

    if (selectedViewType === 'Active') {
      sql += ' AND a.active = 1';
    } else if (selectedViewType === 'Inactive') {
      sql += ' AND a.active = 0';
    }

    sql += ' ORDER BY a.created_date DESC';

    return this.rawQuery<RowDataPacket>(sql, queryParams);
  }

  async find(filters: Record<string, unknown>): Promise<RowDataPacket[]> {
    const safeFilters = Object.fromEntries(
      Object.entries(filters).filter(([key]) =>
        (RfqRepository.ALLOWED_COLUMNS as readonly string[]).includes(key),
      ),
    );
    return super.find(safeFilters);
  }

  async getAll(selectedViewType?: string): Promise<RowDataPacket[]> {
    if (selectedViewType === 'Active') {
      return super.find({ active: 1 });
    }
    if (selectedViewType === 'Inactive') {
      const sql = 'SELECT * FROM rfq WHERE active = 0 OR active IS NULL';
      return this.rawQuery<RowDataPacket>(sql);
    }
    return this.rawQuery<RowDataPacket>('SELECT * FROM rfq');
  }

  async getById(id: number): Promise<RowDataPacket | null> {
    return super.findOne({ id });
  }

  async create(payload: Record<string, unknown>): Promise<number> {
    const safePayload = this.getSafePayload(payload);
    return super.create(safePayload);
  }

  async updateById(id: number, payload: Record<string, unknown>): Promise<number> {
    const safePayload = this.getSafePayload(payload);
    if (Object.keys(safePayload).length === 0) {
      return 0;
    }
    return super.updateById(id, safePayload);
  }

  async deleteById(id: number): Promise<number> {
    return super.deleteById(id);
  }

  async touchEmailSentDate(id: number): Promise<number> {
    const sql = 'UPDATE rfq SET email_sent_date = NOW() WHERE id = ?';
    const result = await this.rawQuery<RowDataPacket>(sql, [id]);
    return Array.isArray(result) ? 1 : 0;
  }

  async readBySalesOrder(so: string): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SELECT a.sod_nbr,
        a.sod_due_date,
        a.sod_due_date - c.so_ord_date AS leadTime,
        a.sod_part,
        a.sod_qty_ord,
        a.sod_qty_ship,
        a.sod_price,
        a.sod_contr_id,
        a.sod_domain,
        a.sod_compl_stat,
        a.sod_price * (a.sod_qty_ord - a.sod_qty_ship) AS open_balance,
        a.sod_qty_ord - a.sod_qty_ship AS qty_open,
        a.sod_qty_all,
        CASE
          WHEN b.pt_part IS NULL THEN a.sod_desc
          ELSE b.fullDesc
        END AS fullDesc,
        c.so_cust,
        a.sod_line,
        c.so_ord_date,
        c.so_ship,
        CASE
          WHEN a.sod_due_date < CURDATE() THEN 'Past Due'
          WHEN a.sod_due_date = CURDATE() THEN 'Due Today'
          WHEN a.sod_due_date > CURDATE() THEN 'Future Order'
        END AS status,
        CASE
          WHEN a.sod_due_date < CURDATE() THEN 'badge badge-danger'
          WHEN a.sod_due_date = CURDATE() THEN 'badge badge-warning'
          WHEN a.sod_due_date > CURDATE() THEN 'badge badge-success'
        END AS statusClass,
        a.sod_order_category,
        a.sod_custpart AS cp_cust_part,
        IFNULL(e.ld_qty_oh, 0) AS ld_qty_oh,
        c.so_bol,
        a.sod_cmtindx AS so_cmtindx,
        b.pt_routing,
        CURDATE() - a.sod_due_date AS age,
        a.sod_list_pr,
        cm.cmt_cmmt,
        a.sod_part AS work_order_routing,
        a.sod_acct,
        ad.ad_line1,
        ad.ad_sort,
        ad.ad_zip,
        ad.ad_state,
        ad.ad_city,
        ad.ad_ref,
        ad.ad_name,
        ad.ad_addr,
        ad.ad_line2,
        ad.ad_country
      FROM sod_det a
      LEFT JOIN (
        SELECT pt_part,
          MAX(CONCAT(pt_desc1, pt_desc2)) AS fullDesc,
          MAX(pt_routing) AS pt_routing
        FROM pt_mstr
        WHERE pt_domain = 'EYE'
        GROUP BY pt_part
      ) b ON b.pt_part = a.sod_part
      LEFT JOIN (
        SELECT so_nbr,
          so_cust,
          so_ord_date,
          so_ship,
          so_bol,
          so_cmtindx
        FROM so_mstr
        WHERE so_domain = 'EYE'
      ) c ON c.so_nbr = a.sod_nbr
      LEFT JOIN (
        SELECT a.ld_part,
          SUM(a.ld_qty_oh) AS ld_qty_oh
        FROM ld_det a
        JOIN loc_mstr b ON b.loc_loc = a.ld_loc
          AND b.loc_type = 'FG'
          AND b.loc_domain = 'EYE'
        WHERE a.ld_domain = 'EYE'
        GROUP BY a.ld_part
      ) e ON e.ld_part = a.sod_part
      LEFT JOIN (
        SELECT cmt_cmmt,
          cmt_indx
        FROM cmt_det
        WHERE cmt_domain = 'EYE'
      ) cm ON cm.cmt_indx = a.sod_cmtindx
      LEFT JOIN (
        SELECT ad_addr,
          ad_name,
          ad_ref,
          ad_line1,
          ad_city,
          ad_state,
          ad_zip,
          ad_sort,
          ad_line2,
          ad_country
        FROM ad_mstr
        WHERE ad_domain = 'EYE'
      ) ad ON ad.ad_addr = c.so_ship
      WHERE a.sod_domain = 'EYE'
        AND a.sod_nbr = ?
      ORDER BY a.sod_due_date ASC
    `;

    return this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(sql, [so]);
  }

  private getSafePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) => (RfqRepository.ALLOWED_COLUMNS as readonly string[]).includes(key) && key !== 'id',
      ),
    );
  }
}
