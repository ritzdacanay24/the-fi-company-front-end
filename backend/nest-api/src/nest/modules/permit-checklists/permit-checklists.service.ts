import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { basename } from 'path';
import PDFDocument from 'pdfkit';
import { PermitChecklistsRepository } from './permit-checklists.repository';
import { FileStorageService } from '../file-storage/file-storage.service';
import { AttachmentsRepository } from '../attachments/attachments.repository';

const PERMIT_ATTACHMENT_FIELD = 'permit-checklist';

type TicketStatus = 'draft' | 'saved' | 'submitted' | 'finalized' | 'archived';

export interface PermitChecklistUploadFile {
  buffer: Buffer;
  size?: number;
  mimetype?: string;
  originalname?: string;
}

@Injectable()
export class PermitChecklistsService {
  private readonly permitChecklistSubFolder = 'permitChecklists';

  constructor(
    private readonly repository: PermitChecklistsRepository,
    private readonly storageService: FileStorageService,
    private readonly attachmentsRepository: AttachmentsRepository,
  ) {}

  async getTicketPdf(ticketIdInput: string | undefined): Promise<{ buffer: Buffer; fileName: string }> {
    const ticketId = String(ticketIdInput || '').trim();
    if (!ticketId) {
      throw new NotFoundException('ticketId is required');
    }

    const row = await this.repository.getTicketById(ticketId);
    if (!row) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const values = this.decodeJsonObject(row.values_json);
    const financials = this.decodeJsonObject(row.financials_json);
    const attachments = this.decodeJsonArray(row.attachments_json);

    const fileName = `${this.sanitizeFileBase(ticketId)}.pdf`;
    const buffer = await this.generateTicketPdfBuffer({
      ticketId: String(row.ticket_id),
      formType: String(row.form_type || '').toUpperCase(),
      status: String(row.status || '-').toUpperCase(),
      createdBy: String(row.created_by || '-'),
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
      finalizedAt: row.finalized_at ? this.toIso(row.finalized_at) : '',
      values,
      financials,
      attachments,
    });

    return { buffer, fileName };
  }

  async uploadAttachment(ticketIdInput: string | undefined, file: PermitChecklistUploadFile, uploadedByInput?: string) {
    const ticketId = String(ticketIdInput || '').trim();
    if (!ticketId) {
      return { success: false, error: 'ticketId is required' };
    }

    if (!file || !file.buffer) {
      return { success: false, error: 'file is required' };
    }

    const originalName = String(file.originalname || 'attachment').trim() || 'attachment';
    const shouldUseBucket = this.shouldUseBucketStorage();

    const stored = shouldUseBucket
      ? await this.storageService.storeUploadedFileInBucket(file, {
          keyPrefix: `${this.permitChecklistSubFolder}/${this.sanitizePathSegment(ticketId)}`,
        })
      : null;

    const storedFileName = stored?.fileName || (await this.storageService.storeUploadedFile(file, this.permitChecklistSubFolder));
    const link = stored?.key
      ? this.normalizeBucketLink(stored.key)
      : this.storageService.resolveLink(storedFileName, this.permitChecklistSubFolder) || '';

    const ext = originalName.includes('.') ? originalName.split('.').pop()?.toLowerCase() || '' : '';
    const now = this.formatDateTime(new Date());

    // Write metadata to shared attachments table
    const insertId = await this.attachmentsRepository.createAttachment({
      fileName: originalName,
      link,
      createdBy: this.truncate(String(uploadedByInput || 'Unknown User'), 255),
      createdDate: now,
      field: PERMIT_ATTACHMENT_FIELD,
      uniqueId: ticketId,
      fileSize: Number(file.size || 0),
      ext,
      active: 1,
      storage_source: stored?.key ? 'bucket' : 'local',
      storage_bucket: stored?.bucket || '',
      storage_key: stored?.key || '',
    });

    return {
      success: true,
      data: {
        id: String(insertId),
        ticketId,
        fileName: originalName,
        fileSize: Number(file.size || 0),
        mimeType: String(file.mimetype || 'application/octet-stream'),
        uploadedAt: new Date().toISOString(),
        uploadedBy: this.truncate(String(uploadedByInput || 'Unknown User'), 255),
        fieldKey: 'general',
        fieldLabel: 'General Attachment',
        link,
        storage_source: stored?.key ? 'bucket' : 'local',
        storage_bucket: stored?.bucket || null,
        storage_key: stored?.key || null,
        storedFileName,
      },
    };
  }

