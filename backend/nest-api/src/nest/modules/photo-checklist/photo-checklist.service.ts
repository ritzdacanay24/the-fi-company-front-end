import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { RowDataPacket } from 'mysql2/promise';
import { PhotoChecklistRepository } from './photo-checklist.repository';
import { FileStorageService } from '../file-storage/file-storage.service';

type ChecklistItemRow = RowDataPacket & {
  id?: number | string;
  parent_id?: number | string | null;
  sample_images?: unknown;
  sample_videos?: unknown;
  photo_requirements?: unknown;
  video_requirements?: unknown;
  links?: unknown;
};

type ChecklistItemNode = Record<string, unknown> & {
  id: number | string;
  parent_id?: number | string | null;
  children: ChecklistItemNode[];
};

@Injectable()
export class PhotoChecklistService {
  private readonly checklistMediaPublicOrigin = this.resolveChecklistMediaPublicOrigin();

  constructor(
    private readonly repository: PhotoChecklistRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async getTemplates(options?: { includeInactive?: boolean; includeDeleted?: boolean }) {
    return this.repository.getTemplates(options);
  }

  async getTemplateById(id: number, options?: { includeInactive?: boolean; includeDeleted?: boolean }) {
    const template = await this.repository.getTemplateById(id, options);
    if (!template) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_TEMPLATE_NOT_FOUND',
        message: `Checklist template with id ${id} not found`,
      });
    }

    const items = await this.repository.getTemplateItems(id);
    return {
      ...template,
      items: this.buildNestedItems(items),
    };
  }

  async getInstances(filters?: { status?: string; workOrder?: string }) {
    return this.repository.getInstances(filters);
  }

  async createInstance(payload: {
    template_id: number;
    work_order_number: string;
    part_number?: string;
    serial_number?: string;
    operator_id?: number | null;
    operator_name?: string;
    status?: string;
  }) {
    const insertId = await this.repository.createInstance(payload);
    return {
      success: true,
      instance_id: insertId,
    };
  }

  async createTemplate(payload: Record<string, unknown>) {
    const templateId = await this.repository.createTemplate(payload);
    const template = await this.getTemplateById(templateId, { includeInactive: true });
    return { success: true, template_id: templateId, template };
  }

  async updateTemplate(id: number, payload: Record<string, unknown>) {
    await this.repository.updateTemplate(id, payload);
    const template = await this.getTemplateById(id, { includeInactive: true });
    return { success: true, template_id: id, template };
  }

  async deleteTemplate(id: number) {
    const result = await this.repository.deleteTemplate(id);
    if (result.activeInstances > 0) {
      return {
        success: false,
        error: 'ACTIVE_INSTANCES_EXIST',
        instance_count: result.activeInstances,
        message: 'Template has active checklist instances',
      };
    }

    return { success: true };
  }

  async hardDeleteTemplate(id: number) {
    const result = await this.repository.hardDeleteTemplate(id);
    if (!result.success) {
      return result;
    }
    return { success: true };
  }

  async discardDraft(id: number) {
    const result = await this.repository.discardDraft(id);
    if (!result.success) {
      return result;
    }
    return { success: true, template_id: id };
  }

  async restoreTemplate(id: number) {
    await this.repository.restoreTemplate(id);
    return { success: true, template_id: id };
  }

  async publishTemplate(id: number) {
    const result = await this.repository.publishTemplate(id);
    if (!result.success) {
      return result;
    }
    const template = await this.getTemplateById(id, { includeInactive: true });
    return { success: true, template_id: id, template };
  }

  async deleteMajorVersion(groupId: number, major: number) {
    return this.repository.deleteMajorVersion(groupId, major);
  }

  async createParentVersion(sourceTemplateId: number) {
    const newTemplateId = await this.repository.createParentVersion(sourceTemplateId);
    if (!newTemplateId) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_TEMPLATE_NOT_FOUND',
        message: `Checklist template with id ${sourceTemplateId} not found`,
      });
    }

    const template = await this.getTemplateById(newTemplateId, { includeInactive: true });
    return { success: true, template_id: newTemplateId, template };
  }

  async getTemplateHistory(options: { groupId?: number; templateId?: number }) {
    return this.repository.getTemplateHistory(options);
  }

  async compareTemplates(sourceId: number, targetId: number) {
    return this.repository.compareTemplates(sourceId, targetId);
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
  }) {
    return this.repository.searchInstances(criteria);
  }

  async getInstanceById(id: number) {
    const instance = await this.repository.getInstanceById(id);
    if (!instance) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_INSTANCE_NOT_FOUND',
        message: `Checklist instance with id ${id} not found`,
      });
    }

    return {
      ...instance,
      item_completion: this.normalizeInstanceItemCompletionMediaUrls(instance.item_completion),
    };
  }

  async updateInstance(id: number, payload: Record<string, unknown>) {
    await this.repository.updateInstance(id, payload);
    return { success: true };
  }

  async updateInstanceItemCompletion(instanceId: number, itemId: number, payload: Record<string, unknown>) {
    await this.repository.updateInstanceItemCompletion(instanceId, itemId, payload);
    return { success: true, instance_id: instanceId, item_id: itemId };
  }

  async uploadMedia(
    instanceId: number,
    itemId: number,
    file?: { originalname?: string; mimetype?: string; size?: number; buffer?: Buffer },
    options?: { captureSource?: string; userId?: string },
  ) {
    const subFolder = 'inspectionCheckList';
    const fileName = await this.fileStorageService.storeUploadedFile(file, subFolder);
    const baseLink = this.fileStorageService.resolveLink(fileName, subFolder)
      || `/uploads/${subFolder}/${encodeURIComponent(fileName)}`;
    const fileUrl = this.normalizeChecklistMediaUrl(baseLink, { fileName, subFolder });
    const fileType = String(file?.mimetype || '').toLowerCase().includes('video') ? 'video' : 'image';
    const captureSource = this.normalizeCaptureSource(options?.captureSource);

    const uploadPayload = {
      instance_id: instanceId,
      item_id: itemId,
      file_name: fileName,
      file_path: fileUrl,
      file_url: fileUrl,
      file_type: fileType,
      file_size: Number(file?.size || 0),
      mime_type: file?.mimetype || '',
      photo_metadata: JSON.stringify({ capture_source: captureSource }),
    };

    const insertId = await this.repository.createPhotoSubmission(uploadPayload);
    const resolvedId = insertId > 0
      ? insertId
      : await this.repository.findPhotoSubmissionIdByLocator(instanceId, itemId, [fileUrl]);
    const media = resolvedId ? await this.repository.getPhotoSubmissionById(resolvedId) : null;

    return {
      success: true,
      file_url: fileUrl,
      media: {
        id: Number(media?.id || resolvedId || insertId || 0),
        item_id: Number(media?.item_id || itemId),
        file_url: this.normalizeChecklistMediaUrl(String(media?.file_url || fileUrl), { fileName, subFolder }),
        file_type: (String(media?.file_type || fileType) === 'video' ? 'video' : 'image') as 'video' | 'image',
        file_name: String(media?.file_name || fileName),
        created_at: (media?.created_at as string | null) ?? null,
      },
      user_id: options?.userId || null,
    };
  }

  async deleteMediaById(id: number) {
    const media = await this.repository.getPhotoSubmissionById(id);
    if (!media) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_MEDIA_NOT_FOUND',
        message: 'Media not found',
      });
    }

    const storageInfo = this.extractStorageInfo(media?.photo_metadata, String(media?.file_name || ''));
    if (storageInfo?.bucket && storageInfo?.key) {
      await this.fileStorageService.deleteStoredFileInBucket(storageInfo.key, storageInfo.bucket);
    } else {
      const fileName = String(media.file_name || '').trim();
      if (fileName) {
        await this.fileStorageService.deleteStoredFile(fileName, 'inspectionCheckList');
      }
    }

    const affectedRows = await this.repository.deletePhotoSubmissionById(id);
    if (affectedRows < 1) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_MEDIA_NOT_FOUND',
        message: 'Media not found',
      });
    }

    return { success: true, deleted_id: id };
  }

  async deleteMediaByLocator(instanceId: number, itemId: number, fileUrl: string) {
    const normalizedInstanceId = Number(instanceId || 0);
    const normalizedItemId = Number(itemId || 0);
    const candidates = this.normalizeMediaLocatorCandidates(fileUrl);

    if (normalizedInstanceId <= 0 || normalizedItemId <= 0 || candidates.length === 0) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_MEDIA_LOCATOR_INVALID',
        message: 'Missing required locator fields',
      });
    }

    const mediaId = await this.repository.findPhotoSubmissionIdByLocator(
      normalizedInstanceId,
      normalizedItemId,
      candidates,
    );

    if (!mediaId) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_MEDIA_NOT_FOUND',
        message: 'Media not found for provided locator',
      });
    }

    return this.deleteMediaById(mediaId);
  }

  async deleteInstance(id: number) {
    const result = await this.repository.deleteInstance(id);
    if (!result.success) {
      return result;
    }
    return { success: true };
  }

  async listShareTokens(instanceId: number) {
    const tokens = await this.repository.getShareTokensByInstanceId(instanceId);
    return { success: true, tokens };
  }

  async createShareToken(payload: {
    instance_id: number;
    visible_item_ids?: number[] | null;
    label?: string | null;
    expires_at?: string | null;
    created_by?: number | null;
    created_by_name?: string | null;
  }) {
    const instanceId = Number(payload.instance_id || 0);
    if (!instanceId) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_INSTANCE_NOT_FOUND',
        message: 'Checklist instance not found',
      });
    }

    const instance = await this.repository.getInstanceById(instanceId);
    if (!instance) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_INSTANCE_NOT_FOUND',
        message: `Checklist instance with id ${instanceId} not found`,
      });
    }

    const token = randomBytes(24).toString('hex');
    const visibleItemIds = Array.isArray(payload.visible_item_ids) && payload.visible_item_ids.length
      ? payload.visible_item_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : null;

    await this.repository.createShareToken({
      token,
      instanceId,
      visibleItemIds,
      label: payload.label || null,
      expiresAt: payload.expires_at || null,
      createdBy: payload.created_by ?? null,
      createdByName: payload.created_by_name ?? null,
    });

    return {
      success: true,
      token,
      expires_at: payload.expires_at || null,
      label: payload.label || '',
    };
  }

  async deleteShareToken(id: number) {
    await this.repository.deleteShareToken(id);
    return { success: true };
  }

  async getPublicReport(token: string) {
    const row = await this.repository.getActiveShareToken(token);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_REPORT_NOT_FOUND',
        message: 'Report not found or link has expired.',
      });
    }

    await this.repository.incrementShareTokenAccess(token);

    const instanceId = Number(row.instance_id);
    const templateId = Number(row.template_id);
    const visibleItemIds = this.safeParseJson<number[] | null>(row.visible_item_ids, null);

    let items = await this.repository.getChecklistItemsByTemplateId(templateId);
    if (Array.isArray(visibleItemIds) && visibleItemIds.length) {
      const visibleSet = new Set(visibleItemIds.map((id) => Number(id)));
      items = items.filter((item) => visibleSet.has(Number(item.id)));
    }

    const mediaRows = await this.repository.getPhotoSubmissionsByInstanceId(instanceId);
    const mediaByItemId = new Map<number, RowDataPacket[]>();
    for (const media of mediaRows) {
      const itemId = Number(media.item_id || 0);
      if (!mediaByItemId.has(itemId)) {
        mediaByItemId.set(itemId, []);
      }
      mediaByItemId.get(itemId)?.push(media);
    }

    const itemCompletionEntries = this.safeParseJson<any[]>(row.item_completion, []);
    const itemCompletionById = new Map<number, any>();
    for (const entry of itemCompletionEntries) {
      const baseItemId = this.extractBaseItemId(entry?.itemId);
      if (baseItemId > 0) {
        itemCompletionById.set(baseItemId, entry);
      }
    }

    const instanceDone = ['completed', 'submitted'].includes(String(row.status || ''));
    const mergedItems = items.map((item) => {
      const itemId = Number(item.id || 0);
      const media = mediaByItemId.get(itemId) || [];
      const photos = media.filter((entry) => String(entry.file_type || '') !== 'video');
      const videos = media.filter((entry) => String(entry.file_type || '') === 'video');
      const completion = itemCompletionById.get(itemId) || null;
      const hasMedia = photos.length > 0 || videos.length > 0;
      const isCompleted = completion && Object.prototype.hasOwnProperty.call(completion, 'completed')
        ? !!completion.completed || (instanceDone && hasMedia)
        : hasMedia || instanceDone;

      return {
        ...item,
        photo_requirements: this.safeParseJson(item.photo_requirements, null),
        links: this.safeParseJson(item.links, []),
        submission_type: item.submission_type || null,
        photos: photos.map((photo) => {
          const meta = this.safeParseJson<Record<string, unknown> | null>(photo.photo_metadata, null);
          return {
            url: this.normalizeChecklistMediaUrl(String(photo.file_url || ''), { subFolder: 'inspectionCheckList' }),
            source: meta && typeof meta === 'object' ? (meta['capture_source'] as string | null) : null,
          };
        }),
        videos: videos.map((video) => this.normalizeChecklistMediaUrl(String(video.file_url || ''), { subFolder: 'inspectionCheckList' })),
        notes: completion?.notes || '',
        completed: isCompleted,
        completed_at: completion?.completedAt || null,
        completed_by: completion?.completedByName || null,
        last_modified_at: completion?.lastModifiedAt || null,
        last_modified_by: completion?.lastModifiedByName || null,
      };
    });

    return {
      success: true,
      token,
      label: row.label || null,
      expires_at: row.expires_at || null,
      instance: {
        id: instanceId,
        work_order_number: row.work_order_number,
        part_number: row.part_number,
        serial_number: row.serial_number,
        operator_name: row.operator_name,
        status: row.status,
        progress_percentage: row.progress_percentage,
        template_name: row.template_name,
        template_description: row.template_description,
        template_version: row.template_version,
        customer_name: row.customer_name,
        submitted_at: row.submitted_at,
        completed_at: row.completed_at,
        created_at: row.instance_created_at,
      },
      items: mergedItems,
      total_items: mergedItems.length,
    };
  }

  private buildNestedItems(items: RowDataPacket[]): ChecklistItemNode[] {
    const normalized: ChecklistItemNode[] = [];

    for (const item of items as ChecklistItemRow[]) {
      const id = item.id;
      if (id == null || id === '') {
        continue;
      }

      normalized.push({
        ...(item as Record<string, unknown>),
        id,
        parent_id: item.parent_id ?? null,
        sample_images: this.safeParseJson(item.sample_images, []),
        sample_videos: this.safeParseJson(item.sample_videos, []),
        photo_requirements: this.safeParseJson(item.photo_requirements, {}),
        video_requirements: this.safeParseJson(item.video_requirements, {}),
        links: this.safeParseJson(item.links, []),
        children: [],
      });
    }

    const byId = new Map<number, ChecklistItemNode>();
    normalized.forEach((item) => byId.set(Number(item.id), item));

    const roots: ChecklistItemNode[] = [];
    normalized.forEach((item) => {
      const parentId = Number(item.parent_id || 0);
      if (parentId > 0 && byId.has(parentId)) {
        const parent = byId.get(parentId);
        const children = parent?.children || [];
        children.push(item);
        if (parent) {
          parent.children = children;
        }
      } else {
        roots.push(item);
      }
    });

    return roots;
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

  private extractBaseItemId(rawItemId: unknown): number {
    if (typeof rawItemId === 'string' && rawItemId.includes('_')) {
      const parts = rawItemId.split('_');
      return Number(parts[parts.length - 1] || 0);
    }

    return Number(rawItemId || 0);
  }

  private normalizeMediaLocatorCandidates(fileUrl: string): string[] {
    const raw = String(fileUrl || '').trim();
    if (!raw) {
      return [];
    }

    const rawNoQuery = raw.replace(/\?.*$/, '');

    let path = raw;
    if (/^https?:\/\//i.test(raw)) {
      try {
        const parsed = new URL(raw);
        path = parsed.pathname || '';
      } catch {
        path = raw;
      }
    }

    path = decodeURIComponent(path.replace(/\?.*$/, ''));
    path = `/${path.replace(/^\/+/, '')}`;
    const trimmed = path.replace(/^\//, '');

    const candidates = [raw, rawNoQuery, path, trimmed, `/${trimmed}`]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    return Array.from(new Set(candidates));
  }

  private normalizeCaptureSource(rawSource?: string): 'in-app' | 'library' | 'system' | null {
    const source = String(rawSource || '').trim().toLowerCase();
    if (!source) {
      return null;
    }

    if (source === 'in-app' || source === 'app' || source === 'browser') {
      return 'in-app';
    }

    if (source === 'library' || source === 'gallery' || source === 'upload' || source === 'file') {
      return 'library';
    }

    if (source === 'system' || source === 'camera' || source === 'native-camera' || source === 'device-camera') {
      return 'system';
    }

    return null;
  }

  private resolveChecklistMediaPublicOrigin(): string {
    const candidates = [
      process.env.ATTACHMENTS_PUBLIC_ORIGIN,
      process.env.DASHBOARD_WEB_BASE_URL,
      process.env.ATTACHMENTS_FS_REMOTE_BASE_URL,
    ];

    for (const candidate of candidates) {
      const value = String(candidate || '').trim();
      if (!value) {
        continue;
      }

      try {
        const parsed = new URL(value);
        return `${parsed.protocol}//${parsed.host}`;
      } catch {
        // Ignore malformed values and continue.
      }
    }

    return '';
  }

  private normalizeChecklistMediaUrl(
    rawUrl: string,
    options?: { fileName?: string; subFolder?: string },
  ): string {
    const raw = String(rawUrl || '').trim();

    if (!raw && options?.fileName) {
      const fallback = this.fileStorageService.resolveLink(options.fileName, options.subFolder || 'inspectionCheckList');
      if (fallback) {
        return this.normalizeChecklistMediaUrl(fallback);
      }
      return '';
    }

    if (!raw) {
      return '';
    }

    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }

    const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
    if (!this.checklistMediaPublicOrigin) {
      return normalizedPath;
    }

    return `${this.checklistMediaPublicOrigin}${normalizedPath}`;
  }

  private normalizeInstanceItemCompletionMediaUrls(rawCompletion: unknown): unknown {
    if (rawCompletion == null || rawCompletion === '') {
      return rawCompletion;
    }

    const isStringPayload = typeof rawCompletion === 'string';
    const parsed = this.safeParseJson<unknown>(rawCompletion, rawCompletion);

    if (!Array.isArray(parsed)) {
      return rawCompletion;
    }

    const normalizedEntries = parsed.map((entry) => this.normalizeCompletionEntryMediaUrls(entry));
    return isStringPayload ? JSON.stringify(normalizedEntries) : normalizedEntries;
  }

  private normalizeCompletionEntryMediaUrls(entry: unknown): unknown {
    if (!entry || typeof entry !== 'object') {
      return entry;
    }

    const data = { ...(entry as Record<string, unknown>) };
    data.photos = this.normalizeCompletionMediaArray(data.photos);
    data.videos = this.normalizeCompletionMediaArray(data.videos);
    data.photoUrls = this.normalizeCompletionMediaArray(data.photoUrls);
    data.videoUrls = this.normalizeCompletionMediaArray(data.videoUrls);
    data.photoMeta = this.normalizeCompletionMediaMeta(data.photoMeta);
    data.videoMeta = this.normalizeCompletionMediaMeta(data.videoMeta);

    return data;
  }

  private normalizeCompletionMediaArray(value: unknown): unknown {
    if (!Array.isArray(value)) {
      return value;
    }

    return value.map((item) => {
      if (typeof item === 'string') {
        return this.normalizeChecklistMediaUrl(item, { subFolder: 'inspectionCheckList' });
      }

      if (!item || typeof item !== 'object') {
        return item;
      }

      const record = { ...(item as Record<string, unknown>) };

      if (typeof record.file_url === 'string') {
        record.file_url = this.normalizeChecklistMediaUrl(record.file_url, { subFolder: 'inspectionCheckList' });
      }

      if (typeof record.url === 'string') {
        record.url = this.normalizeChecklistMediaUrl(record.url, { subFolder: 'inspectionCheckList' });
      }

      return record;
    });
  }

  private normalizeCompletionMediaMeta(value: unknown): unknown {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return value;
    }

    const normalized: Record<string, unknown> = {};

    for (const [rawKey, metaValue] of Object.entries(value as Record<string, unknown>)) {
      const normalizedKey = this.normalizeChecklistMediaUrl(rawKey, { subFolder: 'inspectionCheckList' });
      normalized[normalizedKey] = metaValue;
    }

    return normalized;
  }

  private extractStorageInfo(
    rawMetadata: unknown,
    fallbackKey: string,
  ): { bucket: string; key: string } | null {
    if (!rawMetadata) {
      return null;
    }

    let metadata: any;
    if (typeof rawMetadata === 'string') {
      try {
        metadata = JSON.parse(rawMetadata);
      } catch {
        metadata = null;
      }
    } else if (typeof rawMetadata === 'object') {
      metadata = rawMetadata;
    }

    const storage = metadata?.storage;
    const bucket = String(storage?.bucket || '').trim();
    const key = String(storage?.key || fallbackKey || '').trim();

    if (!bucket || !key) {
      return null;
    }

    return { bucket, key };
  }

  async getConfig() {
    return this.repository.getConfig();
  }

  async updateConfig(updates: Record<string, string>) {
    await this.repository.updateConfig(updates);
    return { success: true };
  }
}
