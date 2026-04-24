import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class QualityVersionControlRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async createChecklistDocumentWithInitialRevision(payload: {
    prefix: string;
    title: string;
    description?: string;
    department: string;
    category: string;
    template_id: number;
    created_by: string;
    revision_description: string;
  }): Promise<{ document_id: number; document_number: string; revision_id: number }> {
    return this.mysqlService.withTransaction(async (connection) => {
      const [sequenceRows] = await connection.query<RowDataPacket[]>(
        `
          SELECT current_number + 1 AS next_number
          FROM quality_document_sequences
          WHERE prefix = ?
          FOR UPDATE
        `,
        [payload.prefix],
      );

      if (!sequenceRows.length || sequenceRows[0].next_number == null) {
        throw new Error(`No sequence configured for prefix: ${payload.prefix}`);
      }

      const nextNumber = Number(sequenceRows[0].next_number);
      await connection.query(
        `
          UPDATE quality_document_sequences
          SET current_number = ?, updated_at = CURRENT_TIMESTAMP
          WHERE prefix = ?
        `,
        [nextNumber, payload.prefix],
      );

      const documentNumber = `${payload.prefix}-${String(nextNumber).padStart(3, '0')}`;

      const [documentResult] = await connection.query<ResultSetHeader>(
        `
          INSERT INTO quality_documents (
            document_number,
            prefix,
            sequence_number,
            title,
            description,
            department,
            category,
            status,
            current_revision,
            created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?)
        `,
        [
          documentNumber,
          payload.prefix,
          nextNumber,
          payload.title,
          payload.description || null,
          payload.department,
          payload.category,
          payload.created_by,
        ],
      );

      const documentId = Number(documentResult.insertId);

      const [revisionResult] = await connection.query<ResultSetHeader>(
        `
          INSERT INTO quality_revisions (
            document_id,
            revision_number,
            description,
            status,
            is_current,
            created_by,
            template_id
          ) VALUES (?, 1, ?, 'draft', 1, ?, ?)
        `,
        [documentId, payload.revision_description, payload.created_by, payload.template_id],
      );

      return {
        document_id: documentId,
        document_number: documentNumber,
        revision_id: Number(revisionResult.insertId),
      };
    });
  }

  async createChecklistRevisionWithMetadata(payload: {
    document_id: number;
    template_id: number;
    revision_description: string;
    changes_summary: string;
    items_added: number;
    items_removed: number;
    items_modified: number;
    changes_detail?: unknown;
    created_by: string;
  }): Promise<{ revision_id: number; revision_number: number; document_number: string }> {
    return this.mysqlService.withTransaction(async (connection) => {
      const [docRows] = await connection.query<Array<RowDataPacket & { document_number: string }>>(
        'SELECT document_number FROM quality_documents WHERE id = ? LIMIT 1',
        [payload.document_id],
      );

      if (!docRows.length) {
        throw new Error(`Quality document ${payload.document_id} not found`);
      }

      const [nextRows] = await connection.query<Array<RowDataPacket & { next_revision_number: number }>>(
        `
          SELECT COALESCE(MAX(revision_number), 0) + 1 AS next_revision_number
          FROM quality_revisions
          WHERE document_id = ?
          FOR UPDATE
        `,
        [payload.document_id],
      );

      const nextRevisionNumber = Number(nextRows[0]?.next_revision_number ?? 1);

      await connection.query(
        'UPDATE quality_revisions SET is_current = 0 WHERE document_id = ?',
        [payload.document_id],
      );

      const [result] = await connection.query<ResultSetHeader>(
        `
          INSERT INTO quality_revisions (
            document_id,
            template_id,
            revision_number,
            description,
            changes_summary,
            items_added,
            items_removed,
            items_modified,
            changes_detail,
            status,
            is_current,
            created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?)
        `,
        [
          payload.document_id,
          payload.template_id,
          nextRevisionNumber,
          payload.revision_description,
          payload.changes_summary,
          payload.items_added,
          payload.items_removed,
          payload.items_modified,
          payload.changes_detail == null ? null : JSON.stringify(payload.changes_detail),
          payload.created_by,
        ],
      );

      await connection.query(
        'UPDATE quality_documents SET current_revision = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [nextRevisionNumber, payload.document_id],
      );

      return {
        revision_id: Number(result.insertId),
        revision_number: nextRevisionNumber,
        document_number: String(docRows[0].document_number),
      };
    });
  }

  async getChecklistRevisionHistory(documentId: number): Promise<RowDataPacket[]> {
    const sql = `
      SELECT
        qr.id AS revision_id,
        qr.revision_number,
        qr.description,
        qr.changes_summary,
        qr.items_added,
        qr.items_removed,
        qr.items_modified,
        qr.changes_detail,
        qr.status,
        qr.is_current,
        qr.created_by,
        qr.created_at,
        qr.approved_by,
        qr.approved_at,
        qr.template_id,
        ct.name AS template_name
      FROM quality_revisions qr
      LEFT JOIN checklist_templates ct ON ct.id = qr.template_id
      WHERE qr.document_id = ?
      ORDER BY qr.revision_number DESC
    `;

    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [documentId]);
    return rows.map((row) => {
      const normalized = { ...row } as RowDataPacket & { changes_detail?: unknown };
      if (typeof normalized.changes_detail === 'string') {
        try {
          normalized.changes_detail = JSON.parse(normalized.changes_detail);
        } catch {
          // Keep original value when JSON parsing fails.
        }
      }
      return normalized;
    });
  }

  async getDocuments(filters?: {
    type?: string;
    category?: string;
    department?: string;
    status?: string;
    search?: string;
  }): Promise<RowDataPacket[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters?.department) {
      conditions.push('d.department = ?');
      params.push(filters.department);
    }
    if (filters?.status) {
      conditions.push('d.status = ?');
      params.push(filters.status);
    }
    if (filters?.category) {
      conditions.push('d.category = ?');
      params.push(filters.category);
    }
    if (filters?.type) {
      conditions.push('d.prefix LIKE ?');
      params.push(`%${filters.type}%`);
    }
    if (filters?.search) {
      conditions.push('(d.title LIKE ? OR d.document_number LIKE ? OR d.description LIKE ?)');
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT d.*,
        r.description AS current_revision_description,
        r.created_by AS current_revision_created_by,
        r.created_at AS current_revision_created_at,
        r.file_path AS current_revision_file_path
      FROM quality_documents d
      LEFT JOIN quality_revisions r ON r.document_id = d.id AND r.is_current = 1
      ${where}
      ORDER BY d.updated_at DESC
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, params);
  }

  async getDocumentById(id: number): Promise<RowDataPacket | null> {
    const sql = `
      SELECT d.*,
        r.description AS current_revision_description,
        r.created_by AS current_revision_created_by,
        r.created_at AS current_revision_created_at,
        r.file_path AS current_revision_file_path
      FROM quality_documents d
      LEFT JOIN quality_revisions r ON r.document_id = d.id AND r.is_current = 1
      WHERE d.id = ?
      LIMIT 1
    `;
    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [id]);
    return rows[0] || null;
  }

  async createDocument(payload: {
    document_number: string;
    prefix: string;
    sequence_number: number;
    title: string;
    description?: string;
    category?: string;
    department: string;
    created_by: string;
  }): Promise<number> {
    const sql = `
      INSERT INTO quality_documents (document_number, prefix, sequence_number, title, description, category, department, status, current_revision, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?)
    `;
    const result = await this.mysqlService.query<ResultSetHeader>(sql, [
      payload.document_number,
      payload.prefix,
      payload.sequence_number,
      payload.title,
      payload.description || '',
      payload.category || null,
      payload.department,
      payload.created_by,
    ]);
    return result.insertId;
  }

  async updateDocument(id: number, updates: Record<string, unknown>): Promise<void> {
    const allowedFields = ['title', 'description', 'category', 'department', 'status', 'approved_by', 'approved_at'];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k));
    if (!fields.length) return;

    const sql = `UPDATE quality_documents SET ${fields.map(f => `\`${f}\` = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await this.mysqlService.query(sql, [...fields.map(f => updates[f]), id]);
  }

  async deleteDocument(id: number): Promise<void> {
    await this.mysqlService.query('DELETE FROM quality_documents WHERE id = ?', [id]);
  }

  async getRevisions(documentId: number): Promise<RowDataPacket[]> {
    const sql = `
      SELECT * FROM quality_revisions
      WHERE document_id = ?
      ORDER BY revision_number DESC
    `;
    return this.mysqlService.query<RowDataPacket[]>(sql, [documentId]);
  }

  async getRevisionById(id: number): Promise<RowDataPacket | null> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      'SELECT * FROM quality_revisions WHERE id = ? LIMIT 1',
      [id],
    );
    return rows[0] || null;
  }

  async createRevision(payload: {
    document_id: number;
    revision_number: number;
    description: string;
    changes_summary?: string;
    created_by: string;
    template_id?: number | null;
    file_path?: string | null;
  }): Promise<number> {
    // Mark previous revisions as not current
    await this.mysqlService.query(
      'UPDATE quality_revisions SET is_current = 0 WHERE document_id = ?',
      [payload.document_id],
    );

    const sql = `
      INSERT INTO quality_revisions (document_id, revision_number, description, changes_summary, created_by, template_id, file_path, status, is_current)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 1)
    `;
    const result = await this.mysqlService.query<ResultSetHeader>(sql, [
      payload.document_id,
      payload.revision_number,
      payload.description,
      payload.changes_summary || null,
      payload.created_by,
      payload.template_id || null,
      payload.file_path || null,
    ]);

    // Update current_revision on the document
    await this.mysqlService.query(
      'UPDATE quality_documents SET current_revision = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [payload.revision_number, payload.document_id],
    );

    return result.insertId;
  }

  async updateRevision(id: number, updates: Record<string, unknown>): Promise<void> {
    const allowedFields = ['description', 'changes_summary', 'status', 'approved_by', 'approved_at', 'file_path'];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k));
    if (!fields.length) return;

    const sql = `UPDATE quality_revisions SET ${fields.map(f => `\`${f}\` = ?`).join(', ')} WHERE id = ?`;
    await this.mysqlService.query(sql, [...fields.map(f => updates[f]), id]);
  }

  async approveRevision(id: number, approvedBy: string): Promise<void> {
    await this.mysqlService.query(
      `UPDATE quality_revisions SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [approvedBy, id],
    );

    // Also update the parent document status if currently in review
    const row = await this.getRevisionById(id);
    if (row?.document_id) {
      await this.mysqlService.query(
        `UPDATE quality_documents SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'review'`,
        [approvedBy, row.document_id],
      );
    }
  }

  async rejectRevision(id: number, rejectedBy: string, reason: string): Promise<void> {
    await this.mysqlService.query(
      `UPDATE quality_revisions SET status = 'draft', approved_by = NULL, approved_at = NULL WHERE id = ?`,
      [id],
    );
    const row = await this.getRevisionById(id);
    if (row?.document_id) {
      await this.mysqlService.query(
        `UPDATE quality_documents SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'review'`,
        [row.document_id],
      );
    }
  }

  async getNextSequenceNumber(prefix: string): Promise<{ prefix: string; nextNumber: number }> {
    // Lock row and increment
    await this.mysqlService.query(
      `INSERT INTO quality_document_sequences (prefix, current_number, description)
       VALUES (?, 200, ?)
       ON DUPLICATE KEY UPDATE current_number = current_number + 1`,
      [prefix, `${prefix} documents`],
    );
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      'SELECT current_number FROM quality_document_sequences WHERE prefix = ?',
      [prefix],
    );
    return { prefix, nextNumber: rows[0]?.current_number ?? 201 };
  }

  async getStats(): Promise<{
    by_status: RowDataPacket[];
    by_type: RowDataPacket[];
    pending_approvals: number;
    recent_activity: RowDataPacket[];
  }> {
    const [byStatus, byType, pendingRows, recentActivity] = await Promise.all([
      this.mysqlService.query<RowDataPacket[]>(
        'SELECT status, COUNT(*) AS count FROM quality_documents GROUP BY status',
      ),
      this.mysqlService.query<RowDataPacket[]>(
        'SELECT prefix AS document_type, COUNT(*) AS count FROM quality_documents GROUP BY prefix',
      ),
      this.mysqlService.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS cnt FROM quality_revisions WHERE status = 'review'`,
      ),
      this.mysqlService.query<RowDataPacket[]>(
        `SELECT r.*, d.document_number, d.title AS document_title
         FROM quality_revisions r
         JOIN quality_documents d ON d.id = r.document_id
         ORDER BY r.created_at DESC LIMIT 10`,
      ),
    ]);

    return {
      by_status: byStatus,
      by_type: byType,
      pending_approvals: Number(pendingRows[0]?.cnt ?? 0),
      recent_activity: recentActivity,
    };
  }

  async getDepartments(): Promise<string[]> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      'SELECT DISTINCT department FROM quality_documents ORDER BY department',
    );
    return rows.map(r => String(r['department']));
  }

  async peekNextSequenceNumber(prefix: string): Promise<string> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT current_number FROM quality_document_sequences WHERE prefix = ?`,
      [prefix],
    );
    const next = rows.length ? Number(rows[0]['current_number']) + 1 : 201;
    return `${prefix}-${next}`;
  }
}
