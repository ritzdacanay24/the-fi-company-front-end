import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

@Injectable()
export class MaterialRequestRepository extends BaseRepository<RowDataPacket> {
  private static readonly ALLOWED_COLUMNS = [
    'id',
    'requestor',
    'lineNumber',
    'pickList',
    'dueDate',
    'specialInstructions',
    'createdBy',
    'createdDate',
    'active',
    'pickedCompletedDate',
    'priority',
    'validated',
    'queue_status',
    'deleteReason',
    'deleteReasonDate',
    'deleteReasonBy',
    'info',
    'assemblyNumber',
    'isCableRequest',
    'modifiedDate',
  ] as const;

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('mrf', mysqlService);
  }

  async getList(params: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll: boolean;
  }): Promise<RowDataPacket[]> {
    const queryParams: unknown[] = [];
    let sql = 'SELECT * FROM mrf a WHERE 1 = 1';

    if (!params.isAll && params.dateFrom && params.dateTo) {
      sql += ' AND DATE(a.createdDate) BETWEEN ? AND ?';
      queryParams.push(params.dateFrom, params.dateTo);
    }

    if (params.selectedViewType === 'Open') {
      sql += ' AND a.active = 1 AND a.pickedCompletedDate IS NULL';
    } else if (params.selectedViewType === 'Closed') {
      sql += ' AND a.active = 1 AND a.pickedCompletedDate IS NOT NULL';
    }

    sql += ' ORDER BY a.createdDate DESC';
    return this.rawQuery<RowDataPacket>(sql, queryParams);
  }

  async find(filters: Record<string, unknown>): Promise<RowDataPacket[]> {
    const safeFilters = Object.fromEntries(
      Object.entries(filters).filter(([key]) =>
        (MaterialRequestRepository.ALLOWED_COLUMNS as readonly string[]).includes(key),
      ),
    );
    return super.find(safeFilters);
  }

  async getAll(): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>('SELECT * FROM mrf');
  }

  async getById(id: number): Promise<RowDataPacket | null> {
    return super.findOne({ id });
  }

  async createHeader(payload: Record<string, unknown>): Promise<number> {
    return super.create(this.getSafeHeaderPayload(payload));
  }

  async updateHeader(id: number, payload: Record<string, unknown>): Promise<number> {
    const safePayload = this.getSafeHeaderPayload(payload);
    if (Object.keys(safePayload).length === 0) {
      return 0;
    }
    return super.updateById(id, safePayload);
  }

  async deleteById(id: number): Promise<number> {
    return super.deleteById(id);
  }

  async getValidation(): Promise<RowDataPacket[]> {
    const sql = `
      SELECT *
      FROM mrf
      WHERE active = 1
        AND validated IS NULL
    `;
    return this.rawQuery<RowDataPacket>(sql);
  }

  async getPicking(): Promise<RowDataPacket[]> {
    const sql = `
      SELECT a.*, b.printedBy, b.printedDate, b.notes,
        TIMESTAMPDIFF(SECOND, b.printedDate, NOW()) AS timeDiff
      FROM mrf a
      LEFT JOIN (
        SELECT MAX(printedBy) AS printedBy,
          MAX(printedDate) AS printedDate,
          MAX(notes) AS notes,
          mrf_id
        FROM mrf_det
        WHERE qty != qtyPicked
        GROUP BY mrf_id
      ) b ON b.mrf_id = a.id
      WHERE a.validated IS NOT NULL
        AND a.pickedCompletedDate IS NULL
        AND a.active = 1
      ORDER BY CASE WHEN a.priority = 'true' THEN 1 END DESC,
        a.createdDate ASC
    `;

    const headers = await this.rawQuery<RowDataPacket>(sql);
    if (headers.length === 0) {
      return [];
    }

    const ids = headers.map((h) => h.id).filter(Boolean);
    const placeholders = ids.map(() => '?').join(',');
    const details = await this.rawQuery<RowDataPacket>(
      `SELECT *, qty AS openQty, UPPER(partNumber) AS partNumberUpper FROM mrf_det WHERE mrf_id IN (${placeholders})`,
      ids,
    );

    const detailsByMrf = new Map<number, RowDataPacket[]>();
    for (const detail of details) {
      const mrfId = Number(detail.mrf_id);
      if (!detailsByMrf.has(mrfId)) {
        detailsByMrf.set(mrfId, []);
      }
      detailsByMrf.get(mrfId)?.push({ ...detail, shortDetail: false, locations: [] });
    }

    return headers.map((header) => {
      const headerId = Number(header.id);
      const groupedDetails = detailsByMrf.get(headerId) || [];
      const shortFound = groupedDetails.reduce((sum, d) => sum + Number(d.openQty || 0), 0);
      return {
        ...header,
        shortFound,
        details: groupedDetails,
      };
    });
  }

  async clearPrint(details: Array<Record<string, unknown>>): Promise<number> {
    let rowCount = 0;
    for (const row of details) {
      const id = Number(row.id);
      if (!id) {
        continue;
      }
      const sql = 'UPDATE mrf_det SET printedBy = NULL, printedDate = NULL WHERE id = ?';
      const result = await this.mysqlService.execute<ResultSetHeader>(sql, [id]);
      rowCount += result.affectedRows;
    }
    return rowCount;
  }

  async applyPrint(details: Array<Record<string, unknown>>): Promise<number> {
    let rowCount = 0;
    for (const row of details) {
      const id = Number(row.id);
      if (!id) {
        continue;
      }
      const sql = 'UPDATE mrf_det SET printedBy = ?, printedDate = ? WHERE id = ?';
      const result = await this.mysqlService.execute<ResultSetHeader>(sql, [
        String(row.printedBy || ''),
        row.printedDate || null,
        id,
      ]);
      rowCount += result.affectedRows;
    }
    return rowCount;
  }

  async getPrintValidationInfo(mrfId: number): Promise<RowDataPacket | null> {
    const sql = `
      SELECT
        m.id,
        m.active,
        m.pickedCompletedDate,
        MAX(d.printedBy) AS printedBy
      FROM mrf m
      LEFT JOIN mrf_det d ON d.mrf_id = m.id
      WHERE m.id = ?
      GROUP BY m.id, m.active, m.pickedCompletedDate
      LIMIT 1
    `;

    const rows = await this.rawQuery<RowDataPacket>(sql, [mrfId]);
    return rows[0] || null;
  }

  async completePicking(id: number, details: Array<Record<string, unknown>>, pickedCompletedDate: string): Promise<number> {
    const mrfUpdate = await this.mysqlService.execute<ResultSetHeader>(
      'UPDATE mrf SET pickedCompletedDate = ? WHERE id = ?',
      [pickedCompletedDate || null, id],
    );

    for (const row of details) {
      const detailId = Number(row.id);
      if (!detailId) {
        continue;
      }
      await this.mysqlService.execute<ResultSetHeader>('UPDATE mrf_det SET qtyPicked = ? WHERE id = ?', [
        Number(row.qtyPicked || 0),
        detailId,
      ]);

      const qty = Number(row.qty || 0);
      const qtyPicked = Number(row.qtyPicked || 0);
      if (qty > 0 && qtyPicked !== qty) {
        await this.mysqlService.execute<ResultSetHeader>(
          `INSERT INTO shortageRequest (
            jobNumber, woNumber, lineNumber, dueDate, reasonPartNeeded, priority,
            assemblyNumber, mrfId, createdBy, partNumber, qty, comments, partDesc,
            graphicsShortage, mrf_line
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `${Date.now()}-${id}`,
            String((row as Record<string, unknown>).pickList || ''),
            String((row as Record<string, unknown>).lineNumber || ''),
            (row as Record<string, unknown>).dueDate || null,
            'Material request shortages',
            String((row as Record<string, unknown>).priority || ''),
            String((row as Record<string, unknown>).assemblyNumber || ''),
            id,
            Number(row.shortageCreatedBy || 0),
            String(row.partNumber || ''),
            Math.max(qty - qtyPicked, 0),
            '',
            String(row.itemDescription || ''),
            'false',
            detailId,
          ],
        );
      }
    }

    return mrfUpdate.affectedRows;
  }

  async sendBackToValidation(id: number): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>('UPDATE mrf SET validated = NULL WHERE id = ?', [
      id,
    ]);
    return result.affectedRows;
  }

  async getAllWithStatus(): Promise<RowDataPacket[]> {
    const sql = `
      SELECT m.id, m.requestor, m.lineNumber, m.dueDate, m.priority, m.createdDate,
        m.createdBy, m.validated, m.pickedCompletedDate, m.active, m.specialInstructions,
        m.assemblyNumber, m.isCableRequest, m.queue_status AS status,
        DATEDIFF(NOW(), m.createdDate) AS age_days,
        CONCAT(u.first, ' ', u.last) AS requester_name,
        u.department AS requester_department,
        COALESCE(det_stats.item_count, 0) AS item_count,
        COALESCE(det_stats.pending_validations, 0) AS pending_validations,
        COALESCE(det_stats.approved_items, 0) AS approved_items,
        COALESCE(det_stats.rejected_items, 0) AS rejected_items,
        COALESCE(review_stats.total_reviews, 0) AS total_reviews,
        COALESCE(review_stats.pending_reviews, 0) AS pending_reviews,
        CONCAT('MR-', LPAD(m.id, 6, '0')) AS request_number
      FROM mrf m
      LEFT JOIN db.users u ON m.createdBy = u.id
      LEFT JOIN (
        SELECT mrf_id,
          COUNT(*) AS item_count,
          SUM(CASE WHEN validationStatus = 'pending' THEN 1 ELSE 0 END) AS pending_validations,
          SUM(CASE WHEN validationStatus = 'approved' THEN 1 ELSE 0 END) AS approved_items,
          SUM(CASE WHEN validationStatus = 'rejected' THEN 1 ELSE 0 END) AS rejected_items
        FROM mrf_det
        GROUP BY mrf_id
      ) det_stats ON m.id = det_stats.mrf_id
      LEFT JOIN (
        SELECT md.mrf_id,
          COUNT(*) AS total_reviews,
          SUM(CASE WHEN mr.reviewStatus = 'pending_review' THEN 1 ELSE 0 END) AS pending_reviews
        FROM mrf_det_reviews mr
        INNER JOIN mrf_det md ON mr.mrf_det_id = md.id
        GROUP BY md.mrf_id
      ) review_stats ON m.id = review_stats.mrf_id
      WHERE m.active = 1
        AND m.queue_status NOT IN ('complete', 'cancelled')
      ORDER BY m.createdDate DESC
    `;

    return this.rawQuery<RowDataPacket>(sql);
  }

  async updateStatus(id: number, status: string, updatedBy?: number): Promise<RowDataPacket | null> {
    const sql = 'UPDATE mrf SET queue_status = ?, modifiedDate = NOW() WHERE id = ?';
    const params = [status, id];
    await this.mysqlService.execute<ResultSetHeader>(sql, params);
    return this.getById(id);
  }

  async getRequesterNotificationInfo(id: number): Promise<RowDataPacket | null> {
    const sql = `
      SELECT
        m.id,
        m.requestor,
        m.createdBy,
        m.queue_status,
        m.pickedCompletedDate,
        u.email AS requester_email,
        CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, '')) AS requester_name
      FROM mrf m
      LEFT JOIN db.users u ON u.id = m.createdBy
      WHERE m.id = ?
      LIMIT 1
    `;

    const rows = await this.rawQuery<RowDataPacket>(sql, [id]);
    return rows[0] || null;
  }

  async deleteLineItem(id: number): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>('DELETE FROM mrf_det WHERE id = ?', [id]);
    return result.affectedRows;
  }

  private getSafeHeaderPayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) =>
          (MaterialRequestRepository.ALLOWED_COLUMNS as readonly string[]).includes(key) && key !== 'id',
      ),
    );
  }
}



/**
 * 
 * START TRANSACTION;

-- 1) Preview how many rows will be inserted
SELECT COUNT(*) AS rows_to_insert
FROM mrf_det d
INNER JOIN mrf m ON d.mrf_id = m.id
LEFT JOIN shortageRequest sr ON sr.mrf_line = d.id
WHERE d.active = 1
  AND m.active = 1
  AND d.qty > 0
  AND COALESCE(d.qtyPicked, 0) < d.qty
  AND sr.id IS NULL
  AND m.pickedCompletedDate IS NOT NULL
  AND DATE(d.createdDate) > '2026-04-30' AND d.createdBy != 3;

-- 2) Insert backlog
INSERT INTO shortageRequest (
  jobNumber,
  woNumber,
  lineNumber,
  dueDate,
  reasonPartNeeded,
  priority,
  assemblyNumber,
  mrfId,
  createdBy,
  partNumber,
  qty,
  comments,
  partDesc,
  graphicsShortage,
  mrf_line
)
SELECT
  CONCAT('MRS-BACKFILL-20260515-', d.id) AS jobNumber,
  COALESCE(m.pickList, '') AS woNumber,
  COALESCE(m.lineNumber, '') AS lineNumber,
  m.dueDate,
  'Material request shortages' AS reasonPartNeeded,
  COALESCE(m.priority, '') AS priority,
  COALESCE(m.assemblyNumber, '') AS assemblyNumber,
  CAST(m.id AS CHAR) AS mrfId,
  CAST(COALESCE(NULLIF(m.createdBy, ''), '0') AS UNSIGNED) AS createdBy,
  COALESCE(d.partNumber, '') AS partNumber,
  GREATEST(d.qty - COALESCE(d.qtyPicked, 0), 0) AS qty,
  '' AS comments,
  COALESCE(d.description, '') AS partDesc,
  'false' AS graphicsShortage,
  d.id AS mrf_line
FROM mrf_det d
INNER JOIN mrf m ON d.mrf_id = m.id
LEFT JOIN shortageRequest sr ON sr.mrf_line = d.id
WHERE d.active = 1
  AND m.active = 1
  AND d.qty > 0
  AND COALESCE(d.qtyPicked, 0) < d.qty
  AND sr.id IS NULL
  AND m.pickedCompletedDate IS NOT NULL
  AND DATE(d.createdDate) > '2026-04-30' 
   AND d.createdBy != 3;

SELECT ROW_COUNT() AS inserted_rows;

-- 3) Verify what was added
SELECT id, jobNumber, mrf_line, partNumber, qty, createdDate
FROM shortageRequest
WHERE jobNumber LIKE 'MRS-BACKFILL-20260515-%'
ORDER BY id DESC;

COMMIT; can we include this as a backup incase no shortages were recorded. 
 * 
 */