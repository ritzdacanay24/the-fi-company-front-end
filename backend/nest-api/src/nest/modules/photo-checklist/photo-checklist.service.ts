import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { RowDataPacket } from 'mysql2/promise';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { AccessControlService } from '../access-control/access-control.service';
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
  private readonly checklistMediaRemoteBaseUrl = this.resolveChecklistMediaRemoteBaseUrl();
  private readonly displayTimeZone = String(process.env.INSPECTION_CHECKLIST_DISPLAY_TIME_ZONE || 'America/Los_Angeles').trim();
  private readonly dashboardWebBaseUrl = String(process.env.DASHBOARD_WEB_BASE_URL || '').trim().replace(/\/+$/, '');

  constructor(
    private readonly repository: PhotoChecklistRepository,
    private readonly fileStorageService: FileStorageService,
    private readonly accessControlService: AccessControlService,
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

  async exportTemplatePdf(id: number): Promise<{ fileName: string; buffer: Buffer }> {
    const template = await this.getTemplateById(id, { includeInactive: true });
    const templateName = String((template as Record<string, unknown>)?.name || `checklist-template-${id}`).trim();
    const fileName = `${this.toFileName(templateName)}.pdf`;
    const logoBuffer = await this.fetchChecklistImageBuffer('https://dashboard.eye-fi.com/assets/images/the-fi-cropped.png');

    const items = this.flattenTemplateItems(Array.isArray((template as Record<string, unknown>)?.items)
      ? ((template as Record<string, unknown>).items as Array<Record<string, unknown>>)
      : []);

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const chunks: Buffer[] = [];

    const pdfBufferPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // Professional branded header
    const blueColor = '#1B3A70'; // Dark professional blue
    const headerHeight = 85; // More compact header

    // Blue background rectangle for header
    doc.rect(0, 0, doc.page.width, headerHeight).fillAndStroke(blueColor, blueColor);

    if (logoBuffer) {
      const logoWidth = 108;
      const logoHeight = 40;
      const logoX = doc.page.width - doc.page.margins.right - logoWidth;
      const logoY = 10;
      doc.image(logoBuffer, logoX, logoY, { fit: [logoWidth, logoHeight] });
    }

    // White text on blue background - vertically centered
    doc.fillColor('#FFFFFF');
    doc.fontSize(16).font('Helvetica-Bold').text(templateName, 52, 30, { width: 430, align: 'left' });
    doc.fontSize(10).font('Helvetica').text('INSPECTION CHECKLIST', 52, 52, { width: 430, align: 'left' });

    // Reset position after header
    doc.y = headerHeight;
    doc.moveDown(0.4);

    // Metadata line below header
    const version = String((template as Record<string, unknown>)?.version || '1.0').trim();
    const createdAt = (template as Record<string, unknown>)?.created_at
      ? new Date(String((template as Record<string, unknown>)?.created_at)).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'Unknown';
    const createdBy = String((template as Record<string, unknown>)?.created_by_name || 'System').trim();
    const metadataText = `Version ${version} | Created ${createdAt} | By ${createdBy}`;

    doc.fontSize(9).font('Helvetica').fillColor('#666666').text(
      metadataText,
      doc.page.margins.left,
      doc.y,
      {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: 'right',
      },
    );

    // Horizontal divider line
    doc.moveDown(0.3);
    doc.strokeColor('#CCCCCC').lineWidth(1).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fillColor('#000000');

    for (const item of items) {
      const level = Number(item.level || 0);
      const outline = String(item.outline || item.order_index || '').trim();
      const title = String(item.title || 'Untitled').trim();
      const submissionType = String(item.submission_type || 'none').trim();
      const isRequired = !!item.is_required;
      const detailsLine = `Submission: ${submissionType} | Required: ${isRequired ? 'Yes' : 'No'}`;
      const itemIndent = Math.max(0, Math.min(level, 3)) * 14;
      const textX = doc.page.margins.left + itemIndent;
      const textWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right - itemIndent;
      const description = this.stripHtmlText(item.description);

      const sourceImages = Array.isArray(item.sample_images)
        ? item.sample_images.filter((image) => !!String(image?.url || '').trim())
        : [];

      const renderableImages: Array<{ buffer: Buffer; label: string }> = [];
      for (const image of sourceImages) {
        const imageUrl = String(image.url || '').trim();
        if (!imageUrl) {
          continue;
        }

        const imageBuffer = await this.fetchChecklistImageBuffer(imageUrl);
        if (!imageBuffer) {
          continue;
        }

        renderableImages.push({
          buffer: await this.compressImageForPdf(imageBuffer),
          label: String(image.label || (image.is_primary ? 'Primary' : 'Reference')).trim() || 'Image',
        });
      }

      const imageWidth = Math.min(220, Math.max(120, textWidth));
      const imageHeight = 150;

      doc.font('Helvetica-Bold').fontSize(11);
      const titleHeight = doc.heightOfString(`${outline}. ${title}`, { width: textWidth });
      doc.font('Helvetica').fontSize(9);
      const detailsHeight = doc.heightOfString(detailsLine, { width: textWidth });
      const descriptionHeight = description
        ? doc.heightOfString(description, { width: textWidth }) + 4
        : 0;
      doc.font('Helvetica-Bold').fontSize(9);
      const picturesHeaderHeight = renderableImages.length > 0
        ? doc.heightOfString('Pictures', { width: textWidth }) + 6
        : 0;

      const nonImageHeight = titleHeight + detailsHeight + descriptionHeight + picturesHeaderHeight;
      const estimatedItemHeight = nonImageHeight + (renderableImages.length * (imageHeight + 18)) + 18;
      this.ensurePdfSpace(doc, estimatedItemHeight);

      // Item title with outline numbering - more visual hierarchy
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a1a1a').text(`${outline}. ${title}`, textX, doc.y, { width: textWidth });
      doc.moveDown(0.2);

      // Details line in lighter color
      doc.font('Helvetica').fontSize(9).fillColor('#666666').text(
        detailsLine,
        textX,
        doc.y,
        { width: textWidth },
      );
      doc.moveDown(0.15);

      // Description text
      if (description) {
        doc.font('Helvetica').fontSize(9).fillColor('#333333').text(description, textX, doc.y, { width: textWidth });
        doc.moveDown(0.15);
      }

      // Pictures section with better formatting
      if (renderableImages.length > 0) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1a1a1a').text('Pictures:', textX, doc.y, { width: textWidth });
        doc.moveDown(0.2);

        for (const image of renderableImages) {
          const imageTop = doc.y;

          try {
            doc.image(image.buffer, textX, imageTop, { fit: [imageWidth, imageHeight], align: 'center', valign: 'center' });
            doc.font('Helvetica').fontSize(8).fillColor('#666666').text(image.label, textX, imageTop + imageHeight + 4, { width: imageWidth });
            doc.y = imageTop + imageHeight + 20;
          } catch {
            // Ignore unreadable image bytes and continue with remaining images.
            continue;
          }
        }
      }

      doc.moveDown(0.3);
      // Subtle divider line between items
      doc.strokeColor('#DDDDDD').lineWidth(0.5).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fillColor('#000000');
    }

    doc.end();
    const buffer = await pdfBufferPromise;
    return { fileName, buffer };
  }

  async exportInstancePdf(instanceId: number): Promise<{ fileName: string; buffer: Buffer } | null> {
    const instance = await this.repository.getInstanceById(instanceId);
    if (!instance) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_INSTANCE_NOT_FOUND',
        message: `Checklist instance with id ${instanceId} not found`,
      });
    }

    const templateId = Number(instance.template_id || 0);
    const items = templateId > 0
      ? await this.repository.getChecklistItemsByTemplateId(templateId)
      : [];
    const mediaRows = await this.repository.getPhotoSubmissionsByInstanceId(instanceId);

    const mediaByItemId = new Map<number, RowDataPacket[]>();
    for (const media of mediaRows) {
      const itemId = Number(media.item_id || 0);
      if (!mediaByItemId.has(itemId)) {
        mediaByItemId.set(itemId, []);
      }
      mediaByItemId.get(itemId)?.push(media);
    }

    const completionEntries = this.safeParseJson<Record<string, unknown>[]>(instance.item_completion, []);
    const completionByItemId = new Map<number, Record<string, unknown>>();
    for (const entry of completionEntries) {
      const itemId = this.extractBaseItemId(entry?.itemId);
      if (itemId > 0) {
        completionByItemId.set(itemId, entry);
      }
    }

    const templateName = String(instance.template_name || 'inspection-checklist').trim();
    const workOrder = String(instance.work_order_number || '').trim();
    const serialNumber = String(instance.serial_number || '').trim();
    const baseFileName = [
      this.toFileName(templateName),
      workOrder ? this.toFileName(workOrder) : '',
      serialNumber ? this.toFileName(serialNumber) : '',
      `instance-${instanceId}`,
      'final-submission',
    ]
      .filter(Boolean)
      .join('-');

    const fileName = `${baseFileName || `instance-${instanceId}-final-submission`}.pdf`;
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const chunks: Buffer[] = [];

    const pdfBufferPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.font('Helvetica-Bold').fontSize(18).text('Inspection Checklist Final Submission', {
      align: 'left',
    });
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(10);
    doc.text(`Checklist: ${templateName}`);
    doc.text(`Instance ID: ${instanceId}`);
    doc.text(`Status: ${String(instance.status || 'draft')}`);
    if (workOrder) {
      doc.text(`Work Order: ${workOrder}`);
    }
    if (instance.part_number) {
      doc.text(`Part Number: ${String(instance.part_number)}`);
    }
    if (instance.serial_number) {
      doc.text(`Serial Number: ${String(instance.serial_number)}`);
    }
    if (instance.operator_name) {
      doc.text(`Operator: ${String(instance.operator_name)}`);
    }
    if (instance.submitted_at) {
      doc.text(`Submitted At: ${this.formatSubmittedAtLabel(String(instance.submitted_at))}`);
    }
    if (templateId) {
      doc.text(`Template ID: ${templateId}`);
    }
    if (instance.template_revision_id) {
      doc.text(`Template Revision ID: ${instance.template_revision_id}`);
    }
    doc.moveDown(0.8);

    for (const item of items) {
      const itemId = Number(item.id || 0);
      const title = String(item.title || `Item ${itemId}`).trim();
      const submissionType = String(item.submission_type || 'none').trim();
      const isRequired = !!item.is_required;
      const media = mediaByItemId.get(itemId) || [];
      const photos = media.filter((entry) => String(entry.file_type || '') !== 'video');
      const videos = media.filter((entry) => String(entry.file_type || '') === 'video');
      const completion = completionByItemId.get(itemId);

      const renderableImages: Buffer[] = [];
      for (const photo of photos) {
        const rawUrl = String(photo.file_url || '').trim();
        if (!rawUrl) {
          continue;
        }

        const productionUrl = this.resolveProductionChecklistMediaUrl(rawUrl, 'inspectionCheckList');
        const imageBuffer = await this.fetchChecklistImageBuffer(productionUrl || rawUrl, {
          subFolder: 'inspectionCheckList',
          fileName: String(photo.file_name || '').trim(),
        });
        if (imageBuffer) {
          renderableImages.push(await this.compressImageForPdf(imageBuffer));
        }
      }

      this.ensurePdfSpace(doc, 140 + (renderableImages.length * 150));

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a1a1a').text(title);
      doc.font('Helvetica').fontSize(9).fillColor('#444444').text(
        `Submission: ${submissionType} | Required: ${isRequired ? 'Yes' : 'No'}`,
      );
      doc.text(`Evidence: ${photos.length} photo(s), ${videos.length} video(s)`);

      const completed = completion && Object.prototype.hasOwnProperty.call(completion, 'completed')
        ? !!completion.completed
        : (photos.length + videos.length) > 0;
      doc.text(`Completed: ${completed ? 'Yes' : 'No'}`);

      const notes = String(completion?.notes || '').trim();
      if (notes) {
        doc.text(`Notes: ${notes}`);
      }

      const mediaLinks = media
        .slice(0, 3)
        .map((entry, index) => {
          const url = this.resolveProductionChecklistMediaUrl(String(entry.file_url || ''), 'inspectionCheckList');
          if (!url) {
            return null;
          }

          const fileType = String(entry.file_type || '').toLowerCase() === 'video' ? 'Video' : 'Photo';
          const shortName = this.toShortMediaDisplayLabel(url);
          return {
            url,
            label: `${fileType} ${index + 1}: ${shortName}`,
          };
        })
        .filter((entry): entry is { url: string; label: string } => !!entry);

      if (renderableImages.length > 0) {
        doc.moveDown(0.2);
        doc.text('Submitted Photos:');
        for (const imageBuffer of renderableImages) {
          this.ensurePdfSpace(doc, 160);
          const imageTop = doc.y;
          try {
            doc.image(imageBuffer, doc.page.margins.left, imageTop, { fit: [240, 140], valign: 'center' });
            doc.y = imageTop + 146;
          } catch {
            // Ignore bad image payload and continue.
          }
        }
      }

      if (mediaLinks.length > 0) {
        doc.moveDown(0.1);
        doc.text('Media Links:');
        mediaLinks.forEach((entry) => {
          doc.fillColor('#1a4f8b').text(`- ${entry.label}`, { link: entry.url, underline: false });
        });
        doc.fillColor('#444444');
      }

      doc.moveDown(0.5);
      doc.strokeColor('#DDDDDD').lineWidth(0.5).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.5);
    }

    doc.end();
    const buffer = await pdfBufferPromise;
    return { fileName, buffer };
  }

  async generateFinalSubmissionPdf(instanceId: number) {
    const exportResult = await this.exportInstancePdf(instanceId);
    if (!exportResult) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_INSTANCE_NOT_FOUND',
        message: `Checklist instance with id ${instanceId} not found`,
      });
    }

    this.assertFinalPdfProductionStorageConfigured();

    const subFolder = 'inspectionCheckList/final-submissions';
    const storedFileName = await this.fileStorageService.storeUploadedFile(
      {
        originalname: exportResult.fileName,
        buffer: exportResult.buffer,
      },
      subFolder,
    );

    const resolvedLink = this.fileStorageService.resolveLink(storedFileName, subFolder);
    if (!resolvedLink) {
      throw new InternalServerErrorException('Unable to resolve server URL for generated final submission PDF.');
    }

    const serverUrl = this.resolveProductionChecklistMediaUrl(resolvedLink, subFolder);
    if (!serverUrl) {
      throw new InternalServerErrorException('Unable to build server URL for generated final submission PDF.');
    }

    return {
      success: true,
      id: instanceId,
      file_name: storedFileName,
      file_url: serverUrl,
      download_url: serverUrl,
      storage_folder: subFolder,
    };
  }

  private assertFinalPdfProductionStorageConfigured(): void {
    const configuredRoots = String(process.env.ATTACHMENTS_UPLOAD_ROOT_DIRS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const allowedRoots = new Set<string>(['/attachments', '/var/www/html/attachments']);
    const isProductionStorageRoot = configuredRoots.some((root) => allowedRoots.has(root));

    if (!isProductionStorageRoot) {
      throw new InternalServerErrorException(
        'Final submission PDF upload blocked: ATTACHMENTS_UPLOAD_ROOT_DIRS must point to production attachments storage.',
      );
    }
  }

  async deleteFinalSubmissionPdfFile(fileName: string): Promise<void> {
    const normalizedFileName = String(fileName || '').trim();
    if (!normalizedFileName) {
      return;
    }

    await this.fileStorageService.deleteStoredFile(normalizedFileName, 'inspectionCheckList/final-submissions');
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
    const normalizedSerial = String(payload.serial_number || '').trim();
    if (normalizedSerial) {
      const existing = await this.repository.findNonArchivedInstanceBySerialNumber(normalizedSerial);
      if (existing) {
        throw new BadRequestException({
          code: 'DUPLICATE_SERIAL_NUMBER',
          message: `Checklist serial number "${normalizedSerial}" already exists on instance #${Number(existing.id)}.`,
          serial_number: normalizedSerial,
          existing_instance_id: Number(existing.id),
          existing_status: String(existing.status || ''),
        });
      }
    }

    const insertId = await this.repository.createInstance({
      ...payload,
      serial_number: normalizedSerial || undefined,
    });
    return {
      success: true,
      instance_id: insertId,
    };
  }

  async createTemplate(payload: Record<string, unknown>) {
    // When branching from an existing published template (sub-version draft),
    // reject if it is not the latest published version in its family.
    const sourceId = Number(payload?.source_template_id || 0);
    if (sourceId > 0) {
      await this.assertIsLatestVersionInFamily(sourceId);

      // Check if an active draft already exists in this family — redirect to it
      const groupId = Number(payload?.template_group_id || 0);
      if (groupId > 0) {
        const existingDraft = await this.repository.getActiveDraftInGroup(groupId);
        if (existingDraft) {
          return {
            success: false,
            code: 'DRAFT_ALREADY_EXISTS',
            message: `A draft (v${existingDraft.version}) already exists for this template family. Please complete or discard it before creating a new version.`,
            existing_draft_id: Number(existingDraft.id),
          };
        }
      }
    }
    const templateId = await this.repository.createTemplate(payload);
    const template = await this.getTemplateById(templateId, { includeInactive: true });
    return { success: true, template_id: templateId, template };
  }

  async updateTemplate(id: number, payload: Record<string, unknown>, callerId?: number) {
    await this.assertIsTemplateDraftOwner(id, callerId ?? null);
    const result = await this.repository.updateTemplate(id, payload);
    if (result?.unsafeMutationBlocked) {
      return {
        success: false,
        code: 'UNSAFE_ITEM_ID_MUTATION_BLOCKED',
        message: 'Save blocked to protect existing checklist progress. This change would remove item IDs referenced by saved submissions.',
        instance_count: Number(result.instanceCount || 0),
        blocked_item_ids: result.blockedItemIds || [],
      };
    }

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

  async createParentVersion(sourceTemplateId: number, userId?: number) {
    await this.assertIsLatestVersionInFamily(sourceTemplateId);

    // Check if an active draft already exists in this family — redirect to it
    const source = await this.repository.getRawTemplateById(sourceTemplateId);
    if (source) {
      const groupId = Number(source.template_group_id || source.id);
      const existingDraft = await this.repository.getActiveDraftInGroup(groupId);
      if (existingDraft) {
        return {
          success: false,
          code: 'DRAFT_ALREADY_EXISTS',
          message: `A draft (v${existingDraft.version}) already exists for this template family. Please complete or discard it before creating a new version.`,
          existing_draft_id: Number(existingDraft.id),
        };
      }
    }

    const newTemplateId = await this.repository.createParentVersion(sourceTemplateId, userId);
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

  /**
   * Throws ForbiddenException if the given template is not the latest published
   * version in its family. Drafts are always allowed through (they are never "old").
   */
  private async assertIsLatestVersionInFamily(templateId: number): Promise<void> {
    const rows = await this.repository.getRawTemplateById(templateId);
    if (!rows) return; // let downstream handle not-found
    if (rows.is_draft) return; // drafts are fine

    const groupId = Number(rows.template_group_id || rows.id);
    const siblings = await this.repository.getPublishedVersionsInGroup(groupId);
    const thisVersion = String(rows.version || '1.0');

    // Simple version comparison: split by '.' and compare numerically
    const parseVer = (v: string) => String(v).split('.').map(Number);
    const compareVer = (a: string, b: string): number => {
      const pa = parseVer(a);
      const pb = parseVer(b);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
      }
      return 0;
    };

    const latestVersion = siblings
      .map((s: RowDataPacket) => String(s.version || '1.0'))
      .sort((a: string, b: string) => compareVer(b, a))[0];

    if (latestVersion && compareVer(thisVersion, latestVersion) < 0) {
      throw new ForbiddenException(
        `Cannot create a new version from an older version (${thisVersion}). Please use the latest version (${latestVersion}).`,
      );
    }
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

    // Load photos from photo_submissions (source of truth for media)
    const photoRows = await this.repository.getPhotoSubmissionsByInstanceId(id);

    // Group by item_id and build per-item photo arrays
    const photosByItemId = new Map<number, { id: number; file_url: string; file_type: string; capture_source: string | null; created_at: string | null; uploader_user_id: number | null }[]>();
    for (const row of photoRows) {
      const itemId = Number(row.item_id);
      if (!photosByItemId.has(itemId)) photosByItemId.set(itemId, []);
      const meta = this.safeParseJson<Record<string, unknown>>(row.photo_metadata, {});
      const resolvedFileUrl = await this.resolveChecklistMediaReadUrl(
        String(row.file_url || ''),
        meta,
        'inspectionCheckList',
      );
      photosByItemId.get(itemId)!.push({
        id: Number(row.submission_id || 0),
        file_url: resolvedFileUrl,
        file_type: String(row.file_type || 'image'),
        capture_source: (meta?.capture_source as string | null) ?? null,
        created_at: row.created_at ? String(row.created_at) : null,
        uploader_user_id: Number(meta?.uploader_user_id || 0) || null,
      });
    }

    // Convert map to items array for frontend consumption
    type InstanceMediaItem = { id: number; file_url: string; file_type: string; capture_source: string | null; created_at: string | null; uploader_user_id: number | null };
    type InstanceItem = { item_id: number; photos: InstanceMediaItem[]; videos: InstanceMediaItem[] };
    const items: InstanceItem[] = [];
    for (const [itemId, media] of photosByItemId.entries()) {
      items.push({
        item_id: itemId,
        photos: media.filter(m => m.file_type !== 'video'),
        videos: media.filter(m => m.file_type === 'video'),
      });
    }

    return {
      ...instance,
      item_completion: this.normalizeInstanceItemCompletionMediaUrls(instance.item_completion),
      media_by_item: items,
    };
  }

  async updateInstance(id: number, payload: Record<string, unknown>) {
    await this.repository.updateInstance(id, payload);
    return { success: true };
  }

  async updateInstanceDetails(
    id: number,
    payload: { work_order_number?: string; part_number?: string; serial_number?: string },
    callerId?: number,
  ) {
    const instance = await this.repository.getInstanceStatusTimestamps(id);
    if (!instance) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_INSTANCE_NOT_FOUND',
        message: `Checklist instance with id ${id} not found`,
      });
    }

    const status = String(instance.status || '').trim().toLowerCase();
    if (status === 'submitted' || status === 'archived') {
      throw new BadRequestException({
        code: 'RC_CHECKLIST_EDIT_DETAILS_INVALID_STATUS',
        message: 'Checklist details can only be edited before submission.',
      });
    }

    const normalizedCallerId = Number(callerId || 0);
    const creatorId = Number(instance.operator_id || 0);
    const callerHasManagePermission = await this.hasManagePermission(normalizedCallerId);
    const callerIsCreator = normalizedCallerId > 0 && creatorId > 0 && normalizedCallerId === creatorId;
    if (!callerHasManagePermission && !callerIsCreator) {
      throw new ForbiddenException({
        code: 'RC_CHECKLIST_EDIT_DETAILS_FORBIDDEN',
        message: 'Only checklist creators or users with manage permission can edit checklist details.',
      });
    }

    await this.repository.updateInstanceDetails(id, payload);
    return { success: true };
  }

  async undoSubmittedInstance(id: number) {
    const instance = await this.repository.getInstanceStatusTimestamps(id);
    if (!instance) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_INSTANCE_NOT_FOUND',
        message: `Checklist instance with id ${id} not found`,
      });
    }

    const status = String(instance.status || '').trim().toLowerCase();
    if (status !== 'submitted') {
      throw new BadRequestException({
        code: 'RC_CHECKLIST_UNDO_SUBMIT_INVALID_STATUS',
        message: 'Only submitted checklist instances can be undone.',
      });
    }

    const submittedAtRaw = instance.submitted_at || instance.completed_at || instance.updated_at;
    const submittedAt = submittedAtRaw ? new Date(String(submittedAtRaw)) : null;
    const submittedAtMs = submittedAt?.getTime() ?? Number.NaN;
    if (!Number.isFinite(submittedAtMs)) {
      throw new BadRequestException({
        code: 'RC_CHECKLIST_UNDO_SUBMIT_MISSING_TIMESTAMP',
        message: 'Submitted checklist is missing a valid submission timestamp.',
      });
    }

    const maxUndoAgeMs = 48 * 60 * 60 * 1000;
    if ((Date.now() - submittedAtMs) > maxUndoAgeMs) {
      throw new ForbiddenException({
        code: 'RC_CHECKLIST_UNDO_SUBMIT_WINDOW_EXPIRED',
        message: 'Submitted checklists can only be undone within 48 hours of submission.',
      });
    }

    await this.repository.undoSubmittedInstance(id);
    return { success: true };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Owner-lock operations
  // ──────────────────────────────────────────────────────────────────────────

  async claimInstance(instanceId: number, userId: number, userName: string): Promise<{ success: boolean; owner_id?: number; owner_name?: string; message?: string }> {
    const lock = await this.repository.getInstanceLock(instanceId);
    const assignedOwnerId = lock.owner_id ?? lock.operator_id;
    const assignedOwnerName = lock.owner_name ?? lock.operator_name;

    if (assignedOwnerId != null && assignedOwnerId !== userId) {
      return {
        success: false,
        owner_id: assignedOwnerId ?? undefined,
        owner_name: assignedOwnerName ?? undefined,
        message: `This checklist is assigned to ${assignedOwnerName ?? 'another user'}`,
      };
    }

    await this.repository.claimInstanceLock(instanceId, userId, userName);
    return { success: true, owner_id: userId, owner_name: userName };
  }

  async releaseInstance(instanceId: number, userId: number): Promise<{ success: boolean }> {
    await this.repository.releaseInstanceLock(instanceId, userId);
    return { success: true };
  }

  async transferInstance(instanceId: number, callerId: number, toUserId: number, toUserName: string): Promise<{ success: boolean; message?: string }> {
    const lock = await this.repository.getInstanceLock(instanceId);
    const callerIsOwner = lock.owner_id === callerId;
    const callerHasManagePermission = await this.hasManagePermission(callerId);
    if (!callerIsOwner && !callerHasManagePermission && lock.owner_id != null) {
      throw new ForbiddenException(`Only the current owner (${lock.owner_name ?? 'unknown'}) can transfer this lock.`);
    }
    await this.repository.transferInstanceAssignment(instanceId, toUserId, toUserName);
    return { success: true };
  }

  async transferInstanceAdmin(instanceId: number, toUserId: number, toUserName: string): Promise<{ success: boolean }> {
    await this.repository.transferInstanceAssignment(instanceId, toUserId, toUserName);
    return { success: true };
  }

  async bulkTransferInstancesAdmin(
    instanceIds: number[],
    toUserId: number,
    toUserName: string,
  ): Promise<{ success: boolean; requested: number; transferred: number; skipped: number }> {
    const normalizedIds = Array.from(new Set((instanceIds || []).map((id) => Number(id)).filter((id) => id > 0)));
    if (!normalizedIds.length) {
      return { success: false, requested: 0, transferred: 0, skipped: 0 };
    }

    const transferred = await this.repository.bulkTransferInstanceAssignment(normalizedIds, toUserId, toUserName);
    const requested = normalizedIds.length;
    return {
      success: true,
      requested,
      transferred,
      skipped: Math.max(0, requested - transferred),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Throws ForbiddenException if the caller does not hold a valid (non-expired) lock.
   * Callers with no userId supplied skip the check (legacy/system calls).
   */
  private async assertIsLockOwner(instanceId: number, callerId: number | null | undefined): Promise<void> {
    if (!callerId) return; // no user context — allow (system call)
    const lock = await this.repository.getInstanceLock(instanceId);
    if (lock.owner_id == null) return; // no active lock — allow
    if (lock.owner_id !== callerId) {
      throw new ForbiddenException(
        `This checklist is currently locked by ${lock.owner_name ?? 'another user'}. Transfer ownership before making changes.`,
      );
    }
  }

  // ── Draft template owner-lock operations ─────────────────────────────────

  async claimTemplateDraft(templateId: number, userId: number, userName: string): Promise<{ success: boolean; draft_owner_id?: number; draft_owner_name?: string; message?: string }> {
    const lock = await this.repository.getTemplateLock(templateId);

    if (!lock.is_draft) {
      return { success: false, message: 'Template is not a draft — no lock needed.' };
    }

    // A null expiry with an owner set (e.g. backfilled rows) is treated as an active lock —
    // the owner must explicitly release it. Only a truly expired timestamp frees the slot.
    const lockIsActive = lock.draft_owner_id != null;

    // Someone else holds an active lock → deny
    if (lockIsActive && lock.draft_owner_id !== userId) {
      return {
        success: false,
        draft_owner_id: lock.draft_owner_id ?? undefined,
        draft_owner_name: lock.draft_owner_name ?? undefined,
        message: `Draft is currently being edited by ${lock.draft_owner_name ?? 'another user'}`,
      };
    }

    await this.repository.claimTemplateLock(templateId, userId, userName);
    return { success: true, draft_owner_id: userId, draft_owner_name: userName };
  }

  async releaseTemplateDraft(templateId: number, userId: number): Promise<{ success: boolean }> {
    await this.repository.releaseTemplateLock(templateId, userId);
    return { success: true };
  }

  async transferTemplateDraft(templateId: number, callerId: number, toUserId: number, toUserName: string): Promise<{ success: boolean; message?: string }> {
    const lock = await this.repository.getTemplateLock(templateId);
    const callerIsOwner = lock.draft_owner_id === callerId;
    const callerHasManagePermission = await this.hasManagePermission(callerId);
    const lockIsActive = lock.draft_owner_id != null;
    if (!callerIsOwner && !callerHasManagePermission && lockIsActive) {
      throw new ForbiddenException(`Only the current draft owner (${lock.draft_owner_name ?? 'unknown'}) can transfer this draft.`);
    }
    await this.repository.transferTemplateDraftOwner(templateId, toUserId, toUserName);
    return { success: true };
  }

  private async hasManagePermission(userId: number | null | undefined): Promise<boolean> {
    const normalizedUserId = Number(userId || 0);
    if (normalizedUserId <= 0) {
      return false;
    }

    return this.accessControlService.userHasPermissions(normalizedUserId, ['manage']);
  }

  async transferTemplateDraftAdmin(templateId: number, toUserId: number, toUserName: string): Promise<{ success: boolean }> {
    await this.repository.transferTemplateDraftOwner(templateId, toUserId, toUserName);
    return { success: true };
  }

  private async assertIsTemplateDraftOwner(templateId: number, callerId: number | null | undefined): Promise<void> {
    if (!callerId) return;
    const lock = await this.repository.getTemplateLock(templateId);
    if (!lock.is_draft) return; // published templates are not locked
    const hasActiveLock = lock.draft_owner_id != null;
    if (!hasActiveLock) return; // no active lock — allow
    if (lock.draft_owner_id !== callerId) {
      throw new ForbiddenException(
        `This draft is currently being edited by ${lock.draft_owner_name ?? 'another user'}. Transfer ownership before making changes.`,
      );
    }
  }

  async updateInstanceItemCompletion(instanceId: number, itemId: number, payload: Record<string, unknown>, callerId?: number) {
    await this.assertIsLockOwner(instanceId, callerId ?? null);
    await this.repository.updateInstanceItemCompletion(instanceId, itemId, payload);
    return { success: true, instance_id: instanceId, item_id: itemId };
  }

  async uploadMedia(
    instanceId: number,
    itemId: number,
    file?: { originalname?: string; mimetype?: string; size?: number; buffer?: Buffer },
    options?: { captureSource?: string; userId?: string; callerId?: number },
  ) {
    await this.assertIsLockOwner(instanceId, options?.callerId ?? null);
    const subFolder = 'inspectionCheckList';
    const fileType = String(file?.mimetype || '').toLowerCase().includes('video') ? 'video' : 'image';
    const captureSource = this.normalizeCaptureSource(options?.captureSource);
    const useBucketStorage = this.shouldUploadChecklistMediaToBucket();

    let fileName = '';
    let storedFileUrl = '';
    let responseFileUrl = '';
    let storageMetadata: Record<string, unknown> | null = null;
    const inspectionId = this.resolveInspectionIdForInstance(instanceId);

    if (useBucketStorage) {
      const storageUpload = await this.fileStorageService.storeUploadedFileInBucket(file, {
        bucket: this.resolveChecklistMediaBucket(),
        keyPrefix: this.buildChecklistBucketKeyPrefix(instanceId),
      });

      fileName = storageUpload.fileName;
      storedFileUrl = this.buildStoredChecklistBucketPath(storageUpload.key);
      responseFileUrl = this.normalizeChecklistMediaUrl(storageUpload.url, { fileName, subFolder });
      storageMetadata = {
        provider: 's3',
        context_type: 'instance',
        inspection_id: inspectionId,
        instance_id: Number(instanceId || 0),
        item_id: Number(itemId || 0),
        bucket: storageUpload.bucket,
        key: storageUpload.key,
        url: storageUpload.url,
      };
    } else {
      fileName = await this.fileStorageService.storeUploadedFile(file, subFolder);
      const baseLink = this.fileStorageService.resolveLink(fileName, subFolder)
        || `/uploads/${subFolder}/${encodeURIComponent(fileName)}`;
      storedFileUrl = this.normalizeChecklistMediaUrl(baseLink, { fileName, subFolder });
      responseFileUrl = storedFileUrl;
    }

    const photoMetadata: Record<string, unknown> = {
      capture_source: captureSource,
      uploader_user_id: Number(options?.userId || 0) || null,
    };
    if (storageMetadata) {
      photoMetadata.storage = storageMetadata;
    }

    const uploadPayload = {
      instance_id: instanceId,
      item_id: itemId,
      file_name: fileName,
      file_path: storedFileUrl,
      file_url: storedFileUrl,
      file_type: fileType,
      file_size: Number(file?.size || 0),
      mime_type: file?.mimetype || '',
      photo_metadata: JSON.stringify(photoMetadata),
    };

    const insertId = await this.repository.createPhotoSubmission(uploadPayload);
    const resolvedId = insertId > 0
      ? insertId
      : await this.repository.findPhotoSubmissionIdByLocator(instanceId, itemId, [storedFileUrl]);
    const media = resolvedId ? await this.repository.getPhotoSubmissionById(resolvedId) : null;
    const mediaMeta = this.safeParseJson<Record<string, unknown>>(media?.photo_metadata, {});
    const mediaDisplayUrl = await this.resolveChecklistMediaReadUrl(
      String(media?.file_url || storedFileUrl),
      mediaMeta,
      subFolder,
    );

    return {
      success: true,
      file_url: responseFileUrl || mediaDisplayUrl,
      media: {
        id: Number(media?.id || resolvedId || insertId || 0),
        item_id: Number(media?.item_id || itemId),
        file_url: mediaDisplayUrl,
        file_type: (String(media?.file_type || fileType) === 'video' ? 'video' : 'image') as 'video' | 'image',
        file_name: String(media?.file_name || fileName),
        created_at: (media?.created_at as string | null) ?? null,
      },
      user_id: options?.userId || null,
    };
  }

  private buildStoredChecklistBucketPath(key: string): string {
    const normalizedKey = String(key || '').trim().replace(/^\/+/, '');
    if (!normalizedKey) {
      return '/attachments';
    }

    return `/${['attachments', ...normalizedKey.split('/').filter(Boolean)].join('/')}`;
  }

  private shouldUploadChecklistMediaToBucket(): boolean {
    const mediaStorageMode = this.resolveMediaStorageMode();
    if (mediaStorageMode === 'local') {
      return false;
    }

    const configuredBucket = String(process.env.MEDIA_STORAGE_BUCKET || '').trim();
    if (configuredBucket) {
      return true;
    }

    throw new InternalServerErrorException(
      'Missing checklist storage configuration. Set MEDIA_STORAGE_BUCKET for checklist uploads, or set MEDIA_STORAGE_MODE="local" for local checklist storage.',
    );
  }

  private resolveMediaStorageMode(): 'local' | 's3' | 'bucket' | null {
    const mode = String(process.env.MEDIA_STORAGE_MODE || '').trim().toLowerCase();
    if (mode !== 'local' && mode !== 's3' && mode !== 'bucket') {
      const configuredBucket = String(process.env.MEDIA_STORAGE_BUCKET || '').trim();
      if (configuredBucket) {
        return 'bucket';
      }

      return null;
    }

    return mode as 'local' | 's3' | 'bucket';
  }

  private resolveChecklistMediaBucket(): string {
    const bucket = String(process.env.MEDIA_STORAGE_BUCKET || '').trim();
    if (!bucket) {
      throw new InternalServerErrorException(
        'Missing MEDIA_STORAGE_BUCKET. Configure MEDIA_STORAGE_BUCKET for checklist bucket uploads.',
      );
    }

    return bucket;
  }

  private resolveInspectionIdForInstance(instanceId: number): number {
    // Current model uses checklist instance as the inspection root.
    return Number(instanceId || 0);
  }

  private buildChecklistBucketKeyPrefix(instanceId: number): string {
    const safeInstanceId = Number(instanceId || 0);
    return `checklist/instance/${safeInstanceId}`;
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

    const mediaId = await this.resolveMediaIdByLocator(normalizedInstanceId, normalizedItemId, fileUrl);

    if (!mediaId) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_MEDIA_NOT_FOUND',
        message: 'Media not found for provided locator',
      });
    }

    return this.deleteMediaById(mediaId);
  }

  async deleteOwnMedia(instanceId: number, itemId: number, fileUrl: string, requestingUserId: number, mediaId?: number) {
    const normalizedInstanceId = Number(instanceId || 0);
    const normalizedItemId = Number(itemId || 0);
    const normalizedMediaId = Number(mediaId || 0);
    const candidates = this.normalizeMediaLocatorCandidates(fileUrl);

    if (normalizedInstanceId <= 0 || normalizedItemId <= 0 || (normalizedMediaId <= 0 && candidates.length === 0)) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_MEDIA_LOCATOR_INVALID',
        message: 'Missing required locator fields',
      });
    }

    const resolvedMediaId = normalizedMediaId > 0
      ? normalizedMediaId
      : await this.resolveMediaIdByLocator(normalizedInstanceId, normalizedItemId, fileUrl);

    if (!resolvedMediaId) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_MEDIA_NOT_FOUND',
        message: 'Media not found for provided locator',
      });
    }

    const media = await this.repository.getPhotoSubmissionById(resolvedMediaId);
    if (!media) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_MEDIA_NOT_FOUND',
        message: 'Media not found',
      });
    }

    if (Number(media.instance_id || 0) !== normalizedInstanceId) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_MEDIA_NOT_FOUND',
        message: 'Media not found for provided locator',
      });
    }

    const metadata = this.safeParseJson<Record<string, unknown>>(media.photo_metadata, {});
    const uploaderUserId = Number(metadata?.uploader_user_id || 0);
    const callerHasManagePermission = await this.hasManagePermission(requestingUserId);
    if (uploaderUserId !== requestingUserId && !callerHasManagePermission) {
      throw new ForbiddenException({
        code: 'RC_CHECKLIST_MEDIA_NOT_UPLOADER',
        message: 'You can only delete media that you uploaded unless you have manage permission',
      });
    }

    return this.deleteMediaById(resolvedMediaId);
  }

  async archiveInstance(id: number) {
    const result = await this.repository.archiveInstance(id);
    return result;
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
    const normalizedExpiresAt = this.normalizeShareTokenExpiresAt(payload.expires_at);

    await this.repository.createShareToken({
      token,
      instanceId,
      visibleItemIds,
      label: payload.label || null,
      expiresAt: normalizedExpiresAt,
      createdBy: payload.created_by ?? null,
      createdByName: payload.created_by_name ?? null,
    });

    return {
      success: true,
      token,
      expires_at: normalizedExpiresAt,
      label: payload.label || '',
    };
  }

  private normalizeShareTokenExpiresAt(value?: string | null): string | null {
    const raw = String(value || '').trim();
    if (!raw) {
      return null;
    }

    // Keep valid MySQL DATETIME values unchanged.
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) {
      return raw;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException({
        code: 'RC_INVALID_SHARE_TOKEN_EXPIRY',
        message: 'Invalid expires_at value. Provide a valid datetime.',
      });
    }

    return this.formatDateTimeForMySql(parsed);
  }

  private formatDateTimeForMySql(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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

    const baseCandidates = [raw, rawNoQuery, path, trimmed, `/${trimmed}`];

    // Bucket-backed checklist media may be stored as /attachments/<key>
    // while the UI can send signed S3 URLs whose pathname is just /<key>.
    const attachmentCandidates: string[] = [];
    if (trimmed && !trimmed.startsWith('attachments/')) {
      attachmentCandidates.push(`attachments/${trimmed}`);
      attachmentCandidates.push(`/attachments/${trimmed}`);
    }

    const candidates = [...baseCandidates, ...attachmentCandidates]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    return Array.from(new Set(candidates));
  }

  private extractMediaLocatorFileNameCandidates(fileUrl: string): string[] {
    const normalizedCandidates = this.normalizeMediaLocatorCandidates(fileUrl);
    const fileNameCandidates = normalizedCandidates
      .map((candidate) => {
        const normalized = String(candidate || '').trim().replace(/\\/g, '/').replace(/\/+$|\?[^]*$/g, '');
        const lastSlash = normalized.lastIndexOf('/');
        return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
      })
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    return Array.from(new Set(fileNameCandidates));
  }

  private async resolveMediaIdByLocator(instanceId: number, itemId: number, fileUrl: string): Promise<number | null> {
    const locatorCandidates = this.normalizeMediaLocatorCandidates(fileUrl);
    const byLocator = await this.repository.findPhotoSubmissionIdByLocator(instanceId, itemId, locatorCandidates);
    if (byLocator) {
      return byLocator;
    }

    const byInstanceLocator = await this.repository.findPhotoSubmissionIdByInstanceLocator(instanceId, locatorCandidates);
    if (byInstanceLocator) {
      return byInstanceLocator;
    }

    const fileNameCandidates = this.extractMediaLocatorFileNameCandidates(fileUrl);
    if (!fileNameCandidates.length) {
      return null;
    }

    const byFileName = await this.repository.findPhotoSubmissionIdByFileName(instanceId, itemId, fileNameCandidates);
    if (byFileName) {
      return byFileName;
    }

    const byInstanceFileName = await this.repository.findPhotoSubmissionIdByInstanceFileName(
      instanceId,
      fileNameCandidates,
    );
    if (byInstanceFileName) {
      return byInstanceFileName;
    }

    return this.repository.findOnlyPhotoSubmissionIdByInstanceItem(instanceId, itemId);
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

  private async resolveChecklistMediaReadUrl(
    rawUrl: string,
    metadata: Record<string, unknown>,
    subFolder = 'inspectionCheckList',
  ): Promise<string> {
    const storage = metadata?.storage as Record<string, unknown> | undefined;
    const bucket = String(storage?.bucket || '').trim();
    const key = String(storage?.key || '').trim();

    if (bucket && key) {
      try {
        const signedUrl = await this.fileStorageService.resolveBucketObjectUrl(bucket, key);
        if (signedUrl) {
          return this.normalizeChecklistMediaUrl(signedUrl, { subFolder });
        }
      } catch {
        // Fall back to stored URL if signed URL generation fails.
      }
    }

    return this.normalizeChecklistMediaUrl(rawUrl, { subFolder });
  }

  private resolveChecklistMediaPublicOrigin(): string {
    const candidates = [
      process.env.ATTACHMENTS_PUBLIC_BASE_URL,
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

  private resolveChecklistMediaRemoteBaseUrl(): string {
    const configured = String(
      process.env.ATTACHMENTS_PUBLIC_BASE_URL
      || process.env.ATTACHMENTS_FS_REMOTE_BASE_URL
      || '',
    ).trim();
    if (configured) {
      return configured.replace(/\/+$/, '');
    }

    return '/attachments';
  }

  private resolveProductionChecklistMediaUrl(rawUrl: string, subFolder = 'inspectionCheckList'): string {
    const raw = String(rawUrl || '').trim();
    if (!raw) {
      return '';
    }

    const encodePath = (value: string) => value
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    const mapPathToRemote = (pathValue: string): string | null => {
      const normalizedPath = String(pathValue || '').trim().startsWith('/')
        ? String(pathValue || '').trim()
        : `/${String(pathValue || '').trim()}`;

      if (!normalizedPath || normalizedPath === '/') {
        return null;
      }

      if (normalizedPath.startsWith('/attachments/')) {
        const tail = normalizedPath.slice('/attachments/'.length).replace(/^\/+/, '');
        return `${this.checklistMediaRemoteBaseUrl}/${encodePath(tail)}`;
      }

      if (normalizedPath.startsWith('/uploads/')) {
        const tail = normalizedPath.slice('/uploads/'.length).replace(/^\/+/, '');
        return `${this.checklistMediaRemoteBaseUrl}/${encodePath(tail)}`;
      }

      return null;
    };

    if (/^https?:\/\//i.test(raw)) {
      try {
        const parsed = new URL(raw);
        const mapped = mapPathToRemote(parsed.pathname || '');
        if (mapped) {
          return mapped;
        }
        return raw;
      } catch {
        // Fall through to path-based normalization.
      }
    }

    const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
    const mappedLocalPath = mapPathToRemote(normalizedPath);
    if (mappedLocalPath) {
      return mappedLocalPath;
    }

    const uploadsPrefix = `/uploads/${subFolder}/`;
    const attachmentsPrefix = `/attachments/${subFolder}/`;

    if (normalizedPath.startsWith(uploadsPrefix)) {
      const fileName = normalizedPath.slice(uploadsPrefix.length).replace(/^\/+/, '');
      return `${this.checklistMediaRemoteBaseUrl}/${subFolder}/${encodePath(fileName)}`;
    }

    if (normalizedPath.startsWith(attachmentsPrefix)) {
      const fileName = normalizedPath.slice(attachmentsPrefix.length).replace(/^\/+/, '');
      return `${this.checklistMediaRemoteBaseUrl}/${subFolder}/${encodePath(fileName)}`;
    }

    if (!raw.includes('/')) {
      return `${this.checklistMediaRemoteBaseUrl}/${subFolder}/${encodePath(raw)}`;
    }

    return `${this.checklistMediaPublicOrigin}${normalizedPath}`;
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

  private flattenTemplateItems(
    items: Array<Record<string, unknown>>,
    parentOutline = '',
  ): Array<Record<string, unknown> & { outline: string }> {
    const output: Array<Record<string, unknown> & { outline: string }> = [];

    items.forEach((item, index) => {
      const outline = parentOutline ? `${parentOutline}.${index + 1}` : `${index + 1}`;
      output.push({ ...item, outline });

      const children = Array.isArray(item.children) ? (item.children as Array<Record<string, unknown>>) : [];
      if (children.length > 0) {
        output.push(...this.flattenTemplateItems(children, outline));
      }
    });

    return output;
  }

  private toFileName(value: string): string {
    const normalized = String(value || 'checklist-template')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    return normalized || 'checklist-template';
  }

  private formatSubmittedAtLabel(rawValue: string): string {
    const raw = String(rawValue || '').trim();
    if (!raw) {
      return '-';
    }

    const normalized = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(raw)
      ? `${raw.replace(' ', 'T')}Z`
      : raw;

    const timestamp = new Date(normalized);
    if (Number.isNaN(timestamp.getTime())) {
      return raw;
    }

    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: this.displayTimeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      }).format(timestamp);
    } catch {
      return timestamp.toISOString();
    }
  }

  private toShortMediaDisplayLabel(rawUrl: string): string {
    const raw = String(rawUrl || '').trim();
    if (!raw) {
      return 'Attachment';
    }

    let fileName = '';
    try {
      const parsed = new URL(raw);
      const segments = parsed.pathname.split('/').filter(Boolean);
      fileName = decodeURIComponent(segments[segments.length - 1] || '').trim();
    } catch {
      const normalized = raw.split('?')[0];
      const segments = normalized.split('/').filter(Boolean);
      fileName = decodeURIComponent(segments[segments.length - 1] || '').trim();
    }

    const fallback = fileName || 'Attachment';
    if (fallback.length <= 48) {
      return fallback;
    }

    return `${fallback.slice(0, 22)}...${fallback.slice(-16)}`;
  }

  private stripHtmlText(value: unknown): string {
    const raw = String(value || '').trim();
    if (!raw) {
      return '';
    }

    return raw
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private ensurePdfSpace(doc: PDFKit.PDFDocument, neededHeight: number): void {
    if (doc.y + neededHeight <= doc.page.height - doc.page.margins.bottom) {
      return;
    }

    doc.addPage();
  }

  private async fetchChecklistImageBuffer(
    rawUrl: string,
    options?: { subFolder?: string; fileName?: string },
  ): Promise<Buffer | null> {
    const candidates = this.buildChecklistImageUrlCandidates(rawUrl, options);

    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate, { method: 'GET' });
        if (!response.ok) {
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!arrayBuffer.byteLength) {
          continue;
        }

        return Buffer.from(arrayBuffer);
      } catch {
        // Try next candidate URL.
      }
    }

    return this.readChecklistImageBufferFromDisk(rawUrl, options);
  }

  private async readChecklistImageBufferFromDisk(
    rawUrl: string,
    options?: { subFolder?: string; fileName?: string },
  ): Promise<Buffer | null> {
    const subFolder = options?.subFolder || 'inspectionCheckList';
    const fileNames = this.extractChecklistImageFileNameCandidates(rawUrl, options?.fileName);
    if (fileNames.length === 0) {
      return null;
    }

    const configuredUploadDirs = String(process.env.ATTACHMENTS_FS_UPLOAD_DIRS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const configuredRootDirs = String(process.env.ATTACHMENTS_UPLOAD_ROOT_DIRS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const searchDirs = Array.from(new Set([
      ...configuredUploadDirs,
      ...configuredRootDirs.map((rootDir) => join(rootDir, subFolder)),
      ...configuredRootDirs,
      join(process.cwd(), 'uploads', subFolder),
      join(process.cwd(), 'uploads'),
    ]));

    for (const dir of searchDirs) {
      for (const fileName of fileNames) {
        const absolutePath = join(dir, fileName);
        try {
          const buffer = await readFile(absolutePath);
          if (buffer.length > 0) {
            return buffer;
          }
        } catch {
          // Continue trying next location.
        }
      }
    }

    return null;
  }

  private extractChecklistImageFileNameCandidates(rawUrl: string, explicitFileName?: string): string[] {
    const candidates: string[] = [];
    const fromOption = String(explicitFileName || '').trim();
    if (fromOption) {
      candidates.push(fromOption);
    }

    const source = String(rawUrl || '').trim();
    if (source) {
      try {
        const parsed = new URL(source);
        const segments = parsed.pathname.split('/').filter(Boolean);
        const fileName = decodeURIComponent(segments[segments.length - 1] || '').trim();
        if (fileName) {
          candidates.push(fileName);
        }
      } catch {
        const withoutQuery = source.split('?')[0];
        const segments = withoutQuery.split('/').filter(Boolean);
        const fileName = decodeURIComponent(segments[segments.length - 1] || '').trim();
        if (fileName) {
          candidates.push(fileName);
        }
      }
    }

    return Array.from(new Set(candidates.filter(Boolean)));
  }

  private async compressImageForPdf(input: Buffer): Promise<Buffer> {
    try {
      return await sharp(input)
        .rotate()
        .resize({
          width: 1024,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .flatten({ background: '#ffffff' })
        .jpeg({
          quality: 58,
          progressive: true,
          chromaSubsampling: '4:2:0',
          mozjpeg: true,
        })
        .toBuffer();
    } catch {
      // Fall back to the original image if compression fails.
      return input;
    }
  }

  private buildChecklistImageUrlCandidates(
    rawUrl: string,
    options?: { subFolder?: string; fileName?: string },
  ): string[] {
    const source = String(rawUrl || '').trim();
    if (!source) {
      return [];
    }

    const candidates: string[] = [];
    const subFolder = options?.subFolder || 'inspectionCheckList';
    const productionUrl = this.resolveProductionChecklistMediaUrl(source, subFolder);
    if (productionUrl) {
      candidates.push(productionUrl);
    }

    if (/^https?:\/\//i.test(source)) {
      candidates.push(source);
    } else {
      candidates.push(source.startsWith('/') ? source : `/${source}`);
      candidates.push(this.normalizeChecklistMediaUrl(source, { subFolder: 'inspectionCheckList' }));
    }

    if (!/^https?:\/\//i.test(source) && this.checklistMediaPublicOrigin) {
      const normalizedPath = source.startsWith('/') ? source : `/${source}`;
      candidates.push(`${this.checklistMediaPublicOrigin}${normalizedPath}`);
    }

    const fileName = String(options?.fileName || '').trim();
    if (fileName) {
      const resolvedLink = this.fileStorageService.resolveLink(fileName, subFolder);
      if (resolvedLink) {
        candidates.push(this.resolveProductionChecklistMediaUrl(resolvedLink, subFolder));
        candidates.push(resolvedLink);
      }
    }

    if (this.dashboardWebBaseUrl) {
      const absoluteCandidates = candidates
        .filter((value) => String(value || '').startsWith('/'))
        .map((value) => `${this.dashboardWebBaseUrl}${value}`);
      candidates.push(...absoluteCandidates);
    }

    return Array.from(new Set(candidates.filter((url) => !!String(url || '').trim())));
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
