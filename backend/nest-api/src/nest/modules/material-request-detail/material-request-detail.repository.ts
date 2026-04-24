import { Inject, Injectable } from '@nestjs/common';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

type ReviewFilters = {
  id?: number;
  reviewerId?: number;
  department?: string;
  reviewStatus?: string;
  priority?: string;
  page?: number;
  limit?: number;
};

type CreateReviewPayload = {
  mrf_det_id: number;
  reviewerId: number;
  department: string;
  sentForReviewBy: number;
  reviewStatus?: string;
  reviewNote?: string | null;
  reviewPriority?: string;
};

type UpdateReviewPayload = {
  reviewStatus?: string | null;
  reviewNote?: string | null;
  reviewPriority?: string | null;
  reviewDecision?: string | null;
  reviewComment?: string | null;
  reviewedAt?: string | null;
  department?: string | null;
};

type ReviewActionPayload = Record<string, unknown>;

type ReviewActionResult = {
  message: string;
  [key: string]: unknown;
};

@Injectable()
export class MaterialRequestDetailRepository extends BaseRepository<RowDataPacket> {
  private static readonly ALLOWED_COLUMNS = [
    'id',
    'mrf_id',
    'partNumber',
    'qty',
    'createdDate',
    'createdBy',
    'qtyPicked',
    'printedBy',
    'printedDate',
    'pickCompletedDate',
    'trType',
    'ac_code',
    'reasonCode',
    'locationPickFrom',
    'active',
    'deleteReason',
    'deleteReasonDate',
    'deleteReasonBy',
    'cost',
    'notes',
    'shortage_id',
    'isDuplicate',
    'message',
    'availableQty',
    'description',
    'hasError',
    'validationStatus',
    'validationComment',
    'validatedBy',
    'validatedAt',
    'modifiedDate',
  ] as const;

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('mrf_det', mysqlService);
  }

  async find(filters: Record<string, unknown>): Promise<RowDataPacket[]> {
    const safeFilters = Object.fromEntries(
      Object.entries(filters).filter(([key]) =>
        (MaterialRequestDetailRepository.ALLOWED_COLUMNS as readonly string[]).includes(key),
      ),
    );
    return super.find(safeFilters);
  }

  async create(payload: Record<string, unknown>): Promise<number> {
    return super.create(this.getSafePayload(payload));
  }

  async updateById(id: number, payload: Record<string, unknown>): Promise<number> {
    const safePayload = this.getSafePayload(payload);
    if (Object.keys(safePayload).length === 0) {
      return 0;
    }
    return super.updateById(id, safePayload);
  }

  async getValidationStats(mrfId: number): Promise<Record<string, unknown>> {
    const statisticsRows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          COUNT(*) AS total_items,
          SUM(CASE WHEN validationStatus = 'approved' THEN 1 ELSE 0 END) AS approved_count,
          SUM(CASE WHEN validationStatus = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
          SUM(CASE WHEN validationStatus = 'pending' OR validationStatus IS NULL THEN 1 ELSE 0 END) AS pending_count,
          ROUND((SUM(CASE WHEN validationStatus = 'approved' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100, 2) AS approval_percentage,
          ROUND((SUM(CASE WHEN validationStatus IN ('approved', 'rejected') THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100, 2) AS completion_percentage
        FROM mrf_det
        WHERE mrf_id = ? AND active = 1
      `,
      [mrfId],
    );

    const reviewStatisticsRows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          COUNT(DISTINCT r.mrf_det_id) AS items_with_reviews,
          COUNT(*) AS total_reviews_assigned,
          SUM(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 ELSE 0 END) AS pending_review_count,
          SUM(CASE WHEN r.reviewDecision = 'approved' THEN 1 ELSE 0 END) AS review_approved_count,
          SUM(CASE WHEN r.reviewDecision = 'rejected' THEN 1 ELSE 0 END) AS review_rejected_count,
          SUM(CASE WHEN r.reviewDecision = 'needs_clarification' THEN 1 ELSE 0 END) AS needs_clarification_count
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON md.id = r.mrf_det_id
        WHERE md.mrf_id = ? AND r.active = 1
      `,
      [mrfId],
    );

    const reviewers = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          r.reviewerId,
          TRIM(CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, ''))) AS reviewerName,
          r.department,
          COUNT(*) AS items_assigned,
          SUM(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 ELSE 0 END) AS pending_items,
          SUM(CASE WHEN r.reviewDecision IS NOT NULL THEN 1 ELSE 0 END) AS completed_items,
          MAX(CASE r.reviewPriority
            WHEN 'urgent' THEN 4
            WHEN 'high' THEN 3
            WHEN 'normal' THEN 2
            WHEN 'low' THEN 1
            ELSE 0
          END) AS highest_priority
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON md.id = r.mrf_det_id
        LEFT JOIN users u ON u.id = r.reviewerId
        WHERE md.mrf_id = ? AND r.active = 1
        GROUP BY r.reviewerId, reviewerName, r.department
        ORDER BY pending_items DESC, highest_priority DESC, reviewerName ASC
      `,
      [mrfId],
    );

    const priorities = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          r.reviewPriority,
          COUNT(*) AS count
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON md.id = r.mrf_det_id
        WHERE md.mrf_id = ? AND r.reviewStatus = 'pending_review' AND r.active = 1
        GROUP BY r.reviewPriority
        ORDER BY ${this.priorityOrderSql('r.reviewPriority')}
      `,
      [mrfId],
    );

    const departments = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          r.department,
          COUNT(*) AS total_assigned,
          SUM(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 ELSE 0 END) AS pending_count,
          SUM(CASE WHEN r.reviewDecision = 'approved' THEN 1 ELSE 0 END) AS approved_count,
          SUM(CASE WHEN r.reviewDecision = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON md.id = r.mrf_det_id
        WHERE md.mrf_id = ? AND r.active = 1
        GROUP BY r.department
        ORDER BY pending_count DESC, r.department ASC
      `,
      [mrfId],
    );

    const statistics = {
      ...(statisticsRows[0] || {}),
      ...(reviewStatisticsRows[0] || {}),
    } as Record<string, number>;

    return {
      statistics,
      reviewers,
      priorities,
      departments,
      summary: {
        total_items: statistics.total_items || 0,
        validation_complete: (statistics.approved_count || 0) + (statistics.rejected_count || 0),
        validation_pending: statistics.pending_count || 0,
        reviews_assigned: statistics.total_reviews_assigned || 0,
        reviews_pending: statistics.pending_review_count || 0,
        items_with_reviews: statistics.items_with_reviews || 0,
      },
    };
  }

  async getReviewerDashboard(reviewerId: number): Promise<Record<string, unknown>> {
    const pendingReviews = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          r.*,
          md.partNumber,
          md.description,
          md.qty,
          md.reasonCode,
          mr.id AS requestNumber,
          mr.createdDate,
          mr.createdBy,
          mr.requestor,
          mr.lineNumber,
          mr.pickList,
          mr.dueDate,
          TRIM(CONCAT(COALESCE(u_req.first, ''), ' ', COALESCE(u_req.last, ''))) AS requestorName
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON md.id = r.mrf_det_id
        INNER JOIN mrf mr ON mr.id = md.mrf_id
        LEFT JOIN users u_req ON u_req.id = mr.createdBy
        WHERE r.reviewerId = ?
          AND r.reviewStatus = 'pending_review'
          AND r.active = 1
        ORDER BY ${this.priorityOrderSql('r.reviewPriority')}, r.sentForReviewAt ASC
      `,
      [reviewerId],
    );

    const completedReviews = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          r.*,
          md.partNumber,
          md.description,
          md.qty,
          mr.id AS requestNumber,
          mr.requestor
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON md.id = r.mrf_det_id
        INNER JOIN mrf mr ON mr.id = md.mrf_id
        WHERE r.reviewerId = ?
          AND r.reviewDecision IS NOT NULL
          AND r.reviewedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND r.active = 1
        ORDER BY r.reviewedAt DESC
        LIMIT 20
      `,
      [reviewerId],
    );

    const summaryRows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          COUNT(*) AS total_assigned,
          SUM(CASE WHEN reviewStatus = 'pending_review' THEN 1 ELSE 0 END) AS pending_count,
          SUM(CASE WHEN DATE(reviewedAt) = CURDATE() THEN 1 ELSE 0 END) AS completed_today,
          SUM(CASE WHEN reviewStatus = 'pending_review' AND reviewPriority = 'urgent' THEN 1 ELSE 0 END) AS urgent_pending,
          SUM(CASE WHEN reviewStatus = 'pending_review' AND reviewPriority = 'high' THEN 1 ELSE 0 END) AS high_pending,
          SUM(CASE WHEN reviewDecision IS NOT NULL THEN 1 ELSE 0 END) AS completed_count
        FROM mrf_det_reviews
        WHERE reviewerId = ? AND active = 1
      `,
      [reviewerId],
    );

    return {
      pendingReviews,
      completedReviews,
      urgentItems: pendingReviews.filter((review) => ['urgent', 'high'].includes(String(review.reviewPriority || ''))),
      summary: summaryRows[0] || {},
    };
  }

  async getReviews(filters: ReviewFilters): Promise<RowDataPacket | RowDataPacket[] | Record<string, unknown> | null> {
    if (filters.id) {
      const rows = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT
            r.*,
            md.partNumber,
            md.description,
            md.qty,
            md.reasonCode,
            mr.id AS mrf_id,
            TRIM(CONCAT(COALESCE(u1.first, ''), ' ', COALESCE(u1.last, ''))) AS reviewerName,
            u1.email AS reviewerEmail,
            TRIM(CONCAT(COALESCE(u2.first, ''), ' ', COALESCE(u2.last, ''))) AS sentByName
          FROM mrf_det_reviews r
          INNER JOIN mrf_det md ON md.id = r.mrf_det_id
          INNER JOIN mrf mr ON mr.id = md.mrf_id
          LEFT JOIN users u1 ON u1.id = r.reviewerId
          LEFT JOIN users u2 ON u2.id = r.sentForReviewBy
          WHERE r.id = ? AND r.active = 1
          LIMIT 1
        `,
        [filters.id],
      );
      return rows[0] || null;
    }

    if (filters.reviewerId) {
      const conditions = ['r.reviewerId = ?', 'r.active = 1'];
      const params: unknown[] = [filters.reviewerId];

      if (filters.department) {
        conditions.push('r.department = ?');
        params.push(filters.department);
      }

      if (filters.reviewStatus) {
        conditions.push('r.reviewStatus = ?');
        params.push(filters.reviewStatus);
      }

      if (filters.priority) {
        conditions.push('r.reviewPriority = ?');
        params.push(filters.priority);
      }

      const items = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT
            r.*,
            md.partNumber,
            md.description,
            md.qty,
            md.reasonCode,
            md.availableQty,
            mr.id AS mrf_id,
            mr.requestor,
            TRIM(CONCAT(COALESCE(u1.first, ''), ' ', COALESCE(u1.last, ''))) AS requestorName
          FROM mrf_det_reviews r
          INNER JOIN mrf_det md ON md.id = r.mrf_det_id
          INNER JOIN mrf mr ON mr.id = md.mrf_id
          LEFT JOIN users u1 ON u1.id = mr.createdBy
          WHERE ${conditions.join(' AND ')}
          ORDER BY ${this.priorityOrderSql('r.reviewPriority')}, r.sentForReviewAt ASC
        `,
        params,
      );

      const summaryRows = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT
            COUNT(*) AS total_assigned,
            SUM(CASE WHEN reviewStatus = 'pending_review' THEN 1 ELSE 0 END) AS pending_count,
            SUM(CASE WHEN reviewDecision = 'approved' THEN 1 ELSE 0 END) AS approved_count,
            SUM(CASE WHEN reviewDecision = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
            SUM(CASE WHEN reviewStatus = 'needs_info' THEN 1 ELSE 0 END) AS needs_info_count,
            SUM(CASE WHEN reviewPriority = 'urgent' AND reviewStatus = 'pending_review' THEN 1 ELSE 0 END) AS urgent_pending,
            SUM(CASE WHEN reviewPriority = 'high' AND reviewStatus = 'pending_review' THEN 1 ELSE 0 END) AS high_pending
          FROM mrf_det_reviews
          WHERE reviewerId = ? AND active = 1
        `,
        [filters.reviewerId],
      );

      return {
        items,
        summary: summaryRows[0] || {},
      };
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = Math.max(page - 1, 0) * limit;
    const conditions = ['r.active = 1'];
    const params: unknown[] = [];

    if (filters.department) {
      conditions.push('r.department = ?');
      params.push(filters.department);
    }

    if (filters.reviewStatus) {
      conditions.push('r.reviewStatus = ?');
      params.push(filters.reviewStatus);
    }

    if (filters.priority) {
      conditions.push('r.reviewPriority = ?');
      params.push(filters.priority);
    }

    params.push(limit, offset);

    return this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          r.*,
          md.partNumber,
          md.description,
          md.qty,
          mr.id AS requestNumber,
          TRIM(CONCAT(COALESCE(u1.first, ''), ' ', COALESCE(u1.last, ''))) AS reviewerName,
          TRIM(CONCAT(COALESCE(u2.first, ''), ' ', COALESCE(u2.last, ''))) AS sentByName
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON md.id = r.mrf_det_id
        INNER JOIN mrf mr ON mr.id = md.mrf_id
        LEFT JOIN users u1 ON u1.id = r.reviewerId
        LEFT JOIN users u2 ON u2.id = r.sentForReviewBy
        WHERE ${conditions.join(' AND ')}
        ORDER BY r.sentForReviewAt DESC
        LIMIT ? OFFSET ?
      `,
      params,
    );
  }

  async createReview(payload: CreateReviewPayload): Promise<number> {
    return this.mysqlService.withTransaction(async (connection) => {
      const [itemRows] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM mrf_det WHERE id = ? AND active = 1 LIMIT 1',
        [payload.mrf_det_id],
      );

      if (itemRows.length === 0) {
        throw new Error('Material request detail item not found');
      }

      const [existingRows] = await connection.query<RowDataPacket[]>(
        `
          SELECT id
          FROM mrf_det_reviews
          WHERE mrf_det_id = ? AND reviewerId = ? AND department = ? AND active = 1
          LIMIT 1
        `,
        [payload.mrf_det_id, payload.reviewerId, payload.department],
      );

      if (existingRows.length > 0) {
        throw new Error('Active review already exists for this item/reviewer/department combination');
      }

      const [result] = await connection.execute<ResultSetHeader>(
        `
          INSERT INTO mrf_det_reviews (
            mrf_det_id,
            reviewerId,
            department,
            reviewStatus,
            reviewNote,
            reviewPriority,
            sentForReviewAt,
            sentForReviewBy,
            createdDate
          ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NOW())
        `,
        [
          payload.mrf_det_id,
          payload.reviewerId,
          payload.department,
          payload.reviewStatus || 'pending_review',
          payload.reviewNote || null,
          payload.reviewPriority || 'normal',
          payload.sentForReviewBy,
        ],
      );

      return result.insertId;
    });
  }

  async updateReview(id: number, payload: UpdateReviewPayload): Promise<number> {
    const fields: string[] = [];
    const values: unknown[] = [];

    const allowedFieldMap: Array<[keyof UpdateReviewPayload, string]> = [
      ['reviewStatus', 'reviewStatus = ?'],
      ['reviewNote', 'reviewNote = ?'],
      ['reviewPriority', 'reviewPriority = ?'],
      ['reviewDecision', 'reviewDecision = ?'],
      ['reviewComment', 'reviewComment = ?'],
      ['reviewedAt', 'reviewedAt = ?'],
      ['department', 'department = ?'],
    ];

    for (const [key, assignment] of allowedFieldMap) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        fields.push(assignment);
        values.push(payload[key] ?? null);
      }
    }

    if (payload.reviewDecision && !Object.prototype.hasOwnProperty.call(payload, 'reviewedAt')) {
      fields.push('reviewedAt = NOW()');
    }

    if (payload.reviewDecision && !Object.prototype.hasOwnProperty.call(payload, 'reviewStatus')) {
      fields.push('reviewStatus = ?');
      values.push(payload.reviewDecision === 'needs_clarification' ? 'needs_info' : 'reviewed');
    }

    if (fields.length === 0) {
      return 0;
    }

    fields.push('modifiedDate = NOW()');
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `UPDATE mrf_det_reviews SET ${fields.join(', ')} WHERE id = ? AND active = 1`,
      [...values, id],
    );

    return result.affectedRows;
  }

  async deleteReview(id: number, hardDelete = false): Promise<number> {
    if (hardDelete) {
      const result = await this.mysqlService.execute<ResultSetHeader>('DELETE FROM mrf_det_reviews WHERE id = ?', [id]);
      return result.affectedRows;
    }

    const result = await this.mysqlService.execute<ResultSetHeader>(
      'UPDATE mrf_det_reviews SET active = 0, modifiedDate = NOW() WHERE id = ? AND active = 1',
      [id],
    );
    return result.affectedRows;
  }

  async getItemReviews(itemId: number): Promise<RowDataPacket[]> {
    return this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          r.*,
          TRIM(CONCAT(COALESCE(u1.first, ''), ' ', COALESCE(u1.last, ''))) AS reviewerName,
          u1.email AS reviewerEmail,
          u1.department AS reviewerDepartment,
          TRIM(CONCAT(COALESCE(u2.first, ''), ' ', COALESCE(u2.last, ''))) AS sentByName
        FROM mrf_det_reviews r
        LEFT JOIN users u1 ON u1.id = r.reviewerId
        LEFT JOIN users u2 ON u2.id = r.sentForReviewBy
        WHERE r.mrf_det_id = ? AND r.active = 1
        ORDER BY ${this.priorityOrderSql('r.reviewPriority')}, r.sentForReviewAt ASC
      `,
      [itemId],
    );
  }

  async getBulkItemReviews(itemIds: number[]): Promise<Record<number, RowDataPacket[]>> {
    if (itemIds.length === 0) {
      return {};
    }

    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          r.*,
          TRIM(CONCAT(COALESCE(u1.first, ''), ' ', COALESCE(u1.last, ''))) AS reviewerName,
          u1.email AS reviewerEmail,
          u1.department AS reviewerDepartment,
          TRIM(CONCAT(COALESCE(u2.first, ''), ' ', COALESCE(u2.last, ''))) AS sentByName
        FROM mrf_det_reviews r
        LEFT JOIN users u1 ON u1.id = r.reviewerId
        LEFT JOIN users u2 ON u2.id = r.sentForReviewBy
        WHERE r.mrf_det_id IN (${itemIds.map(() => '?').join(', ')}) AND r.active = 1
        ORDER BY r.mrf_det_id ASC, ${this.priorityOrderSql('r.reviewPriority')}, r.sentForReviewAt ASC
      `,
      itemIds,
    );

    return rows.reduce<Record<number, RowDataPacket[]>>((accumulator, row) => {
      const itemId = Number(row.mrf_det_id);
      if (!accumulator[itemId]) {
        accumulator[itemId] = [];
      }
      accumulator[itemId].push(row);
      return accumulator;
    }, {});
  }

  async getBulkRequestReviews(requestIds: number[]): Promise<Record<number, Record<string, unknown>>> {
    if (requestIds.length === 0) {
      return {};
    }

    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          md.mrf_id AS requestId,
          COUNT(r.id) AS total_reviews_assigned,
          SUM(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 ELSE 0 END) AS pending_reviews,
          SUM(CASE WHEN r.reviewDecision = 'approved' THEN 1 ELSE 0 END) AS approved_reviews,
          SUM(CASE WHEN r.reviewDecision = 'rejected' THEN 1 ELSE 0 END) AS rejected_reviews,
          SUM(CASE WHEN r.reviewStatus = 'needs_info' THEN 1 ELSE 0 END) AS needs_info_reviews,
          GROUP_CONCAT(DISTINCT r.department ORDER BY r.department SEPARATOR ', ') AS reviewing_departments,
          MAX(CASE WHEN r.reviewStatus = 'pending_review' THEN
            CASE r.reviewPriority
              WHEN 'urgent' THEN 4
              WHEN 'high' THEN 3
              WHEN 'normal' THEN 2
              WHEN 'low' THEN 1
              ELSE 0
            END
            ELSE 0
          END) AS highest_pending_priority,
          CASE
            WHEN COUNT(r.id) = 0 THEN 'no_reviews_required'
            WHEN SUM(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 ELSE 0 END) > 0 THEN 'pending_reviews'
            WHEN SUM(CASE WHEN r.reviewStatus = 'needs_info' THEN 1 ELSE 0 END) > 0 THEN 'needs_information'
            WHEN SUM(CASE WHEN r.reviewDecision = 'rejected' THEN 1 ELSE 0 END) > 0 THEN 'rejected_by_reviewer'
            WHEN COUNT(r.id) = SUM(CASE WHEN r.reviewDecision = 'approved' THEN 1 ELSE 0 END) THEN 'all_reviews_approved'
            ELSE 'mixed_reviews'
          END AS overall_review_status
        FROM mrf_det md
        LEFT JOIN mrf_det_reviews r ON r.mrf_det_id = md.id AND r.active = 1
        WHERE md.mrf_id IN (${requestIds.map(() => '?').join(', ')})
        GROUP BY md.mrf_id
      `,
      requestIds,
    );

    return rows.reduce<Record<number, Record<string, unknown>>>((accumulator, row) => {
      accumulator[Number(row.requestId)] = row as unknown as Record<string, unknown>;
      return accumulator;
    }, {});
  }

  async getReviewHistory(itemId: number): Promise<RowDataPacket[]> {
    return this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          log.id,
          log.review_id,
          log.action,
          log.performed_by,
          log.details,
          log.created_at,
          r.mrf_det_id,
          TRIM(CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, ''))) AS performedByName
        FROM mrf_review_audit_log log
        INNER JOIN mrf_det_reviews r ON r.id = log.review_id
        LEFT JOIN users u ON u.id = log.performed_by
        WHERE r.mrf_det_id = ?
        ORDER BY log.created_at DESC, log.id DESC
      `,
      [itemId],
    );
  }

  async executeReviewAction(payload: ReviewActionPayload): Promise<ReviewActionResult> {
    const action = String(payload.action || '').trim();

    switch (action) {
      case 'bulk_assign':
        return this.bulkAssign(payload);
      case 'bulk_review':
        return this.bulkReview(payload);
      case 'department_summary':
        return this.departmentSummary(payload);
      case 'escalate_review':
        return this.escalateReview(payload);
      case 'request_clarification':
        return this.requestClarification(payload);
      default:
        throw new Error('Invalid action specified');
    }
  }

  async getAdminDashboard(): Promise<Record<string, unknown>> {
    const reviews = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          r.id,
          r.mrf_det_id AS itemId,
          r.reviewerId,
          r.reviewStatus,
          r.reviewDecision,
          r.reviewPriority,
          r.reviewNote,
          r.reviewComment,
          r.sentForReviewAt AS assignedDate,
          r.reviewedAt AS reviewedDate,
          DATEDIFF(NOW(), r.sentForReviewAt) AS daysOverdue,
          md.mrf_id AS requestId,
          CONCAT('MR-', LPAD(m.id, 6, '0')) AS requestNumber,
          md.partNumber,
          md.description,
          md.qty,
          md.validationStatus,
          m.requestor AS requestedBy,
          m.lineNumber,
          TRIM(CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, ''))) AS reviewerName,
          u.department AS reviewerDepartment
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON md.id = r.mrf_det_id
        INNER JOIN mrf m ON m.id = md.mrf_id
        LEFT JOIN users u ON u.id = r.reviewerId
        WHERE r.active = 1
        ORDER BY ${this.priorityOrderSql('r.reviewPriority')}, r.sentForReviewAt DESC
      `,
      [],
    );

    const summaryRows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          COUNT(*) AS total_reviews,
          SUM(CASE WHEN reviewStatus = 'pending_review' THEN 1 ELSE 0 END) AS pending_reviews,
          SUM(CASE WHEN reviewStatus = 'reviewed' AND reviewDecision = 'approved' THEN 1 ELSE 0 END) AS approved_reviews,
          SUM(CASE WHEN reviewStatus = 'reviewed' AND reviewDecision = 'rejected' THEN 1 ELSE 0 END) AS rejected_reviews,
          SUM(CASE WHEN reviewStatus = 'reviewed' AND reviewDecision = 'needs_clarification' THEN 1 ELSE 0 END) AS needs_clarification,
          SUM(CASE WHEN reviewStatus = 'pending_review' AND reviewPriority = 'urgent' THEN 1 ELSE 0 END) AS urgent_pending,
          SUM(CASE WHEN reviewStatus = 'pending_review' AND reviewPriority = 'high' THEN 1 ELSE 0 END) AS high_pending,
          SUM(CASE WHEN reviewStatus = 'pending_review' AND DATEDIFF(NOW(), sentForReviewAt) > 2 THEN 1 ELSE 0 END) AS overdue_reviews,
          ROUND(AVG(CASE WHEN reviewedAt IS NOT NULL THEN TIMESTAMPDIFF(HOUR, sentForReviewAt, reviewedAt) ELSE NULL END), 1) AS avg_review_time_hours
        FROM mrf_det_reviews
        WHERE active = 1
      `,
      [],
    );

    const departments = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT DISTINCT department
        FROM users
        WHERE active = 1 AND department IS NOT NULL AND department <> ''
        ORDER BY department ASC
      `,
      [],
    );

    const availableReviewers = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          id,
          TRIM(CONCAT(COALESCE(first, ''), ' ', COALESCE(last, ''))) AS name,
          department
        FROM users
        WHERE active = 1
        ORDER BY department ASC, first ASC, last ASC
      `,
      [],
    );

    return {
      success: true,
      reviews,
      summary: summaryRows[0] || {},
      departments: departments.map((row) => row.department).filter(Boolean),
      availableReviewers,
    };
  }

  async executeAdminReviewAction(payload: ReviewActionPayload): Promise<ReviewActionResult> {
    const action = String(payload.action || '').trim();

    switch (action) {
      case 'reassign_review':
        return this.reassignReview(payload);
      case 'send_reminder':
        return this.sendReminder(payload);
      case 'escalate_review':
        return this.adminEscalateReview(payload);
      case 'cancel_review':
        return this.cancelReview(payload);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private getSafePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) =>
          (MaterialRequestDetailRepository.ALLOWED_COLUMNS as readonly string[]).includes(key) && key !== 'id',
      ),
    );
  }

  private async bulkAssign(payload: ReviewActionPayload): Promise<ReviewActionResult> {
    const items = this.toNumberArray(payload.items);
    const assignments = Array.isArray(payload.assignments) ? payload.assignments : [];
    const sentBy = Number(payload.sentForReviewBy || 0);

    if (items.length === 0 || assignments.length === 0 || !sentBy) {
      throw new Error('Items, assignments, and sentForReviewBy are required');
    }

    return this.mysqlService.withTransaction(async (connection) => {
      const createdReviews: Array<Record<string, unknown>> = [];

      for (const itemId of items) {
        for (const assignment of assignments) {
          const reviewerId = Number((assignment as Record<string, unknown>).reviewerId || 0);
          const department = String((assignment as Record<string, unknown>).department || '').trim();

          if (!reviewerId || !department) {
            continue;
          }

          const [existingRows] = await connection.query<RowDataPacket[]>(
            `
              SELECT id
              FROM mrf_det_reviews
              WHERE mrf_det_id = ? AND reviewerId = ? AND department = ? AND active = 1
              LIMIT 1
            `,
            [itemId, reviewerId, department],
          );

          if (existingRows.length > 0) {
            continue;
          }

          const [result] = await connection.execute<ResultSetHeader>(
            `
              INSERT INTO mrf_det_reviews (
                mrf_det_id,
                reviewerId,
                department,
                reviewNote,
                reviewPriority,
                sentForReviewAt,
                sentForReviewBy,
                createdDate
              ) VALUES (?, ?, ?, ?, ?, NOW(), ?, NOW())
            `,
            [
              itemId,
              reviewerId,
              department,
              (assignment as Record<string, unknown>).reviewNote || null,
              (assignment as Record<string, unknown>).reviewPriority || 'normal',
              sentBy,
            ] as any[],
          );

          createdReviews.push({
            review_id: result.insertId,
            item_id: itemId,
            reviewer_id: reviewerId,
            department,
          });

          await this.insertAuditLog(connection, result.insertId, 'assigned', sentBy, {
            reviewer_id: reviewerId,
            department,
          });
        }
      }

      return {
        message: 'Bulk assignment completed',
        created_reviews: createdReviews,
        total_created: createdReviews.length,
      };
    });
  }

  private async bulkReview(payload: ReviewActionPayload): Promise<ReviewActionResult> {
    const reviewIds = this.toNumberArray(payload.reviewIds);
    const decision = String(payload.decision || '').trim();
    const comment = String(payload.comment || '');
    const reviewerId = Number(payload.reviewerId || 0);

    if (reviewIds.length === 0 || !['approved', 'rejected'].includes(decision) || !reviewerId) {
      throw new Error('Review IDs, valid decision, and reviewer ID are required');
    }

    return this.mysqlService.withTransaction(async (connection) => {
      const updatedReviews: number[] = [];

      for (const reviewId of reviewIds) {
        const [ownedRows] = await connection.query<RowDataPacket[]>(
          `
            SELECT id
            FROM mrf_det_reviews
            WHERE id = ? AND reviewerId = ? AND reviewStatus = 'pending_review' AND active = 1
            LIMIT 1
          `,
          [reviewId, reviewerId],
        );

        if (ownedRows.length === 0) {
          continue;
        }

        await connection.execute<ResultSetHeader>(
          `
            UPDATE mrf_det_reviews
            SET reviewStatus = 'reviewed',
                reviewDecision = ?,
                reviewComment = ?,
                reviewedAt = NOW(),
                modifiedDate = NOW()
            WHERE id = ?
          `,
          [decision, comment, reviewId] as any[],
        );

        updatedReviews.push(reviewId);
        await this.insertAuditLog(connection, reviewId, 'bulk_reviewed', reviewerId, {
          decision,
          comment,
        });
      }

      return {
        message: 'Bulk review completed',
        updated_reviews: updatedReviews,
        total_updated: updatedReviews.length,
        decision,
      };
    });
  }

  private async departmentSummary(payload: ReviewActionPayload): Promise<ReviewActionResult> {
    const mrfId = Number(payload.mrfId || 0);
    if (!mrfId) {
      throw new Error('Material request ID is required');
    }

    const departments = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          r.department,
          COUNT(*) AS total_assigned,
          SUM(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 ELSE 0 END) AS pending_count,
          SUM(CASE WHEN r.reviewDecision = 'approved' THEN 1 ELSE 0 END) AS approved_count,
          SUM(CASE WHEN r.reviewDecision = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
          SUM(CASE WHEN r.reviewStatus = 'needs_info' THEN 1 ELSE 0 END) AS needs_info_count,
          GROUP_CONCAT(DISTINCT TRIM(CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, ''))) SEPARATOR ', ') AS reviewers,
          AVG(CASE r.reviewPriority
            WHEN 'urgent' THEN 4
            WHEN 'high' THEN 3
            WHEN 'normal' THEN 2
            WHEN 'low' THEN 1
            ELSE 0
          END) AS avg_priority
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON md.id = r.mrf_det_id
        LEFT JOIN users u ON u.id = r.reviewerId
        WHERE md.mrf_id = ? AND r.active = 1
        GROUP BY r.department
        ORDER BY r.department ASC
      `,
      [mrfId],
    );

    return {
      message: 'Department summary loaded',
      departments,
      total_departments: departments.length,
    };
  }

  private async escalateReview(payload: ReviewActionPayload): Promise<ReviewActionResult> {
    const reviewId = Number(payload.reviewId || 0);
    const newReviewerId = Number(payload.newReviewerId || 0);
    const escalationReason = String(payload.escalationReason || '');
    const escalatedBy = Number(payload.escalatedBy || 0);

    if (!reviewId || !newReviewerId || !escalatedBy) {
      throw new Error('Review ID, new reviewer ID, and escalated by are required');
    }

    return this.mysqlService.withTransaction(async (connection) => {
      const originalReview = await this.getReviewForUpdate(connection, reviewId);

      await connection.execute<ResultSetHeader>(
        'UPDATE mrf_det_reviews SET active = 0, modifiedDate = NOW() WHERE id = ?',
        [reviewId] as any[],
      );

      const escalatedNote = `${String(originalReview.reviewNote || '')}${originalReview.reviewNote ? '\n\n' : ''}ESCALATED: ${escalationReason}`;
      const [result] = await connection.execute<ResultSetHeader>(
        `
          INSERT INTO mrf_det_reviews (
            mrf_det_id,
            reviewerId,
            department,
            reviewNote,
            reviewPriority,
            sentForReviewAt,
            sentForReviewBy,
            reviewComment,
            createdDate
          ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, NOW())
        `,
        [
          originalReview.mrf_det_id,
          newReviewerId,
          originalReview.department,
          escalatedNote,
          'high',
          escalatedBy,
          `Escalated from previous reviewer. Reason: ${escalationReason}`,
        ] as any[],
      );

      await this.insertAuditLog(connection, reviewId, 'escalated', escalatedBy, {
        new_reviewer_id: newReviewerId,
        reason: escalationReason,
        replacement_review_id: result.insertId,
      });

      return {
        message: 'Review escalated successfully',
        original_review_id: reviewId,
        new_review_id: result.insertId,
      };
    });
  }

  private async requestClarification(payload: ReviewActionPayload): Promise<ReviewActionResult> {
    const reviewId = Number(payload.reviewId || 0);
    const clarificationRequest = String(payload.clarificationRequest || '').trim();

    if (!reviewId || !clarificationRequest) {
      throw new Error('Review ID and clarification request are required');
    }

    const result = await this.mysqlService.execute<ResultSetHeader>(
      `
        UPDATE mrf_det_reviews
        SET reviewStatus = 'needs_info',
            reviewDecision = 'needs_clarification',
            reviewComment = ?,
            reviewedAt = NOW(),
            modifiedDate = NOW()
        WHERE id = ? AND active = 1
      `,
      [clarificationRequest, reviewId],
    );

    if (result.affectedRows === 0) {
      throw new Error('Review not found or already processed');
    }

    await this.insertAuditLog(this.mysqlService, reviewId, 'clarification_requested', null, {
      clarificationRequest,
    });

    return {
      message: 'Clarification request submitted successfully',
      review_id: reviewId,
    };
  }

  private async reassignReview(payload: ReviewActionPayload): Promise<ReviewActionResult> {
    const reviewId = Number(payload.reviewId || 0);
    const newReviewerId = Number(payload.newReviewerId || 0);
    const reason = String(payload.reassignReason || '');
    const reassignedBy = Number(payload.reassignedBy || 0) || null;

    if (!reviewId || !newReviewerId) {
      throw new Error('Review ID and new reviewer ID are required');
    }

    return this.mysqlService.withTransaction(async (connection) => {
      const [result] = await connection.execute<ResultSetHeader>(
        `
          UPDATE mrf_det_reviews
          SET reviewerId = ?,
              sentForReviewAt = NOW(),
              reviewNote = CONCAT(COALESCE(reviewNote, ''), ?, ?),
              modifiedDate = NOW()
          WHERE id = ? AND active = 1
        `,
        [newReviewerId, reason ? '\n[REASSIGNED] ' : '', reason, reviewId] as any[],
      );

      if (result.affectedRows === 0) {
        throw new Error('Review not found');
      }

      await this.insertAuditLog(connection, reviewId, 'reassigned', reassignedBy, {
        new_reviewer_id: newReviewerId,
        reason,
      });

      return {
        success: true,
        message: 'Review reassigned successfully',
      };
    });
  }

  private async sendReminder(payload: ReviewActionPayload): Promise<ReviewActionResult> {
    const reviewId = Number(payload.reviewId || 0);
    const sentBy = Number(payload.sentBy || 0) || null;

    if (!reviewId) {
      throw new Error('Review ID is required');
    }

    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          r.id,
          u.email AS reviewer_email,
          md.partNumber
        FROM mrf_det_reviews r
        LEFT JOIN users u ON u.id = r.reviewerId
        INNER JOIN mrf_det md ON md.id = r.mrf_det_id
        WHERE r.id = ?
        LIMIT 1
      `,
      [reviewId],
    );

    const review = rows[0];
    if (!review) {
      throw new Error('Review not found');
    }

    await this.insertAuditLog(this.mysqlService, reviewId, 'reminder_sent', sentBy, {
      reviewer_email: review.reviewer_email,
      part_number: review.partNumber,
    });

    return {
      success: true,
      message: 'Reminder sent successfully',
    };
  }

  private async adminEscalateReview(payload: ReviewActionPayload): Promise<ReviewActionResult> {
    const escalatedBy = Number(payload.escalatedBy || 0) || null;
    const reviewIds = this.toNumberArray(payload.reviewIds);
    const singleReviewId = Number(payload.reviewId || 0);
    const ids = reviewIds.length > 0 ? reviewIds : singleReviewId ? [singleReviewId] : [];

    if (ids.length === 0) {
      throw new Error('Review ID is required');
    }

    return this.mysqlService.withTransaction(async (connection) => {
      const escalated: number[] = [];

      for (const reviewId of ids) {
        const [rows] = await connection.query<RowDataPacket[]>(
          `
            SELECT r.id
            FROM mrf_det_reviews r
            WHERE r.id = ? AND r.active = 1
            LIMIT 1
          `,
          [reviewId],
        );

        if (rows.length === 0) {
          continue;
        }

        await connection.execute<ResultSetHeader>(
          `
            UPDATE mrf_det_reviews
            SET reviewPriority = 'high',
                sentForReviewAt = NOW(),
                reviewNote = CONCAT(COALESCE(reviewNote, ''), '\n[ESCALATED] Overdue review escalated'),
                modifiedDate = NOW()
            WHERE id = ?
          `,
          [reviewId] as any[],
        );

        await this.insertAuditLog(connection, reviewId, 'escalated', escalatedBy, {
          reason: 'Overdue review',
        });
        escalated.push(reviewId);
      }

      return {
        success: true,
        message: 'Review escalated successfully',
        reviewIds: escalated,
      };
    });
  }

  private async cancelReview(payload: ReviewActionPayload): Promise<ReviewActionResult> {
    const reviewId = Number(payload.reviewId || 0);
    const cancelledBy = Number(payload.cancelledBy || 0) || null;

    if (!reviewId) {
      throw new Error('Review ID is required');
    }

    return this.mysqlService.withTransaction(async (connection) => {
      const [result] = await connection.execute<ResultSetHeader>(
        `
          UPDATE mrf_det_reviews
          SET active = 0,
              reviewedAt = NOW(),
              modifiedDate = NOW()
          WHERE id = ? AND active = 1
        `,
        [reviewId] as any[],
      );

      if (result.affectedRows === 0) {
        throw new Error('Review not found');
      }

      await this.insertAuditLog(connection, reviewId, 'cancelled', cancelledBy, {
        reason: 'Admin cancellation',
      });

      return {
        success: true,
        message: 'Review cancelled successfully',
      };
    });
  }

  private async getReviewForUpdate(connection: PoolConnection, reviewId: number): Promise<RowDataPacket> {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM mrf_det_reviews WHERE id = ? AND active = 1 LIMIT 1',
      [reviewId],
    );
    if (rows.length === 0) {
      throw new Error('Original review not found');
    }
    return rows[0];
  }

  private async insertAuditLog(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    executor: { execute: (...args: any[]) => Promise<any> },
    reviewId: number,
    action: string,
    performedBy: number | null,
    details: Record<string, unknown>,
  ): Promise<void> {
    await executor.execute(
      `
        INSERT INTO mrf_review_audit_log (review_id, action, performed_by, details, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `,
      [reviewId, action, performedBy, JSON.stringify(details)],
    );
  }

  private toNumberArray(value: unknown): number[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => Number(entry))
      .filter((entry) => Number.isInteger(entry) && entry > 0);
  }

  private priorityOrderSql(column: string): string {
    return `CASE ${column}
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
      ELSE 5
    END`;
  }
}