  async bootstrap() {
    const [ticketRows, txRows, customerRows, architectRows, defaultRows] = await Promise.all([
      this.repository.getTickets(),
      this.repository.getTransactions(),
      this.repository.getCustomers(),
      this.repository.getArchitects(),
      this.repository.getBillingDefaults(),
    ]);

    const tickets = await Promise.all(
      ticketRows.map(async (row) => {
        const ticketId = String(row.ticket_id);

        // Merge shared attachments with legacy JSON attachments so older files stay visible during migration.
        const sharedAttachments = await this.attachmentsRepository.find({
          field: PERMIT_ATTACHMENT_FIELD,
          uniqueId: ticketId,
        });

        const legacyAttachments = await this.resolveAttachmentsForResponse(this.decodeJsonArray(row.attachments_json));

        const mappedSharedAttachments = sharedAttachments.map((a: any) => ({
          id: String(a.id),
          fileName: String(a.fileName || ''),
          link: String(a.link || ''),
          uploadedBy: String(a.createdByName || a.createdBy || 'Unknown'),
          uploadedAt: String(a.createdDate || ''),
          fileSize: Number(a.fileSize || 0),
          mimeType: '',
          storage_source: String(a.storage_source || ''),
          storage_bucket: String(a.storage_bucket || ''),
          storage_key: String(a.storage_key || ''),
        }));

        const attachments = this.dedupeAttachmentList([
          ...mappedSharedAttachments,
          ...legacyAttachments,
        ]);

        return {
          ticketId,
          formType: String(row.form_type),
          createdBy: String(row.created_by),
          createdAt: this.toIso(row.created_at),
          updatedAt: this.toIso(row.updated_at),
          finalizedAt: row.finalized_at ? this.toIso(row.finalized_at) : null,
          status: String(row.status),
          values: this.decodeJsonObject(row.values_json),
          fieldUpdatedAt: this.decodeJsonObject(row.field_updated_at_json),
          processNoteRecords: this.decodeJsonArray(row.process_notes_json),
          financials: this.decodeJsonObject(row.financials_json),
          attachments,
        };
      }),
    );

    const transactions = txRows.map((row) => ({
      id: String(row.id),
      ticketId: String(row.ticket_id),
      type: String(row.type),
      timestamp: this.toIso(row.event_timestamp),
      actor: row.actor ? String(row.actor) : null,
      details: this.decodeJsonObjectNullable(row.details_json),
    }));

    const customerBillingDefaultsByType: Record<string, Array<Record<string, unknown>>> = {
      seismic: [],
      dca: [],
    };

    for (const row of defaultRows) {
      const formType = String(row.form_type);
      if (!customerBillingDefaultsByType[formType]) {
        continue;
      }

      customerBillingDefaultsByType[formType].push({
        key: String(row.fee_key),
        label: String(row.label),
        amount: Number(Number(row.amount || 0).toFixed(2)),
        isApprovedAmount: false,
      });
    }

    return {
      success: true,
      data: {
        tickets,
        transactions,
        customers: customerRows.map((row) => ({ id: String(row.id), name: String(row.name) })),
        architects: architectRows.map((row) => ({ id: String(row.id), name: String(row.name) })),
        customerBillingDefaultsByType,
      },
    };
  }

