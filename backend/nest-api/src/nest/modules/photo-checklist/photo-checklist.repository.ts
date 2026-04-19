import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class PhotoChecklistRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getTemplates(options?: { includeInactive?: boolean; includeDeleted?: boolean }): Promise<RowDataPacket[]> {
    const includeInactive = !!options?.includeInactive;
    const sql = `
      SELECT t.*,
        COALESCE(i.item_count, 0) AS item_count,
        COALESCE(i.pending_media_items, 0) AS pending_media_items,
        COALESCE(a.active_instances, 0) AS active_instances
      FROM checklist_templates t
      LEFT JOIN (
        SELECT template_id,
               COUNT(*) AS item_count,
               SUM(CASE WHEN needs_media_upload = 1 THEN 1 ELSE 0 END) AS pending_media_items
        FROM checklist_items
        GROUP BY template_id
      ) i ON i.template_id = t.id
      LEFT JOIN (
        SELECT template_id, COUNT(*) AS active_instances
        FROM checklist_instances
        WHERE status IN ('draft', 'in_progress', 'review')
        GROUP BY template_id
      ) a ON a.template_id = t.id
      ${includeInactive ? '' : 'WHERE t.is_active = 1'}
      ORDER BY t.updated_at DESC
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql);
  }

  async getTemplateById(id: number, options?: { includeInactive?: boolean; includeDeleted?: boolean }): Promise<RowDataPacket | null> {
    const includeInactive = !!options?.includeInactive;
    const sql = `
      SELECT t.*,
        COALESCE(i.item_count, 0) AS item_count,
        COALESCE(i.pending_media_items, 0) AS pending_media_items,
        COALESCE(a.active_instances, 0) AS active_instances
      FROM checklist_templates t
      LEFT JOIN (
        SELECT template_id,
               COUNT(*) AS item_count,
               SUM(CASE WHEN needs_media_upload = 1 THEN 1 ELSE 0 END) AS pending_media_items
        FROM checklist_items
        GROUP BY template_id
      ) i ON i.template_id = t.id
      LEFT JOIN (
        SELECT template_id, COUNT(*) AS active_instances
        FROM checklist_instances
        WHERE status IN ('draft', 'in_progress', 'review')
        GROUP BY template_id
      ) a ON a.template_id = t.id
      WHERE t.id = ?
      ${includeInactive ? '' : 'AND t.is_active = 1'}
      LIMIT 1
    `;

    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [id]);
    return rows[0] || null;
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
      SELECT ci.*, t.name AS template_name, t.description AS template_description,
        t.version AS template_version, t.category AS template_category
      FROM checklist_instances ci
      INNER JOIN checklist_templates t ON t.id = ci.template_id
      ${whereClause}
      ORDER BY ci.updated_at DESC
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
        operator_id, operator_name, status, progress_percentage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [
      payload.template_id,
      payload.work_order_number,
      payload.part_number || null,
      payload.serial_number || null,
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
        is_draft, published_at, last_autosave_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const initialTemplateGroupId = Number(payload?.template_group_id || 0);
    const isDraft = payload?.is_draft === 1 || payload?.is_draft === true ? 1 : 0;
    const isActive = payload?.is_active === 0 || payload?.is_active === false ? 0 : 1;

    return this.mysqlService.withTransaction<number>(async (connection) => {
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
        payload?.created_by ?? null,
        initialTemplateGroupId,
        isDraft,
        payload?.published_at ?? null,
        payload?.last_autosave_at ?? null,
      ]);

      const templateId = insertResult.insertId;

      if (!initialTemplateGroupId) {
        await connection.execute('UPDATE checklist_templates SET template_group_id = ? WHERE id = ?', [templateId, templateId]);
      }

      await this.replaceTemplateItemsInTransaction(connection, templateId, payload?.items || []);

      return templateId;
    });
  }

  async updateTemplate(id: number, payload: any): Promise<void> {
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

    await this.mysqlService.withTransaction<void>(async (connection) => {
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
        payload?.version || '1.0',
        payload?.parent_template_id ?? null,
        isActive,
        payload?.created_by ?? null,
        isDraft,
        payload?.published_at ?? null,
        payload?.last_autosave_at ?? null,
        id,
      ]);

      if (Array.isArray(payload?.items)) {
        await this.replaceTemplateItemsInTransaction(connection, id, payload.items);
      }
    });
  }

  async deleteTemplate(id: number): Promise<{ activeInstances: number }> {
    const activeInstancesRows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count
       FROM checklist_instances
       WHERE template_id = ? AND status IN ('draft', 'in_progress', 'review')`,
      [id],
    );

    const activeInstances = Number(activeInstancesRows?.[0]?.count || 0);
    if (activeInstances > 0) {
      return { activeInstances };
    }

    await this.mysqlService.execute('UPDATE checklist_templates SET is_active = 0 WHERE id = ?', [id]);
    return { activeInstances: 0 };
  }

  async hardDeleteTemplate(id: number): Promise<{ success: boolean }> {
    await this.mysqlService.execute('DELETE FROM checklist_templates WHERE id = ?', [id]);
    return { success: true };
  }

  async discardDraft(id: number): Promise<{ success: boolean }> {
    await this.mysqlService.execute('DELETE FROM checklist_templates WHERE id = ? AND is_draft = 1', [id]);
    return { success: true };
  }

  async restoreTemplate(id: number): Promise<{ success: boolean }> {
    await this.mysqlService.execute('UPDATE checklist_templates SET is_active = 1 WHERE id = ?', [id]);
    return { success: true };
  }

  async createParentVersion(sourceTemplateId: number): Promise<number> {
    return this.mysqlService.withTransaction<number>(async (connection) => {
      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM checklist_templates WHERE id = ? LIMIT 1',
        [sourceTemplateId],
      );
      const source = rows[0];
      if (!source) {
        return 0;
      }

      const nextVersion = this.incrementVersion(source.version);
      const [insertResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO checklist_templates (
          quality_document_id, quality_revision_id, name, description, part_number,
          customer_part_number, customer_name, revision, original_filename, review_date,
          revision_number, revision_details, revised_by, product_type, category,
          version, parent_template_id, is_active, created_by, template_group_id,
          is_draft, published_at, last_autosave_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)` ,
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
          nextVersion,
          source.id,
          1,
          source.created_by ?? null,
          source.template_group_id || source.id,
          null,
          null,
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
        FROM checklist_items
        WHERE template_id = ?`,
        [newTemplateId, sourceTemplateId],
      );

      return newTemplateId;
    });
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
      `SELECT ci.*, t.name AS template_name
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

  async deleteInstance(id: number): Promise<void> {
    await this.mysqlService.execute('DELETE FROM checklist_instances WHERE id = ?', [id]);
  }

  private async replaceTemplateItemsInTransaction(connection: any, templateId: number, items: any[]): Promise<void> {
    await connection.execute('DELETE FROM checklist_items WHERE template_id = ?', [templateId]);

    if (!Array.isArray(items) || items.length === 0) {
      return;
    }

    const insertSql = `
      INSERT INTO checklist_items (
        template_id, order_index, parent_id, level, title, description, submission_type,
        is_required, validation_rules, photo_requirements, sample_image_url, sample_images,
        video_requirements, sample_video_url, sample_videos, needs_media_upload, links
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const item of items) {
      const needsMediaUpload = this.computeNeedsMediaUpload(item);
      await connection.execute(insertSql, [
        templateId,
        Number(item?.order_index || 0),
        item?.parent_id ?? null,
        Number(item?.level || 0),
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
      ]);
    }
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
}
