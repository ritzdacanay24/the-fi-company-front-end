import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class PhotoChecklistRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  private _hasIsDeleted: boolean | null = null;

  private async hasIsDeletedColumn(): Promise<boolean> {
    if (this._hasIsDeleted !== null) return this._hasIsDeleted;
    try {
      const rows = await this.mysqlService.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'checklist_templates' AND COLUMN_NAME = 'is_deleted'`,
      );
      this._hasIsDeleted = Number(rows?.[0]?.cnt || 0) > 0;
    } catch {
      this._hasIsDeleted = false;
    }
    return this._hasIsDeleted;
  }

  async getTemplates(options?: { includeInactive?: boolean; includeDeleted?: boolean }): Promise<RowDataPacket[]> {
    const includeDeleted = !!options?.includeDeleted;
    const includeInactive = !!options?.includeInactive;
    const hasDeleted = await this.hasIsDeletedColumn();

    let whereClause: string;
    if (includeDeleted) {
      whereClause = '1=1';
    } else if (includeInactive) {
      whereClause = hasDeleted ? 't.is_deleted = 0' : '1=1';
    } else {
      whereClause = hasDeleted ? '(t.is_active = 1 OR t.is_draft = 1) AND t.is_deleted = 0' : '(t.is_active = 1 OR t.is_draft = 1)';
    }

    const sql = `
      SELECT t.*,
        qd.id AS qd_id,
        qd.document_number,
        qd.title AS qd_title,
        qr.id AS qr_id,
        qr.revision_number AS qr_revision_number,
        COALESCE(ic.item_count, 0) AS item_count,
        COALESCE(ac.active_instances, 0) AS active_instances,
        TRIM(CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, ''))) AS created_by_name
      FROM checklist_templates t
      LEFT JOIN quality_documents qd ON qd.id = t.quality_document_id
      LEFT JOIN quality_revisions qr ON qr.id = t.quality_revision_id
      LEFT JOIN (
        SELECT template_id, COUNT(*) AS item_count
        FROM checklist_items GROUP BY template_id
      ) ic ON ic.template_id = t.id
      LEFT JOIN (
        SELECT template_id, COUNT(*) AS active_instances
        FROM checklist_instances WHERE status != 'completed'
        GROUP BY template_id
      ) ac ON ac.template_id = t.id
      LEFT JOIN db.users u ON u.id = t.created_by
      WHERE ${whereClause}
      ORDER BY t.updated_at DESC
    `;

    const rows = await this.mysqlService.query<RowDataPacket[]>(sql);

    const results = rows.map((row) => {
      const r = { ...row };
      if (r.qd_id) {
        r.quality_document_metadata = {
          document_id: Number(r.qd_id),
          revision_id: Number(r.qr_id),
          document_number: r.document_number,
          revision_number: Number(r.qr_revision_number),
          title: r.qd_title,
          version_string: `${r.document_number}, Rev ${r.qr_revision_number}`,
        };
      } else {
        r.quality_document_metadata = null;
      }
      delete r.qd_id;
      delete r.document_number;
      delete r.qd_title;
      delete r.qr_id;
      delete r.qr_revision_number;
      r.is_active = !!r.is_active;
      r.is_draft = !!r.is_draft;
      if ('is_deleted' in r) r.is_deleted = !!r.is_deleted;
      r.active_instances = Number(r.active_instances || 0);
      r.item_count = Number(r.item_count || 0);
      return r;
    });

    // Build edit_target_template_id for each published template
    const publishedIds = results
      .filter((r) => !r.is_draft)
      .map((r) => Number(r.id))
      .filter((id) => id > 0);

    const bestDraftByParent = new Map<number, number>();
    if (publishedIds.length > 0) {
      const placeholders = publishedIds.map(() => '?').join(',');
      const draftRows = await this.mysqlService.query<RowDataPacket[]>(
        `SELECT parent_template_id, id FROM checklist_templates
         WHERE is_draft = 1 AND parent_template_id IN (${placeholders})
         ORDER BY parent_template_id ASC, is_active DESC, updated_at DESC, id DESC`,
        publishedIds,
      );
      for (const dr of draftRows) {
        const parentId = Number(dr.parent_template_id || 0);
        if (parentId > 0 && !bestDraftByParent.has(parentId)) {
          bestDraftByParent.set(parentId, Number(dr.id));
        }
      }
    }

    return results.map((r) => {
      const id = Number(r.id || 0);
      r.edit_target_template_id = r.is_draft ? (id > 0 ? id : null) : (bestDraftByParent.get(id) ?? null);
      return r;
    }) as RowDataPacket[];
  }

  async getTemplateById(id: number, options?: { includeInactive?: boolean; includeDeleted?: boolean }): Promise<RowDataPacket | null> {
    const includeDeleted = !!options?.includeDeleted;
    const includeInactive = !!options?.includeInactive;
    const hasDeleted = await this.hasIsDeletedColumn();

    let extraCondition: string;
    if (includeDeleted) {
      extraCondition = '';
    } else if (includeInactive) {
      extraCondition = hasDeleted ? 'AND t.is_deleted = 0' : '';
    } else {
      extraCondition = hasDeleted ? 'AND (t.is_active = 1 OR t.is_draft = 1) AND t.is_deleted = 0' : 'AND (t.is_active = 1 OR t.is_draft = 1)';
    }

    const sql = `
      SELECT t.*,
        qd.id AS qd_id,
        qd.document_number,
        qd.title AS qd_title,
        qr.id AS qr_id,
        qr.revision_number AS qr_revision_number
      FROM checklist_templates t
      LEFT JOIN quality_documents qd ON qd.id = t.quality_document_id
      LEFT JOIN quality_revisions qr ON qr.id = t.quality_revision_id
      WHERE t.id = ? ${extraCondition}
      LIMIT 1
    `;

    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [id]);
    const row = rows[0];
    if (!row) return null;

    const r = { ...row };
    if (r.qd_id) {
      r.quality_document_metadata = {
        document_id: Number(r.qd_id),
        revision_id: Number(r.qr_id),
        document_number: r.document_number,
        revision_number: Number(r.qr_revision_number),
        title: r.qd_title,
        version_string: `${r.document_number}, Rev ${r.qr_revision_number}`,
      };
    } else {
      r.quality_document_metadata = null;
    }
    delete r.qd_id;
    delete r.document_number;
    delete r.qd_title;
    delete r.qr_id;
    delete r.qr_revision_number;

    r.is_active = !!r.is_active;
    r.is_draft = !!r.is_draft;
    if ('is_deleted' in r) r.is_deleted = !!r.is_deleted;
    if (r.template_group_id != null) r.template_group_id = Number(r.template_group_id);
    if (r.parent_template_id != null) r.parent_template_id = Number(r.parent_template_id);

    const templateId = Number(r.id || 0);
    if (r.is_draft) {
      r.edit_target_template_id = templateId > 0 ? templateId : null;
    } else {
      const draftRows = await this.mysqlService.query<RowDataPacket[]>(
        `SELECT id FROM checklist_templates WHERE parent_template_id = ? AND is_draft = 1
         ORDER BY is_active DESC, updated_at DESC, id DESC LIMIT 1`,
        [templateId],
      );
      const draftId = Number(draftRows[0]?.id || 0);
      r.edit_target_template_id = draftId > 0 ? draftId : null;
    }

    return r as RowDataPacket;
  }

  /** Lightweight fetch — returns raw row without joins or draft resolution */
  async getRawTemplateById(id: number): Promise<RowDataPacket | null> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      'SELECT id, version, is_draft, is_active, template_group_id FROM checklist_templates WHERE id = ? LIMIT 1',
      [id],
    );
    const row = rows?.[0] ?? null;
    if (row) {
      row.is_draft = !!row.is_draft;
      if (row.template_group_id != null) row.template_group_id = Number(row.template_group_id);
    }
    return row;
  }

  /** Returns all published (non-draft) versions in a family group */
  async getPublishedVersionsInGroup(groupId: number): Promise<RowDataPacket[]> {
    return this.mysqlService.query<RowDataPacket[]>(
      'SELECT id, version FROM checklist_templates WHERE template_group_id = ? AND is_draft = 0',
      [groupId],
    );
  }

  /** Returns any active draft already in this family group */
  async getActiveDraftInGroup(groupId: number): Promise<RowDataPacket | null> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT id, version FROM checklist_templates
       WHERE template_group_id = ? AND is_draft = 1 AND is_active = 1
       ORDER BY updated_at DESC, id DESC LIMIT 1`,
      [groupId],
    );
    return rows?.[0] ?? null;
  }

  async getTemplateItems(templateId: number): Promise<RowDataPacket[]> {
    const sql = `
      SELECT *
      FROM checklist_items
      WHERE template_id = ?
      ORDER BY order_index ASC
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, [templateId]);
  }

  async getInstances(filters?: { status?: string; workOrder?: string }): Promise<RowDataPacket[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters?.status) {
      conditions.push('ci.status = ?');
      params.push(filters.status);
    }

    if (filters?.workOrder) {
      conditions.push('ci.work_order_number LIKE ?');
      params.push(`%${filters.workOrder}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT ci.id, ci.template_id, ci.work_order_number, ci.part_number, ci.serial_number,
             ci.operator_id, ci.operator_name, ci.owner_id, ci.owner_name, ci.lock_expires_at,
             ci.status, ci.progress_percentage,
             ci.created_at, ci.updated_at, ci.started_at, ci.completed_at, ci.submitted_at,
             ct.name AS template_name, ct.category, ct.version AS template_version, ct.customer_name,
             (SELECT COUNT(*) FROM photo_submissions ps2
              WHERE ps2.instance_id = ci.id) AS photo_count,
             (SELECT COUNT(*) FROM checklist_items citm2
              WHERE citm2.template_id = ci.template_id AND citm2.is_required = 1) AS required_items,
             (SELECT COUNT(DISTINCT ps3.id) FROM photo_submissions ps3
              INNER JOIN checklist_items citm3 ON ps3.item_id = citm3.id
              WHERE ps3.instance_id = ci.id AND citm3.is_required = 1) AS completed_required
      FROM checklist_instances ci
      INNER JOIN checklist_templates ct ON ci.template_id = ct.id
      ${whereClause}
      ORDER BY ci.created_at DESC
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, params);
  }

  async createInstance(payload: {
    template_id: number;
    work_order_number: string;
    part_number?: string;
    serial_number?: string;
    operator_id?: number | null;
    operator_name?: string;
    status?: string;
  }): Promise<number> {
    const sql = `
      INSERT INTO checklist_instances (
        template_id, work_order_number, part_number, serial_number,
        operator_id, operator_name, owner_id, owner_name, status, progress_percentage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [
      payload.template_id,
      payload.work_order_number,
      payload.part_number || null,
      payload.serial_number || null,
      payload.operator_id ?? null,
      payload.operator_name || null,
      payload.operator_id ?? null,
      payload.operator_name || null,
      payload.status || 'draft',
      0,
    ]);

    return result.insertId;
  }

  async createTemplate(payload: any): Promise<number> {
    const templatesSql = `
      INSERT INTO checklist_templates (
        quality_document_id, quality_revision_id, name, description, part_number,
        customer_part_number, customer_name, revision, original_filename, review_date,
        revision_number, revision_details, revised_by, product_type, category,
        version, parent_template_id, is_active, created_by, template_group_id,
        is_draft, published_at, last_autosave_at,
        draft_owner_id, draft_owner_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const initialTemplateGroupId = Number(payload?.template_group_id || 0);
    const isDraft = payload?.is_draft === 1 || payload?.is_draft === true ? 1 : 0;
    const isActive = payload?.is_active === 0 || payload?.is_active === false ? 0 : 1;
    const createdBy = payload?.created_by ?? null;

    return this.mysqlService.withTransaction<number>(async (connection) => {
      // Resolve the creator's display name to set as initial draft owner
      let ownerName: string | null = null;
      if (isDraft && createdBy) {
        const [userRows] = await connection.execute<RowDataPacket[]>(
          `SELECT TRIM(CONCAT(COALESCE(first, ''), ' ', COALESCE(last, ''))) AS display_name FROM db.users WHERE id = ? LIMIT 1`,
          [createdBy],
        );
        ownerName = (userRows as any[])[0]?.display_name || null;
      }

      const [insertResult] = await connection.execute<ResultSetHeader>(templatesSql, [
        payload?.quality_document_id ?? null,
        payload?.quality_revision_id ?? null,
        payload?.name || '',
        payload?.description ?? null,
        payload?.part_number ?? null,
        payload?.customer_part_number ?? null,
        payload?.customer_name ?? null,
        payload?.revision ?? null,
        payload?.original_filename ?? null,
        payload?.review_date ?? null,
        payload?.revision_number ?? null,
        payload?.revision_details ?? null,
        payload?.revised_by ?? null,
        payload?.product_type ?? null,
        payload?.category || 'inspection',
        payload?.version || '1.0',
        payload?.parent_template_id ?? null,
        isActive,
        createdBy,
        initialTemplateGroupId,
        isDraft,
        payload?.published_at ?? null,
        payload?.last_autosave_at ?? null,
        isDraft ? (createdBy ?? null) : null,
        isDraft ? ownerName : null,
      ]);

      const templateId = insertResult.insertId;

      if (!initialTemplateGroupId) {
        await connection.execute('UPDATE checklist_templates SET template_group_id = ? WHERE id = ?', [templateId, templateId]);
      }

      await this.replaceTemplateItemsInTransaction(connection, templateId, payload?.items || []);

      return templateId;
    });
  }

  async updateTemplate(id: number, payload: any): Promise<{ unsafeMutationBlocked?: boolean; instanceCount?: number; blockedItemIds?: number[] }> {
    const updateSql = `
      UPDATE checklist_templates
      SET
        quality_document_id = ?,
        quality_revision_id = ?,
        name = ?,
        description = ?,
        part_number = ?,
        customer_part_number = ?,
        customer_name = ?,
        revision = ?,
        original_filename = ?,
        review_date = ?,
        revision_number = ?,
        revision_details = ?,
        revised_by = ?,
        product_type = ?,
        category = ?,
        version = ?,
        parent_template_id = ?,
        is_active = ?,
        created_by = ?,
        is_draft = ?,
        published_at = ?,
        last_autosave_at = ?
      WHERE id = ?
    `;

    const isDraft = payload?.is_draft === 1 || payload?.is_draft === true ? 1 : 0;
    const isActive = payload?.is_active === 0 || payload?.is_active === false ? 0 : 1;

    // If transitioning from draft → published and no published_at provided, stamp it now.
    const existingRow = await this.mysqlService.query<RowDataPacket[]>(
      'SELECT is_draft, published_at, version FROM checklist_templates WHERE id = ? LIMIT 1',
      [id],
    );
    const wasPublished = existingRow?.[0]?.published_at;
    // Preserve the existing version when the payload omits it — prevents accidental clobber to '1.0'.
    const resolvedVersion = payload?.version || existingRow?.[0]?.version || '1.0';
    const publishedAt = isDraft === 0
      ? (payload?.published_at ?? wasPublished ?? new Date().toISOString().slice(0, 19).replace('T', ' '))
      : null;

    return this.mysqlService.withTransaction<{ unsafeMutationBlocked?: boolean; instanceCount?: number; blockedItemIds?: number[] }>(async (connection) => {
      if (Array.isArray(payload?.items)) {
        const mutationGuard = await this.detectUnsafeItemMutationInTransaction(connection, id, payload.items);
        if (mutationGuard.unsafeMutationBlocked) {
          return mutationGuard;
        }
      }

      await connection.execute(updateSql, [
        payload?.quality_document_id ?? null,
        payload?.quality_revision_id ?? null,
        payload?.name || '',
        payload?.description ?? null,
        payload?.part_number ?? null,
        payload?.customer_part_number ?? null,
        payload?.customer_name ?? null,
        payload?.revision ?? null,
        payload?.original_filename ?? null,
        payload?.review_date ?? null,
        payload?.revision_number ?? null,
        payload?.revision_details ?? null,
        payload?.revised_by ?? null,
        payload?.product_type ?? null,
        payload?.category || 'inspection',
        resolvedVersion,
        payload?.parent_template_id ?? null,
        isActive,
        payload?.created_by ?? null,
        isDraft,
        publishedAt,
        payload?.last_autosave_at ?? null,
        id,
      ]);

      if (Array.isArray(payload?.items)) {
        await this.replaceTemplateItemsInTransaction(connection, id, payload.items);
      }

      return {};
    });
  }

  async deleteTemplate(id: number): Promise<{ activeInstances: number }> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM checklist_instances WHERE template_id = ?`,
      [id],
    );
    const instanceCount = Number(rows?.[0]?.count || 0);
    if (instanceCount > 0) {
      return { activeInstances: instanceCount };
    }

    try {
      await this.mysqlService.execute(
        `UPDATE checklist_templates SET is_active = 0, is_draft = 0, is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id],
      );
    } catch {
      await this.mysqlService.execute(
        `UPDATE checklist_templates SET is_active = 0, is_draft = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id],
      );
    }
    return { activeInstances: 0 };
  }

  async hardDeleteTemplate(id: number): Promise<{ success: boolean; error?: string; [key: string]: unknown }> {
    const templateId = Number(id);

    const instanceRows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM checklist_instances WHERE template_id = ?`, [templateId]);
    if (Number(instanceRows[0]?.count || 0) > 0) {
      return { success: false, error: 'Cannot hard delete template with existing instances.' };
    }

    const submissionRows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM photo_submissions ps
       INNER JOIN checklist_items ci ON ps.item_id = ci.id WHERE ci.template_id = ?`, [templateId]);
    if (Number(submissionRows[0]?.count || 0) > 0) {
      return { success: false, error: 'Cannot hard delete template because photo submissions reference its items.' };
    }

    const childRows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM checklist_templates WHERE parent_template_id = ?`, [templateId]);
    if (Number(childRows[0]?.count || 0) > 0) {
      return { success: false, error: 'Cannot hard delete template because other versions/drafts reference it as a parent.' };
    }

    await this.mysqlService.withTransaction<void>(async (connection) => {
      await connection.execute('DELETE FROM checklist_items WHERE template_id = ?', [templateId]);
      await connection.execute('DELETE FROM checklist_templates WHERE id = ?', [templateId]);
    });

    return { success: true };
  }

  async discardDraft(id: number): Promise<{ success: boolean; error?: string; template_id?: number }> {
    const templateId = Number(id);
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT id, is_draft, parent_template_id FROM checklist_templates WHERE id = ? LIMIT 1`,
      [templateId],
    );
    const template = rows[0];
    if (!template) return { success: false, error: 'Template not found' };
    if (!template.is_draft) return { success: false, error: 'Only draft templates can be discarded' };

    const instanceRows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM checklist_instances WHERE template_id = ?`, [templateId]);
    if (Number(instanceRows[0]?.count || 0) > 0) {
      return { success: false, error: 'Cannot discard draft because it has existing checklist instances.' };
    }

    await this.mysqlService.withTransaction<void>(async (connection) => {
      await connection.execute('DELETE FROM checklist_items WHERE template_id = ?', [templateId]);
      await connection.execute('DELETE FROM checklist_templates WHERE id = ? AND is_draft = 1', [templateId]);
      const parentId = Number(template.parent_template_id || 0);
      if (parentId > 0) {
        await connection.execute(
          `UPDATE checklist_templates
           SET is_active = 1, is_draft = 0,
               published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND is_draft = 0`,
          [parentId],
        );
      }
    });

    return { success: true, template_id: templateId };
  }

  async restoreTemplate(id: number): Promise<{ success: boolean }> {
    try {
      await this.mysqlService.execute(
        `UPDATE checklist_templates
         SET is_active = 1, is_draft = 0, is_deleted = 0,
             published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id],
      );
    } catch {
      await this.mysqlService.execute(
        `UPDATE checklist_templates
         SET is_active = 1, is_draft = 0,
             published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id],
      );
    }
    return { success: true };
  }

  async createParentVersion(sourceTemplateId: number, userId?: number): Promise<number> {
    return this.mysqlService.withTransaction<number>(async (connection) => {
      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM checklist_templates WHERE id = ? LIMIT 1',
        [sourceTemplateId],
      );
      const source = rows[0];
      if (!source) return 0;

      const groupId = Number(source.template_group_id || source.id);

      // Compute next major based on max major across ALL published templates in the family
      const [versionRows] = await connection.query<RowDataPacket[]>(
        `SELECT version FROM checklist_templates WHERE template_group_id = ? AND is_draft = 0`,
        [groupId],
      );
      let maxMajor = 1;
      for (const vr of versionRows) {
        const major = Number(String(vr.version || '1').split('.')[0]) || 1;
        if (major > maxMajor) maxMajor = major;
      }
      const nextMajorVersion = `${maxMajor + 1}.0`;

      // Reuse existing draft for this next major if one already exists
      const [existingDraftRows] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM checklist_templates
         WHERE template_group_id = ? AND is_draft = 1 AND parent_template_id IS NULL AND version = ?
         ORDER BY is_active DESC, updated_at DESC, id DESC LIMIT 1`,
        [groupId, nextMajorVersion],
      );
      if (existingDraftRows[0]) {
        await connection.execute(
          `UPDATE checklist_templates SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [Number(existingDraftRows[0].id)],
        );
        return Number(existingDraftRows[0].id);
      }

      // Deactivate other root major drafts in this family
      await connection.execute(
        `UPDATE checklist_templates SET is_active = 0, updated_at = CURRENT_TIMESTAMP
         WHERE template_group_id = ? AND is_draft = 1 AND parent_template_id IS NULL`,
        [groupId],
      );

      const [insertResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO checklist_templates (
          quality_document_id, quality_revision_id, name, description, part_number,
          customer_part_number, customer_name, revision, original_filename, review_date,
          revision_number, revision_details, revised_by, product_type, category,
          version, parent_template_id, is_active, created_by, template_group_id,
          is_draft, published_at, last_autosave_at,
          draft_owner_id, draft_owner_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, ?, ?, 1, NULL, NULL, ?, ?)`,
        [
          source.quality_document_id ?? null,
          source.quality_revision_id ?? null,
          source.name,
          source.description ?? null,
          source.part_number ?? null,
          source.customer_part_number ?? null,
          source.customer_name ?? null,
          source.revision ?? null,
          source.original_filename ?? null,
          source.review_date ?? null,
          source.revision_number ?? null,
          source.revision_details ?? null,
          source.revised_by ?? null,
          source.product_type ?? null,
          source.category || 'inspection',
          nextMajorVersion,
          userId ?? null,
          groupId,
          userId ?? null,
          await (async () => {
            if (!userId) return null;
            const [uRows] = await connection.execute<RowDataPacket[]>(
              `SELECT TRIM(CONCAT(COALESCE(first, ''), ' ', COALESCE(last, ''))) AS display_name FROM db.users WHERE id = ? LIMIT 1`,
              [userId],
            );
            return (uRows as any[])[0]?.display_name || null;
          })(),
        ],
      );

      const newTemplateId = insertResult.insertId;
      await connection.execute(
        `INSERT INTO checklist_items (
          template_id, order_index, parent_id, level, title, description, submission_type,
          is_required, validation_rules, photo_requirements, sample_image_url, sample_images,
          video_requirements, sample_video_url, sample_videos, needs_media_upload, links
        )
        SELECT ?, order_index, parent_id, level, title, description, submission_type,
               is_required, validation_rules, photo_requirements, sample_image_url, sample_images,
               video_requirements, sample_video_url, sample_videos, needs_media_upload, links
        FROM checklist_items WHERE template_id = ?`,
        [newTemplateId, sourceTemplateId],
      );

      return newTemplateId;
    });
  }

  async publishTemplate(id: number): Promise<{ success: boolean; error?: string; template_id?: number }> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT id FROM checklist_templates WHERE id = ? LIMIT 1`, [Number(id)]);
    if (!rows[0]) return { success: false, error: 'Template not found' };

    await this.mysqlService.execute(
      `UPDATE checklist_templates
       SET is_draft = 0, is_active = 1,
           published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [Number(id)],
    );
    return { success: true, template_id: Number(id) };
  }

  async deleteMajorVersion(groupId: number, major: number): Promise<{ success: boolean; error?: string; [key: string]: unknown }> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT id FROM checklist_templates
       WHERE template_group_id = ?
         AND CAST(SUBSTRING_INDEX(version, '.', 1) AS UNSIGNED) = ?`,
      [groupId, major],
    );
    if (!rows.length) return { success: false, error: 'No templates found for that major' };

    const templateIds = rows.map((r) => Number(r.id)).filter((id) => id > 0);
    const placeholders = templateIds.map(() => '?').join(',');

    const instanceRows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM checklist_instances WHERE template_id IN (${placeholders})`,
      templateIds,
    );
    if (Number(instanceRows[0]?.count || 0) > 0) {
      return { success: false, error: 'Cannot delete major version because one or more versions have checklist instances.' };
    }

    const submissionRows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM photo_submissions ps
       INNER JOIN checklist_items ci ON ps.item_id = ci.id
       WHERE ci.template_id IN (${placeholders})`,
      templateIds,
    );
    if (Number(submissionRows[0]?.count || 0) > 0) {
      return { success: false, error: 'Cannot delete major version because photo submissions reference its items.' };
    }

    try {
      await this.mysqlService.execute(
        `UPDATE checklist_templates
         SET is_active = 0, is_draft = 0, is_deleted = 1, updated_at = CURRENT_TIMESTAMP
         WHERE id IN (${placeholders})`,
        templateIds,
      );
    } catch {
      await this.mysqlService.execute(
        `UPDATE checklist_templates
         SET is_active = 0, is_draft = 0, updated_at = CURRENT_TIMESTAMP
         WHERE id IN (${placeholders})`,
        templateIds,
      );
    }

    return { success: true, message: 'Major version deleted (soft)', template_ids: templateIds };
  }

  async getTemplateHistory(options: { groupId?: number; templateId?: number }): Promise<RowDataPacket[]> {
    if (options.groupId) {
      return this.mysqlService.query<RowDataPacket[]>(
        `SELECT id, template_group_id, parent_template_id, name, version, is_draft, is_active, created_at, updated_at
         FROM checklist_templates
         WHERE template_group_id = ?
         ORDER BY updated_at DESC`,
        [options.groupId],
      );
    }

    if (options.templateId) {
      const rows = await this.mysqlService.query<RowDataPacket[]>('SELECT template_group_id FROM checklist_templates WHERE id = ? LIMIT 1', [options.templateId]);
      const groupId = Number(rows?.[0]?.template_group_id || 0);
      if (!groupId) {
        return [];
      }
      return this.mysqlService.query<RowDataPacket[]>(
        `SELECT id, template_group_id, parent_template_id, name, version, is_draft, is_active, created_at, updated_at
         FROM checklist_templates
         WHERE template_group_id = ?
         ORDER BY updated_at DESC`,
        [groupId],
      );
    }

    return [];
  }

  async compareTemplates(sourceId: number, targetId: number): Promise<RowDataPacket> {
    const [sourceRows, targetRows] = await Promise.all([
      this.mysqlService.query<RowDataPacket[]>('SELECT id, order_index, title, description, submission_type, is_required FROM checklist_items WHERE template_id = ? ORDER BY order_index ASC', [sourceId]),
      this.mysqlService.query<RowDataPacket[]>('SELECT id, order_index, title, description, submission_type, is_required FROM checklist_items WHERE template_id = ? ORDER BY order_index ASC', [targetId]),
    ]);

    return {
      source_id: sourceId,
      target_id: targetId,
      source_count: sourceRows.length,
      target_count: targetRows.length,
      added_count: Math.max(0, targetRows.length - sourceRows.length),
      removed_count: Math.max(0, sourceRows.length - targetRows.length),
      modified_count: 0,
      source_items: sourceRows,
      target_items: targetRows,
    } as RowDataPacket;
  }

  async searchInstances(criteria: {
    partNumber?: string;
    serialNumber?: string;
    workOrderNumber?: string;
    templateName?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    operator?: string;
  }): Promise<RowDataPacket[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (criteria.partNumber) {
      conditions.push('ci.part_number LIKE ?');
      params.push(`%${criteria.partNumber}%`);
    }
    if (criteria.serialNumber) {
      conditions.push('ci.serial_number LIKE ?');
      params.push(`%${criteria.serialNumber}%`);
    }
    if (criteria.workOrderNumber) {
      conditions.push('ci.work_order_number LIKE ?');
      params.push(`%${criteria.workOrderNumber}%`);
    }
    if (criteria.templateName) {
      conditions.push('t.name LIKE ?');
      params.push(`%${criteria.templateName}%`);
    }
    if (criteria.dateFrom) {
      conditions.push('DATE(ci.created_at) >= ?');
      params.push(criteria.dateFrom);
    }
    if (criteria.dateTo) {
      conditions.push('DATE(ci.created_at) <= ?');
      params.push(criteria.dateTo);
    }
    if (criteria.status) {
      conditions.push('ci.status = ?');
      params.push(criteria.status);
    }
    if (criteria.operator) {
      conditions.push('ci.operator_name LIKE ?');
      params.push(`%${criteria.operator}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    return this.mysqlService.query<RowDataPacket[]>(
      `SELECT ci.*, t.name AS template_name, t.version AS template_version, t.customer_name
       FROM checklist_instances ci
       INNER JOIN checklist_templates t ON t.id = ci.template_id
       ${whereClause}
       ORDER BY ci.updated_at DESC`,
      params,
    );
  }

  async getInstanceById(id: number): Promise<RowDataPacket | null> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT ci.*, t.name AS template_name, t.description AS template_description,
              t.version AS template_version, t.category AS template_category
       FROM checklist_instances ci
       INNER JOIN checklist_templates t ON t.id = ci.template_id
       WHERE ci.id = ?
       LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }

  async getShareTokensByInstanceId(instanceId: number): Promise<RowDataPacket[]> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT id, token, label, visible_item_ids, expires_at,
              created_by_name, created_at, accessed_count, last_accessed_at
       FROM checklist_share_tokens
       WHERE instance_id = ?
       ORDER BY created_at DESC`,
      [instanceId],
    );

    return rows.map((row) => ({
      ...row,
      visible_item_ids: this.safeParseJson(row.visible_item_ids, null),
    })) as RowDataPacket[];
  }

  async createShareToken(payload: {
    token: string;
    instanceId: number;
    visibleItemIds: number[] | null;
    label?: string | null;
    expiresAt?: string | null;
    createdBy?: number | null;
    createdByName?: string | null;
  }): Promise<void> {
    await this.mysqlService.execute(
      `INSERT INTO checklist_share_tokens (
        token, instance_id, visible_item_ids, label, expires_at, created_by, created_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.token,
        payload.instanceId,
        payload.visibleItemIds && payload.visibleItemIds.length ? JSON.stringify(payload.visibleItemIds) : null,
        payload.label || null,
        payload.expiresAt || null,
        payload.createdBy ?? null,
        payload.createdByName ?? null,
      ],
    );
  }

  async deleteShareToken(id: number): Promise<void> {
    await this.mysqlService.execute('DELETE FROM checklist_share_tokens WHERE id = ?', [id]);
  }

  async getActiveShareToken(token: string): Promise<RowDataPacket | null> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT t.*, i.template_id, i.work_order_number, i.part_number, i.serial_number,
              i.operator_name, i.status, i.progress_percentage, i.item_completion,
              i.created_at AS instance_created_at, i.updated_at AS instance_updated_at,
              i.submitted_at, i.completed_at,
              tmpl.name AS template_name, tmpl.description AS template_description,
              tmpl.version AS template_version, tmpl.customer_name
       FROM checklist_share_tokens t
       INNER JOIN checklist_instances i ON i.id = t.instance_id
       INNER JOIN checklist_templates tmpl ON tmpl.id = i.template_id
       WHERE t.token = ?
         AND (t.expires_at IS NULL OR t.expires_at > NOW())
       LIMIT 1`,
      [token],
    );

    return rows[0] || null;
  }

  async incrementShareTokenAccess(token: string): Promise<void> {
    await this.mysqlService.execute(
      `UPDATE checklist_share_tokens
       SET accessed_count = accessed_count + 1, last_accessed_at = NOW()
       WHERE token = ?`,
      [token],
    );
  }

  async getChecklistItemsByTemplateId(templateId: number): Promise<RowDataPacket[]> {
    return this.mysqlService.query<RowDataPacket[]>(
      `SELECT id, order_index, title, description, is_required, level, parent_id,
              photo_requirements, submission_type, links
       FROM checklist_items
       WHERE template_id = ?
       ORDER BY order_index ASC`,
      [templateId],
    );
  }

  async getPhotoSubmissionsByInstanceId(instanceId: number): Promise<RowDataPacket[]> {
    return this.mysqlService.query<RowDataPacket[]>(
      `SELECT item_id, file_url, file_type, created_at, id AS submission_id, photo_metadata
       FROM photo_submissions
       WHERE instance_id = ?
       ORDER BY item_id ASC, created_at ASC`,
      [instanceId],
    );
  }

  async createPhotoSubmission(payload: {
    instance_id: number;
    item_id: number;
    file_name: string;
    file_path: string;
    file_url: string;
    file_type: string;
    file_size: number;
    mime_type: string;
    photo_metadata: string;
  }): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `INSERT INTO photo_submissions (
         instance_id,
         item_id,
         file_name,
         file_path,
         file_url,
         file_type,
         file_size,
         mime_type,
         photo_metadata
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         file_name = VALUES(file_name),
         file_path = VALUES(file_path),
         file_url = VALUES(file_url),
         file_type = VALUES(file_type),
         file_size = VALUES(file_size),
         mime_type = VALUES(mime_type),
         photo_metadata = VALUES(photo_metadata),
         updated_at = CURRENT_TIMESTAMP`,
      [
        payload.instance_id,
        payload.item_id,
        payload.file_name,
        payload.file_path,
        payload.file_url,
        payload.file_type,
        payload.file_size,
        payload.mime_type,
        payload.photo_metadata,
      ],
    );

    return Number(result.insertId || 0);
  }

  async getPhotoSubmissionById(id: number): Promise<RowDataPacket | null> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT id, instance_id, item_id, file_name, file_url, file_path, file_type, created_at, photo_metadata
       FROM photo_submissions
       WHERE id = ?
       LIMIT 1`,
      [id],
    );

    return rows[0] || null;
  }

  async findPhotoSubmissionIdByLocator(
    instanceId: number,
    itemId: number,
    fileUrlCandidates: string[],
  ): Promise<number | null> {
    if (!fileUrlCandidates.length) {
      return null;
    }

    const placeholders = fileUrlCandidates.map(() => '?').join(',');
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT id
       FROM photo_submissions
       WHERE instance_id = ?
         AND item_id = ?
         AND file_url IN (${placeholders})
       ORDER BY id DESC
       LIMIT 1`,
      [instanceId, itemId, ...fileUrlCandidates],
    );

    const rowId = Number(rows[0]?.id || 0);
    return rowId > 0 ? rowId : null;
  }

  async deletePhotoSubmissionById(id: number): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      'DELETE FROM photo_submissions WHERE id = ?',
      [id],
    );

    return result.affectedRows;
  }

  async updateInstance(id: number, payload: Record<string, unknown>): Promise<void> {
    const allowedFields = [
      'status',
      'progress_percentage',
      'operator_id',
      'operator_name',
      'part_number',
      'serial_number',
      'work_order_number',
      'completed_at',
      'submitted_at',
      'item_completion',
      'photo_count',
      'required_items',
      'completed_required',
    ];

    const updates: string[] = [];
    const params: unknown[] = [];

    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        updates.push(`${key} = ?`);
        const value = key === 'item_completion' && payload[key] != null
          ? JSON.stringify(payload[key])
          : payload[key];
        params.push(value);
      }
    }

    if (!updates.length) {
      return;
    }

    params.push(id);
    await this.mysqlService.execute(`UPDATE checklist_instances SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Owner-lock helpers
  // ──────────────────────────────────────────────────────────────────────────

  async getInstanceLock(id: number): Promise<{ owner_id: number | null; owner_name: string | null; operator_id: number | null; operator_name: string | null }> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      'SELECT owner_id, owner_name, operator_id, operator_name FROM checklist_instances WHERE id = ? LIMIT 1',
      [id],
    );
    const row = rows?.[0];
    if (!row) return { owner_id: null, owner_name: null, operator_id: null, operator_name: null };
    return {
      owner_id: row.owner_id != null ? Number(row.owner_id) : null,
      owner_name: row.owner_name ?? null,
      operator_id: row.operator_id != null ? Number(row.operator_id) : null,
      operator_name: row.operator_name ?? null,
    };
  }

  async claimInstanceLock(id: number, userId: number, userName: string): Promise<void> {
    await this.mysqlService.execute(
      `UPDATE checklist_instances
         SET owner_id = ?, owner_name = ?, lock_expires_at = NULL
       WHERE id = ?`,
      [userId, userName, id],
    );
  }

  async releaseInstanceLock(id: number, userId: number): Promise<void> {
    // Ownership is durable now; release no longer clears owner assignment.
    await this.mysqlService.execute(
      `UPDATE checklist_instances
         SET lock_expires_at = NULL
       WHERE id = ? AND owner_id = ?`,
      [id, userId],
    );
  }

  async forceTransferInstanceLock(id: number, toUserId: number, toUserName: string): Promise<void> {
    await this.mysqlService.execute(
      `UPDATE checklist_instances
         SET owner_id = ?, owner_name = ?, lock_expires_at = NULL
       WHERE id = ?`,
      [toUserId, toUserName, id],
    );
  }

  async transferInstanceAssignment(id: number, toUserId: number, toUserName: string): Promise<void> {
    await this.mysqlService.execute(
      `UPDATE checklist_instances
         SET owner_id = ?,
             owner_name = ?,
             lock_expires_at = NULL
       WHERE id = ?
         AND status <> 'submitted'`,
      [toUserId, toUserName, id],
    );
  }

  async bulkTransferInstanceAssignment(instanceIds: number[], toUserId: number, toUserName: string): Promise<number> {
    if (!instanceIds.length) return 0;
    const placeholders = instanceIds.map(() => '?').join(',');
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `UPDATE checklist_instances
         SET owner_id = ?,
             owner_name = ?,
             lock_expires_at = NULL
       WHERE id IN (${placeholders})
         AND status <> 'submitted'`,
      [toUserId, toUserName, ...instanceIds],
    );
    return Number(result.affectedRows || 0);
  }

  // ──────────────────────────────────────────────────────────────────────────

  async updateInstanceItemCompletion(instanceId: number, itemId: number, payload: Record<string, unknown>): Promise<void> {
    const existingRows = await this.mysqlService.query<RowDataPacket[]>('SELECT item_completion FROM checklist_instances WHERE id = ? LIMIT 1', [instanceId]);
    const existing = existingRows[0];

    let completion: Record<string, unknown> = {};
    if (existing?.item_completion) {
      try {
        completion = typeof existing.item_completion === 'string'
          ? JSON.parse(existing.item_completion)
          : (existing.item_completion as Record<string, unknown>);
      } catch {
        completion = {};
      }
    }

    completion[String(itemId)] = payload?.completion ?? null;

    await this.mysqlService.execute(
      'UPDATE checklist_instances SET item_completion = ?, progress_percentage = COALESCE(?, progress_percentage), status = COALESCE(?, status), operator_id = COALESCE(?, operator_id), operator_name = COALESCE(?, operator_name) WHERE id = ?',
      [
        JSON.stringify(completion),
        payload?.progress_percentage ?? null,
        payload?.status ?? null,
        payload?.operator_id ?? null,
        payload?.operator_name ?? null,
        instanceId,
      ],
    );
  }

  async archiveInstance(id: number): Promise<{ success: boolean; error?: string }> {
    const instanceId = Number(id);
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT id, status FROM checklist_instances WHERE id = ? LIMIT 1`, [instanceId]);
    const instance = rows[0];
    if (!instance) return { success: false, error: 'Instance not found' };

    await this.mysqlService.query(
      `UPDATE checklist_instances SET status = 'archived' WHERE id = ?`, [instanceId]);

    return { success: true };
  }

  async deleteInstance(id: number): Promise<{ success: boolean; error?: string }> {
    const instanceId = Number(id);
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT id, status FROM checklist_instances WHERE id = ? LIMIT 1`, [instanceId]);
    const instance = rows[0];
    if (!instance) return { success: false, error: 'Instance not found' };

    const status = String(instance.status || '');
    if (status === 'completed' || status === 'submitted') {
      return { success: false, error: 'Cannot delete a completed/submitted inspection' };
    }

    await this.mysqlService.withTransaction<void>(async (connection) => {
      await connection.execute('DELETE FROM photo_submissions WHERE instance_id = ?', [instanceId]);
      try {
        await connection.execute('DELETE FROM checklist_audit_log WHERE instance_id = ?', [instanceId]);
      } catch {
        // audit log table may not exist in all environments
      }
      await connection.execute('DELETE FROM checklist_instances WHERE id = ?', [instanceId]);
    });

    return { success: true };
  }

  private async replaceTemplateItemsInTransaction(connection: any, templateId: number, items: any[]): Promise<void> {
    if (!Array.isArray(items) || items.length === 0) {
      await connection.execute('DELETE FROM checklist_items WHERE template_id = ?', [templateId]);
      return;
    }

    const [existingRowsRaw] = await connection.query(
      'SELECT id FROM checklist_items WHERE template_id = ?',
      [templateId],
    );
    const existingRows = (existingRowsRaw || []) as Array<{ id?: number | string | null }>;
    const existingIds = new Set<number>(
      (existingRows || [])
        .map((row: { id?: number | string | null }) => Number(row.id || 0))
        .filter((id: number) => id > 0),
    );

    const insertSql = `
      INSERT INTO checklist_items (
        template_id, order_index, parent_id, level, title, description, submission_type,
        is_required, validation_rules, photo_requirements, sample_image_url, sample_images,
        video_requirements, sample_video_url, sample_videos, needs_media_upload, links
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Stack of inserted row IDs indexed by level.
    // Rebuilt per-save so parent_id always reflects the actual DB auto-increment IDs
    // regardless of whether the frontend sent a parent_id or not.
    const insertedIdByLevel: Array<number | null> = [];
    const seenIds = new Set<number>();

    for (const item of items) {
      let normalizedLevel = Number(item?.level ?? 0);
      if (!Number.isInteger(normalizedLevel) || normalizedLevel < 0) {
        normalizedLevel = 0;
      }

      // Trim the stack to the current level so we always reference the nearest ancestor.
      insertedIdByLevel.length = normalizedLevel;
      const persistedParentId = normalizedLevel > 0 ? (insertedIdByLevel[normalizedLevel - 1] ?? null) : null;
      const candidateId = Number(item?.id || 0);
      const canUpdateExisting = candidateId > 0 && existingIds.has(candidateId);

      const needsMediaUpload = this.computeNeedsMediaUpload(item);
      if (canUpdateExisting) {
        await connection.execute(
          `UPDATE checklist_items
           SET order_index = ?, parent_id = ?, level = ?, title = ?, description = ?, submission_type = ?,
               is_required = ?, validation_rules = ?, photo_requirements = ?, sample_image_url = ?, sample_images = ?,
               video_requirements = ?, sample_video_url = ?, sample_videos = ?, needs_media_upload = ?, links = ?
           WHERE id = ? AND template_id = ?`,
          [
            Number(item?.order_index || 0),
            persistedParentId,
            normalizedLevel,
            item?.title || '',
            item?.description ?? null,
            item?.submission_type || 'photo',
            item?.is_required === false ? 0 : 1,
            item?.validation_rules ? JSON.stringify(item.validation_rules) : null,
            item?.photo_requirements ? JSON.stringify(item.photo_requirements) : null,
            item?.sample_image_url ?? null,
            item?.sample_images ? JSON.stringify(item.sample_images) : null,
            item?.video_requirements ? JSON.stringify(item.video_requirements) : null,
            item?.sample_video_url ?? null,
            item?.sample_videos ? JSON.stringify(item.sample_videos) : null,
            needsMediaUpload,
            item?.links ? JSON.stringify(item.links) : null,
            candidateId,
            templateId,
          ],
        );

        insertedIdByLevel[normalizedLevel] = candidateId;
        seenIds.add(candidateId);
      } else {
        const [insertResult] = await connection.execute(insertSql, [
          templateId,
          Number(item?.order_index || 0),
          persistedParentId,
          normalizedLevel,
          item?.title || '',
          item?.description ?? null,
          item?.submission_type || 'photo',
          item?.is_required === false ? 0 : 1,
          item?.validation_rules ? JSON.stringify(item.validation_rules) : null,
          item?.photo_requirements ? JSON.stringify(item.photo_requirements) : null,
          item?.sample_image_url ?? null,
          item?.sample_images ? JSON.stringify(item.sample_images) : null,
          item?.video_requirements ? JSON.stringify(item.video_requirements) : null,
          item?.sample_video_url ?? null,
          item?.sample_videos ? JSON.stringify(item.sample_videos) : null,
          needsMediaUpload,
          item?.links ? JSON.stringify(item.links) : null,
        ]) as [ResultSetHeader, any];

        // Record this row's auto-increment ID so children can reference it.
        insertedIdByLevel[normalizedLevel] = insertResult.insertId;
      }
    }

    const deleteCandidates = [...existingIds].filter((existingId) => !seenIds.has(existingId));
    if (deleteCandidates.length > 0) {
      const placeholders = deleteCandidates.map(() => '?').join(',');
      await connection.execute(
        `DELETE FROM checklist_items WHERE template_id = ? AND id IN (${placeholders})`,
        [templateId, ...deleteCandidates],
      );
    }
  }

  private async detectUnsafeItemMutationInTransaction(
    connection: any,
    templateId: number,
    items: any[],
  ): Promise<{ unsafeMutationBlocked: boolean; instanceCount?: number; blockedItemIds?: number[] }> {
    const [existingRowsRaw] = await connection.query(
      'SELECT id FROM checklist_items WHERE template_id = ?',
      [templateId],
    );
    const existingRows = (existingRowsRaw || []) as Array<{ id?: number | string | null }>;

    const existingIds = (existingRows || [])
      .map((row: { id?: number | string | null }) => Number(row.id || 0))
      .filter((id: number) => id > 0);

    if (existingIds.length === 0) {
      return { unsafeMutationBlocked: false };
    }

    const incomingExistingIds = new Set<number>(
      (Array.isArray(items) ? items : [])
        .map((item) => Number(item?.id || 0))
        .filter((id: number) => id > 0),
    );

    const removedItemIds = existingIds.filter((id: number) => !incomingExistingIds.has(id));
    if (removedItemIds.length === 0) {
      return { unsafeMutationBlocked: false };
    }

    const placeholders = removedItemIds.map(() => '?').join(',');
    const [submissionRowsRaw] = await connection.query(
      `SELECT item_id, instance_id FROM photo_submissions WHERE item_id IN (${placeholders})`,
      removedItemIds,
    );
    const submissionRows = (submissionRowsRaw || []) as Array<{ item_id?: number | string | null; instance_id?: number | string | null }>;

    if (!submissionRows || submissionRows.length === 0) {
      return { unsafeMutationBlocked: false };
    }

    const blockedIds = Array.from(
      new Set<number>(
        submissionRows
          .map((row: { item_id?: number | string | null }) => Number(row.item_id || 0))
          .filter((id: number) => id > 0),
      ),
    );
    const instanceCount = new Set(
      submissionRows
        .map((row: { instance_id?: number | string | null }) => Number(row.instance_id || 0))
        .filter((id: number) => id > 0),
    ).size;

    return {
      unsafeMutationBlocked: true,
      instanceCount,
      blockedItemIds: blockedIds,
    };
  }

  private computeNeedsMediaUpload(item: any): number {
    if (item?.needs_media_upload === true || item?.needs_media_upload === 1 || item?.needs_media_upload === '1') {
      return 1;
    }
    if (item?.needs_media_upload === false || item?.needs_media_upload === 0 || item?.needs_media_upload === '0') {
      return 0;
    }

    const submissionType = String(item?.submission_type || 'photo');
    const sampleImages = Array.isArray(item?.sample_images) ? item.sample_images : [];
    const sampleVideos = Array.isArray(item?.sample_videos) ? item.sample_videos : [];

    const hasSampleImage = !!item?.sample_image_url || sampleImages.length > 0;
    const hasSampleVideo = !!item?.sample_video_url || sampleVideos.length > 0;

    if (submissionType === 'photo') {
      return hasSampleImage ? 0 : 1;
    }
    if (submissionType === 'video') {
      return hasSampleVideo ? 0 : 1;
    }
    if (submissionType === 'either') {
      return hasSampleImage || hasSampleVideo ? 0 : 1;
    }

    return 0;
  }

  private incrementVersion(versionRaw: unknown): string {
    const value = String(versionRaw || '1.0');
    const [majorRaw, minorRaw] = value.split('.');
    const major = Number(majorRaw || 1) || 1;
    const minor = Number(minorRaw || 0) || 0;
    return `${major}.${minor + 1}`;
  }

  private safeParseJson<T>(value: unknown, fallback: T): T {
    if (value == null || value === '') {
      return fallback;
    }

    if (typeof value === 'object') {
      return value as T;
    }

    try {
      return JSON.parse(String(value)) as T;
    } catch {
      return fallback;
    }
  }

  async getConfig(): Promise<RowDataPacket[]> {
    return this.mysqlService.query<RowDataPacket[]>(
      'SELECT config_key, config_value, description, config_type FROM checklist_config ORDER BY config_key',
    );
  }

  async updateConfig(updates: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(updates)) {
      await this.mysqlService.query(
        'UPDATE checklist_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?',
        [String(value), key],
      );
    }
  }

  // ── Draft template owner-lock ─────────────────────────────────────────────

  async getTemplateLock(id: number): Promise<{
    draft_owner_id: number | null;
    draft_owner_name: string | null;
    created_by: number | null;
    is_draft: number;
  }> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      'SELECT draft_owner_id, draft_owner_name, created_by, is_draft FROM checklist_templates WHERE id = ? LIMIT 1',
      [id],
    );
    const row = rows?.[0];
    if (!row) return { draft_owner_id: null, draft_owner_name: null, created_by: null, is_draft: 0 };
    return {
      draft_owner_id: row.draft_owner_id != null ? Number(row.draft_owner_id) : null,
      draft_owner_name: row.draft_owner_name ?? null,
      created_by: row.created_by != null ? Number(row.created_by) : null,
      is_draft: Number(row.is_draft ?? 0),
    };
  }

  async claimTemplateLock(id: number, userId: number, userName: string): Promise<void> {
    await this.mysqlService.execute(
      `UPDATE checklist_templates
         SET draft_owner_id = ?, draft_owner_name = ?, draft_lock_expires_at = NULL
       WHERE id = ? AND is_draft = 1
         AND (draft_owner_id IS NULL OR draft_owner_id = ?)`,
      [userId, userName, id, userId],
    );
  }

  async releaseTemplateLock(id: number, userId: number): Promise<void> {
    await this.mysqlService.execute(
      `UPDATE checklist_templates
         SET draft_owner_id = NULL, draft_owner_name = NULL, draft_lock_expires_at = NULL
       WHERE id = ? AND draft_owner_id = ?`,
      [id, userId],
    );
  }

  async transferTemplateDraftOwner(id: number, toUserId: number, toUserName: string): Promise<void> {
    await this.mysqlService.execute(
      `UPDATE checklist_templates
         SET draft_owner_id = ?,
             draft_owner_name = ?,
             draft_lock_expires_at = NULL
       WHERE id = ? AND is_draft = 1`,
      [toUserId, toUserName, id],
    );
  }
}