  async upsertTicket(ticketInput: Record<string, unknown> | undefined) {
    if (!ticketInput || typeof ticketInput !== 'object') {
      return { success: false, error: 'ticket is required' };
    }

    const ticketId = String(ticketInput.ticketId || '').trim();
    const formType = String(ticketInput.formType || '').trim().toLowerCase();
    const status = String(ticketInput.status || 'draft').trim().toLowerCase() as TicketStatus;

    if (!ticketId) {
      return { success: false, error: 'ticket.ticketId is required' };
    }

    if (formType !== 'seismic' && formType !== 'dca') {
      return { success: false, error: 'ticket.formType must be seismic or dca' };
    }

    if (!['draft', 'saved', 'submitted', 'finalized', 'archived'].includes(status)) {
      return { success: false, error: 'ticket.status is invalid' };
    }

    await this.repository.upsertTicket({
      ticketId,
      formType,
      status,
      createdBy: this.truncate(String(ticketInput.createdBy || 'Unknown User'), 255),
      createdAt: this.toDbDateTime(ticketInput.createdAt),
      updatedAt: this.toDbDateTime(ticketInput.updatedAt),
      finalizedAt: this.nullableDbDateTime(ticketInput.finalizedAt),
      valuesJson: this.encodeJsonSafe(ticketInput.values || {}),
      fieldUpdatedAtJson: this.encodeJsonSafe(ticketInput.fieldUpdatedAt || {}),
      processNotesJson: this.encodeJsonSafe(ticketInput.processNoteRecords || []),
      financialsJson: this.encodeJsonSafe(ticketInput.financials || {}),
    });

    return { success: true, ticketId };
  }

  async removeAttachment(
    ticketIdInput: string | undefined,
    attachmentIdInput: string | undefined,
    _attachmentInput?: Record<string, unknown>,
  ) {
    const ticketId = String(ticketIdInput || '').trim();
    const attachmentId = String(attachmentIdInput || '').trim();

    if (!ticketId) {
      return { success: false, error: 'ticketId is required' };
    }
    if (!attachmentId) {
      return { success: false, error: 'attachmentId is required' };
    }

    // Shared/AWS attachments are deleted by shared table numeric id.
    const numericId = Number(attachmentId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new BadRequestException('Legacy attachments are read-only and cannot be deleted by this endpoint');
    }

    // Fetch before delete so we can remove the S3/local file.
    const rows = await this.attachmentsRepository.find({ id: String(numericId) });
    const row = rows[0];
    if (!row) {
      throw new NotFoundException(`Shared attachment ${attachmentId} not found`);
    }

    await this.deleteAttachmentFile({
      storageSource: row['storage_source'],
      storageBucket: row['storage_bucket'],
      storageKey: row['storage_key'],
      link: row['link'],
      storedFileName: row['fileName'],
    });
    await this.attachmentsRepository.deleteById(numericId);
    return { success: true, ticketId, attachmentId };
  }

  async deleteTicket(ticketIdInput: string | undefined) {
    const ticketId = String(ticketIdInput || '').trim();
    if (!ticketId) {
      return { success: false, error: 'ticketId is required' };
    }

    const archivedRows = await this.repository.archiveTicket(ticketId, this.toDbDateTime(new Date().toISOString()));
    return { success: true, ticketId, archivedRows };
  }

  async hardDeleteTicket(ticketIdInput: string | undefined, currentUserIdInput: string | undefined) {
    const ticketId = String(ticketIdInput || '').trim();
    if (!ticketId) {
      return { success: false, error: 'ticketId is required' };
    }

    const currentUserId = String(currentUserIdInput || '').trim();
    if (!currentUserId) {
      return { success: false, error: 'Admin authorization required' };
    }

    const user = await this.repository.getDeleteAuthUserById(currentUserId);
    if (!user) {
      return { success: false, error: 'Admin authorization required' };
    }

    const isAdmin = String(user.isAdmin || '0') === '1';
    const employeeType = Number(user.employeeType || 0);
    if (!isAdmin && employeeType === 0) {
      return { success: false, error: 'Admin authorization required' };
    }

    const deletedRows = await this.repository.hardDeleteTicket(ticketId);
    return { success: true, ticketId, deletedRows };
  }

  async syncTransactions(transactionsInput: Array<Record<string, unknown>> | undefined) {
    const transactions = Array.isArray(transactionsInput) ? transactionsInput : [];

    const mapped = transactions
      .map((tx) => ({
        id: this.truncate(String(tx.id || '').trim(), 80),
        ticketId: this.truncate(String(tx.ticketId || '').trim(), 64),
        type: this.truncate(String(tx.type || '').trim(), 50),
        timestamp: this.toDbDateTime(tx.timestamp),
        actor: this.nullableTruncate(tx.actor, 255),
        detailsJson: tx.details === undefined ? null : this.encodeJsonSafe(tx.details),
      }))
      .filter((tx) => tx.id && tx.ticketId && tx.type);

    const synced = await this.repository.upsertTransactions(mapped);
    return { success: true, synced };
  }

  async syncDirectories(
    customersInput: Array<Record<string, unknown>> | undefined,
    architectsInput: Array<Record<string, unknown>> | undefined,
  ) {
    const customers = (Array.isArray(customersInput) ? customersInput : []).map((row) => ({
      id: this.truncate(String(row?.id || '').trim(), 80),
      name: this.truncate(String(row?.name || '').trim(), 255),
    }));

    const architects = (Array.isArray(architectsInput) ? architectsInput : []).map((row) => ({
      id: this.truncate(String(row?.id || '').trim(), 80),
      name: this.truncate(String(row?.name || '').trim(), 255),
    }));

    await this.repository.syncDirectories(customers, architects);
    return { success: true };
  }

  async syncBillingDefaults(customerBillingDefaultsByTypeInput: Record<string, unknown> | undefined) {
    if (!customerBillingDefaultsByTypeInput || typeof customerBillingDefaultsByTypeInput !== 'object') {
      return { success: false, error: 'customerBillingDefaultsByType must be an object' };
    }

    const customerBillingDefaultsByType: Record<string, Array<{ key: string; label: string; amount: number }>> = {
      seismic: [],
      dca: [],
    };

    for (const formType of ['seismic', 'dca']) {
      const rows = Array.isArray(customerBillingDefaultsByTypeInput[formType])
        ? (customerBillingDefaultsByTypeInput[formType] as Array<Record<string, unknown>>)
        : [];

      customerBillingDefaultsByType[formType] = rows.map((row) => ({
        key: this.truncate(String(row?.key || '').trim(), 120),
        label: this.truncate(String(row?.label || '').trim(), 255),
        amount: this.normalizeAmount(row?.amount),
      }));
    }

    await this.repository.syncBillingDefaults(customerBillingDefaultsByType);
    return { success: true };
  }

  private decodeJsonObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    if (typeof value !== 'string' || !value.trim()) {
      return {};
    }

    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private decodeJsonObjectNullable(value: unknown): Record<string, unknown> | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    if (typeof value !== 'string') {
      return null;
    }

    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private decodeJsonArray(value: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(value)) {
      return value as Array<Record<string, unknown>>;
    }

    if (typeof value !== 'string' || !value.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
    } catch {
      return [];
    }
  }

  private encodeJsonSafe(value: unknown): string {
    const encoded = JSON.stringify(value ?? {});
    if (encoded === undefined) {
      throw new Error('Unable to encode JSON payload');
    }
    return encoded;
  }

  private toDbDateTime(input: unknown): string {
    if (!input) {
      return this.formatDateTime(new Date());
    }

    const date = new Date(String(input));
    if (Number.isNaN(date.getTime())) {
      return this.formatDateTime(new Date());
    }

    return this.formatDateTime(date);
  }

  private nullableDbDateTime(input: unknown): string | null {
    if (!input) {
      return null;
    }

    const date = new Date(String(input));
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return this.formatDateTime(date);
  }

  private toIso(value: unknown): string {
    const date = new Date(String(value || ''));
    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString();
    }

    return date.toISOString();
  }

  private formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  private truncate(value: string, max: number): string {
    return value.length > max ? value.slice(0, max) : value;
  }

  private nullableTruncate(value: unknown, max: number): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    return this.truncate(String(value), max);
  }

  private normalizeAmount(value: unknown): number {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n < 0) {
      return 0;
    }

    return Number(n.toFixed(2));
  }

  private sanitizeFileBase(input: string): string {
    const fallback = 'attachment';
    const cleaned = String(input || '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);

    return cleaned || fallback;
  }

  private async deleteAttachmentFile(attachment: Record<string, unknown>): Promise<void> {
    const explicitStorageSource = String(attachment['storageSource'] || attachment['storage_source'] || '')
      .trim()
      .toLowerCase();
    const explicitStorageKey = String(attachment['storageKey'] || attachment['storage_key'] || '').trim();
    const explicitStorageBucket = String(attachment['storageBucket'] || attachment['storage_bucket'] || '').trim();

    if (explicitStorageSource === 'bucket' && explicitStorageKey) {
      await this.storageService.deleteStoredFileInBucket(explicitStorageKey, explicitStorageBucket || undefined);
      return;
    }

    const rawUrl = String(attachment['url'] || attachment['link'] || attachment['path'] || '').trim();
    const parsedBucketObject = this.resolveBucketObjectFromUrl(rawUrl);
    if (parsedBucketObject?.key) {
      await this.storageService.deleteStoredFileInBucket(parsedBucketObject.key, parsedBucketObject.bucket || undefined);
      return;
    }

    const explicitStoredFileName = String(attachment['storedFileName'] || '').trim();
    const localPath = String(attachment['path'] || rawUrl || '').trim();
    const storedName = explicitStoredFileName || basename(localPath);
    if (!storedName) {
      return;
    }

    await this.storageService.deleteStoredFile(storedName, this.permitChecklistSubFolder);
    await this.storageService.deleteStoredFile(storedName, 'permit-checklists');
  }

  private shouldUseBucketStorage(): boolean {
    const mode = String(process.env.MEDIA_STORAGE_MODE || '').trim().toLowerCase();
    const bucket = String(process.env.FILE_STORAGE_DEFAULT_BUCKET || '').trim();

    if (mode === 'local') {
      return false;
    }

    return mode === 'bucket' || mode === 's3' || !!bucket;
  }

  private sanitizePathSegment(value: string): string {
    const sanitized = String(value || '')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '');
    return sanitized || 'ticket';
  }

  private normalizeBucketLink(key: string): string {
    const normalizedKey = key
      .trim()
      .replace(/^\/+/, '')
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    return `/attachments/${normalizedKey}`;
  }

  private async resolveAttachmentsForResponse(
    attachments: Array<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown>>> {
    return Promise.all((attachments || []).map((attachment) => this.resolveAttachmentForResponse(attachment)));
  }

  private dedupeAttachmentList(attachments: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    const seen = new Set<string>();
    const deduped: Array<Record<string, unknown>> = [];

    for (const attachment of attachments || []) {
      const id = String(attachment['id'] || '').trim();
      const storageKey = String(attachment['storageKey'] || attachment['storage_key'] || '').trim();
      const rawLink = String(attachment['link'] || attachment['url'] || '').trim();
      const normalizedLink = rawLink.split('?')[0].split('#')[0];
      const fileName = String(attachment['fileName'] || '').trim().toLowerCase();
      const uploadedAt = String(attachment['uploadedAt'] || attachment['createdDate'] || '').trim();

      const dedupeKey = id
        ? `id:${id}`
        : storageKey
          ? `storage:${storageKey}`
          : normalizedLink
            ? `link:${normalizedLink}`
            : `${fileName}|${uploadedAt}`;

      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      deduped.push(attachment);
    }

    return deduped;
  }

  private async resolveAttachmentForResponse(attachment: Record<string, unknown>): Promise<Record<string, unknown>> {
    const storageSource = this.normalizeStorageSource(attachment['storageSource'] || attachment['storage_source']);
    if (storageSource !== 'bucket') {
      return attachment;
    }

    const explicitBucket = String(attachment['storageBucket'] || attachment['storage_bucket'] || '').trim();
    const explicitKey = String(attachment['storageKey'] || attachment['storage_key'] || '').trim();

    const fromLink = this.resolveBucketObjectFromUrl(String(attachment['url'] || attachment['link'] || ''));
    const bucket = explicitBucket || fromLink?.bucket || String(process.env.FILE_STORAGE_DEFAULT_BUCKET || '').trim();
    const key = explicitKey || fromLink?.key || '';

    if (!bucket || !key) {
      return attachment;
    }

    try {
      const signedUrl = await this.storageService.resolveBucketObjectUrl(bucket, key);
      return {
        ...attachment,
        url: signedUrl,
        link: signedUrl,
      };
    } catch {
      return attachment;
    }
  }

  private normalizeStorageSource(value: unknown): 'local' | 'bucket' | 'legacy' | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (normalized === 's3') {
      return 'bucket';
    }

    if (normalized === 'local' || normalized === 'bucket' || normalized === 'legacy') {
      return normalized;
    }

    return undefined;
  }

  private resolveBucketObjectFromUrl(rawUrl: string): { key: string; bucket: string } | null {
    const value = String(rawUrl || '').trim();
    if (!value) {
      return null;
    }

    const configuredBucket = String(process.env.FILE_STORAGE_DEFAULT_BUCKET || '').trim();
    const withoutQuery = value.split('?')[0].split('#')[0] || value;
    const marker = '/attachments/';
    const markerIndex = withoutQuery.indexOf(marker);
    if (markerIndex < 0) {
      return null;
    }

    const tail = withoutQuery.slice(markerIndex + marker.length).replace(/^\/+/, '');
    if (!tail) {
      return null;
    }

    const parts = tail.split('/').filter(Boolean);
    if (!parts.length) {
      return null;
    }

    if (configuredBucket && parts[0] === configuredBucket && parts.length > 1) {
      return { key: parts.slice(1).join('/'), bucket: configuredBucket };
    }

    if (/^https?:\/\//i.test(value)) {
      try {
        const parsed = new URL(value);
        const pathParts = decodeURIComponent(parsed.pathname || '')
          .split('/')
          .filter(Boolean);

        const host = parsed.hostname.toLowerCase();
        const virtualHostedMatch = host.match(/^([a-z0-9._-]+)\.s3[.-][a-z0-9.-]+\.amazonaws\.com$/i);
        if (virtualHostedMatch && pathParts.length > 0) {
          return {
            bucket: virtualHostedMatch[1],
            key: pathParts.join('/'),
          };
        }

        const endpointStyleMatch = host.match(/^s3[.-][a-z0-9.-]+\.amazonaws\.com$/i);
        if (endpointStyleMatch && pathParts.length > 1) {
          return {
            bucket: pathParts[0],
            key: pathParts.slice(1).join('/'),
          };
        }

        const localOrCustomBucket = configuredBucket;
        if (localOrCustomBucket) {
          if (pathParts[0] === localOrCustomBucket && pathParts.length > 1) {
            return {
              bucket: localOrCustomBucket,
              key: pathParts.slice(1).join('/'),
            };
          }

          if (pathParts.length > 0) {
            return {
              bucket: localOrCustomBucket,
              key: pathParts.join('/'),
            };
          }
        }
      } catch {
        // Fall through to existing parsing.
      }
    }

    return {
      key: tail,
      bucket: configuredBucket,
    };
  }

  private async generateTicketPdfBuffer(payload: {
    ticketId: string;
    formType: string;
    status: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    finalizedAt: string;
    values: Record<string, unknown>;
    financials: Record<string, unknown>;
    attachments: Array<Record<string, unknown>>;
  }): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 28, bufferPages: true });
    const chunks: Buffer[] = [];

    const pdfBufferPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const pageWidth = doc.page.width;
    const margin = 28;
    const contentWidth = pageWidth - margin * 2;
    const labelWidth = contentWidth * 0.38;
    const valueWidth = contentWidth - labelWidth;
    const pageBottom = doc.page.height - margin;
    let y = margin;

    const ensureSpace = (needed: number): void => {
      if (y + needed <= pageBottom) {
        return;
      }
      doc.addPage();
      y = margin;
    };

    const drawSectionTitle = (title: string): void => {
      ensureSpace(26);
      doc.save();
      doc.fillColor('#f8fafc').rect(margin, y, contentWidth, 18).fill();
      doc.restore();
      doc.strokeColor('#dbe3ef').lineWidth(1).rect(margin, y, contentWidth, 18).stroke();
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f2937').text(String(title || '').toUpperCase(), margin + 6, y + 6);
      y += 18;
    };

    const drawRow = (label: string, value: string): void => {
      const labelText = String(label || '-');
      const valueText = String(value || '-');
      doc.font('Helvetica-Bold').fontSize(9);
      const labelHeight = doc.heightOfString(labelText, { width: labelWidth - 10 });
      doc.font('Helvetica').fontSize(9);
      const valueHeight = doc.heightOfString(valueText, { width: valueWidth - 10 });
      const rowHeight = Math.max(20, Math.max(labelHeight, valueHeight) + 10);

      ensureSpace(rowHeight + 1);

      doc.save();
      doc.fillColor('#fcfdff').rect(margin, y, labelWidth, rowHeight).fill();
      doc.restore();
      doc.strokeColor('#e5eaf2').lineWidth(1).rect(margin, y, labelWidth, rowHeight).stroke();
      doc.strokeColor('#e5eaf2').lineWidth(1).rect(margin + labelWidth, y, valueWidth, rowHeight).stroke();

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#334155').text(labelText, margin + 5, y + 5, {
        width: labelWidth - 10,
      });
      doc.font('Helvetica').fontSize(9).fillColor('#111827').text(valueText, margin + labelWidth + 5, y + 5, {
        width: valueWidth - 10,
      });

      y += rowHeight;
    };

    doc.save();
    doc.fillColor('#f8fbff').rect(margin, y, contentWidth, 62).fill();
    doc.restore();
    doc.strokeColor('#dbe3ef').lineWidth(1).rect(margin, y, contentWidth, 62).stroke();
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a').text(payload.ticketId, margin + 8, y + 10);
    doc.font('Helvetica').fontSize(10).fillColor('#334155').text(`Permit Checklist (${payload.formType})`, margin + 8, y + 32);
    y += 72;

    drawSectionTitle('Checklist Summary');
    drawRow('Status', payload.status);
    drawRow('Created By', payload.createdBy);
    drawRow('Created At', payload.createdAt ? new Date(payload.createdAt).toLocaleString() : '-');
    drawRow('Last Updated', payload.updatedAt ? new Date(payload.updatedAt).toLocaleString() : '-');
    drawRow('Finalized At', payload.finalizedAt ? new Date(payload.finalizedAt).toLocaleString() : '-');

    const valueRows = Object.entries(payload.values || {})
      .map(([key, value]) => ({
        key,
        label: this.toPdfLabel(key),
        value: String(value ?? '').trim(),
      }))
      .filter((entry) => entry.value.length > 0)
      .sort((a, b) => a.label.localeCompare(b.label));

    drawSectionTitle('Form Values');
    if (!valueRows.length) {
      drawRow('Fields', 'No values captured.');
    } else {
      for (const row of valueRows) {
        drawRow(row.label, row.value);
      }
    }

    const approvedAmount = Number((payload.financials?.approvedAmount as number) || 0);
    const quoteAmount = Number((payload.financials?.quoteAmount as number) || 0);
    const invoiceAmount = Number((payload.financials?.invoiceAmount as number) || 0);
    const approvalDate = String(payload.financials?.approvalDate || '').trim();
    const invoiceReference = String(payload.financials?.invoiceReference || '').trim();

    drawSectionTitle('Financials');
    drawRow('Quote Amount', this.formatPdfCurrency(quoteAmount));
    drawRow('Invoice Amount', this.formatPdfCurrency(invoiceAmount));
    drawRow('Approved Amount', this.formatPdfCurrency(approvedAmount));
    drawRow('Approval Date', approvalDate || '-');
    drawRow('Invoice Reference', invoiceReference || '-');

    drawSectionTitle('Attachments');
    if (!payload.attachments.length) {
      drawRow('Files', 'No attachments uploaded.');
    } else {
      for (const attachment of payload.attachments) {
        const fileName = String(attachment.fileName || 'Attachment');
        const uploadedBy = String(attachment.uploadedBy || 'Unknown User');
        const uploadedAt = String(attachment.uploadedAt || '').trim();
        const summary = `${uploadedBy} | ${uploadedAt ? new Date(uploadedAt).toLocaleString() : '-'}`;
        drawRow(fileName, summary);
      }
    }

    doc.end();
    return await pdfBufferPromise;
  }

  private toPdfLabel(rawKey: string): string {
    const key = String(rawKey || '').trim();
    if (!key) {
      return 'Field';
    }

    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (c) => c.toUpperCase());
  }

  private formatPdfCurrency(value: number): string {
    const numeric = Number(value || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(Number.isFinite(numeric) ? numeric : 0);
  }
}
