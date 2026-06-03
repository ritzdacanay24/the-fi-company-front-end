import { Injectable, Logger } from '@nestjs/common';
import { MysqlService } from '@/shared/database/mysql.service';
import { RowDataPacket } from 'mysql2/promise';
import { PhotoChecklistService } from './photo-checklist.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';

interface ReportJob extends RowDataPacket {
  id: number;
  instance_id: number;
  template_id?: number | null;
  template_revision_id?: number | null;
  status: string;
  error_message: string | null;
  report_file_name: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);
  private readonly reportSubFolder = 'inspectionCheckList/final-submissions';
  private readonly attachmentsRemoteBaseUrl = this.resolveAttachmentsRemoteBaseUrl();
  private readonly dashboardWebBaseUrl = String(process.env.DASHBOARD_WEB_BASE_URL || '').replace(/\/+$/, '');
  private readonly displayTimeZone = String(process.env.INSPECTION_CHECKLIST_DISPLAY_TIME_ZONE || 'America/Los_Angeles').trim();

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly checklistService: PhotoChecklistService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  /**
   * Strict immediate path used by final submit.
   * Must complete PDF generation + email in request cycle, otherwise throw.
   */
  async processFinalSubmissionNow(instanceId: number): Promise<void> {
    const exportResult = await this.checklistService.exportInstancePdf(instanceId);
    if (!exportResult?.buffer) {
      throw new Error(`Could not generate in-memory PDF for instance ${instanceId}`);
    }

    let storedReportUrl = '';
    try {
      const result = await this.checklistService.generateFinalSubmissionPdf(instanceId);
      storedReportUrl = String(result?.download_url || result?.file_url || result?.file_name || '');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('ATTACHMENTS_UPLOAD_ROOT_DIRS')) {
        this.logger.warn(
          `Storage not configured for final-submission persistence (instance ${instanceId}); continuing with email attachment only.`,
        );
      } else {
        throw error;
      }
    }

    await this.recordImmediateResult(instanceId, 'completed', null, storedReportUrl || undefined);
    await this.sendFinalSubmissionNotification(instanceId, exportResult.buffer, exportResult.fileName);
  }

  /**
   * Poll and process queued report generation jobs.
    * Called by scheduled-jobs runner.
   */
  async processQueuedReports(): Promise<void> {
    try {
      const jobs = await this.getQueuedJobs();

      if (jobs.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${jobs.length} queued report(s)`);

      for (const job of jobs) {
        await this.processJob(job);
      }
    } catch (error) {
      this.logger.error(`Error processing queued reports: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Create a report generation job for an inspection instance.
   */
  async createReportJob(instanceId: number): Promise<void> {
    try {
      const existing = await this.mysqlService.query<RowDataPacket[]>(`
        SELECT id
        FROM inspection_instance_report_jobs
        WHERE instance_id = ?
          AND status IN ('queued', 'processing')
        ORDER BY created_at DESC
        LIMIT 1
      `, [instanceId]);

      if ((existing || []).length > 0) {
        return;
      }

      await this.mysqlService.query(`
        INSERT INTO inspection_instance_report_jobs (
          instance_id,
          template_id,
          template_revision_id,
          status,
          created_at,
          updated_at
        )
        SELECT
          ci.id,
          ci.template_id,
          ct.quality_revision_id,
          'queued',
          NOW(),
          NOW()
        FROM checklist_instances ci
        LEFT JOIN checklist_templates ct ON ct.id = ci.template_id
        WHERE ci.id = ?
        LIMIT 1
      `, [instanceId]);

      this.logger.debug(`Created report generation job for instance ${instanceId}`);
    } catch (error) {
      this.logger.error(
        `Error creating report job for instance ${instanceId}: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  /**
   * Get the generated report file name for an instance.
   */
  async getReportFileName(instanceId: number): Promise<string | null> {
    try {
      const result = await this.mysqlService.query<RowDataPacket[]>(`
        SELECT report_file_name FROM inspection_instance_report_jobs
        WHERE instance_id = ? AND status = 'completed'
        ORDER BY updated_at DESC
        LIMIT 1
      `, [instanceId]);

      return result?.[0]?.report_file_name ?? null;
    } catch (error) {
      this.logger.error(`Error getting report file name: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  /**
   * Get the status of the latest report job for an instance.
   */
  async getReportJobStatus(instanceId: number): Promise<{ status: string; error_message?: string } | null> {
    try {
      const result = await this.mysqlService.query<RowDataPacket[]>(`
        SELECT status, error_message FROM inspection_instance_report_jobs
        WHERE instance_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [instanceId]);

      if (result.length === 0) {
        return null;
      }

      return {
        status: result[0].status,
        ...(result[0].error_message && { error_message: result[0].error_message }),
      };
    } catch (error) {
      this.logger.error(`Error getting report job status: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  async getReportDownloadInfo(instanceId: number): Promise<{
    status: 'ready' | 'queued' | 'processing' | 'failed' | 'none';
    download_url?: string;
    error_message?: string;
  }> {
    try {
      const rows = await this.mysqlService.query<RowDataPacket[]>(`
        SELECT status, report_file_name, error_message
        FROM inspection_instance_report_jobs
        WHERE instance_id = ?
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
      `, [instanceId]);

      const latest = rows?.[0];
      if (!latest) {
        return { status: 'none' };
      }

      const rawStatus = String(latest.status || '').trim().toLowerCase();
      if (rawStatus === 'completed') {
        const raw = String(latest.report_file_name || '').trim();
        const downloadUrl = this.buildServerDownloadUrl(raw);
        return { status: 'ready', download_url: downloadUrl };
      }

      if (rawStatus === 'queued' || rawStatus === 'processing') {
        return { status: rawStatus as 'queued' | 'processing' };
      }

      if (rawStatus === 'failed') {
        return {
          status: 'failed',
          error_message: String(latest.error_message || 'Report generation failed.'),
        };
      }

      return { status: 'none' };
    } catch (error) {
      this.logger.error(`Error getting report download info: ${error instanceof Error ? error.message : error}`);
      return { status: 'none' };
    }
  }

  /**
   * Delete report files and job records for an instance (when instance is deleted).
   */
  async deleteReportJobsForInstance(instanceId: number): Promise<void> {
    try {
      const jobs = await this.mysqlService.query<ReportJob[]>(`
        SELECT id, report_file_name FROM inspection_instance_report_jobs
        WHERE instance_id = ?
      `, [instanceId]);

      for (const job of jobs) {
        if (job.report_file_name) {
          try {
            const fileName = String(job.report_file_name || '').trim().split('/').pop() || '';
            if (fileName) {
              await this.checklistService.deleteFinalSubmissionPdfFile(fileName);
            }
          } catch {
            // Ignore file deletion errors
          }
        }
      }

      await this.mysqlService.query(`
        DELETE FROM inspection_instance_report_jobs
        WHERE instance_id = ?
      `, [instanceId]);

      this.logger.debug(`Deleted report jobs for instance ${instanceId}`);
    } catch (error) {
      this.logger.error(`Error deleting report jobs: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async getQueuedJobs(): Promise<ReportJob[]> {
    const result = await this.mysqlService.query<ReportJob[]>(`
      SELECT id, instance_id, status, error_message, report_file_name, created_at, updated_at
      FROM inspection_instance_report_jobs
      WHERE status = 'queued'
      ORDER BY created_at ASC
      LIMIT 5
    `);

    return result || [];
  }

  private async processJob(job: ReportJob): Promise<void> {
    try {
      // Mark as processing
      await this.updateJobStatus(job.id, 'processing', null);

      // Generate and store final submission PDF in existing uploads path.
      const result = await this.checklistService.generateFinalSubmissionPdf(job.instance_id);
      if (!result) {
        await this.updateJobStatus(job.id, 'failed', 'Could not generate PDF for instance');
        return;
      }

      // Mark as completed
      await this.updateJobStatus(
        job.id,
        'completed',
        null,
        String(result.download_url || result.file_url || result.file_name || ''),
      );

      this.logger.log(
        `Report generated for instance ${job.instance_id}: ${String(result.download_url || result.file_url || result.file_name || '')}`,
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error processing job ${job.id}: ${errorMsg}`);
      await this.updateJobStatus(job.id, 'failed', errorMsg);
    }
  }

  private async updateJobStatus(
    jobId: number,
    status: string,
    errorMessage: string | null,
    reportFileName?: string,
  ): Promise<void> {
    const updateParts = ['status = ?', 'updated_at = NOW()'];
    const params: (string | number | null)[] = [status];

    if (errorMessage !== null) {
      updateParts.push('error_message = ?');
      params.push(errorMessage);
    }

    if (reportFileName) {
      updateParts.push('report_file_name = ?');
      params.push(reportFileName);
    }

    params.push(jobId);

    await this.mysqlService.query(`
      UPDATE inspection_instance_report_jobs
      SET ${updateParts.join(', ')}
      WHERE id = ?
    `, params);
  }

  private async recordImmediateResult(
    instanceId: number,
    status: 'completed' | 'failed',
    errorMessage: string | null,
    reportFileName?: string,
  ): Promise<void> {
    const templateRows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT ci.template_id, ct.quality_revision_id
        FROM checklist_instances ci
        LEFT JOIN checklist_templates ct ON ct.id = ci.template_id
        WHERE ci.id = ?
        LIMIT 1
      `,
      [instanceId],
    );

    const templateId = Number(templateRows?.[0]?.template_id || 0) || null;
    const templateRevisionId = Number(templateRows?.[0]?.quality_revision_id || 0) || null;

    await this.mysqlService.query(
      `
        INSERT INTO inspection_instance_report_jobs (
          instance_id,
          template_id,
          template_revision_id,
          status,
          error_message,
          report_file_name,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        instanceId,
        templateId,
        templateRevisionId,
        status,
        errorMessage,
        reportFileName || null,
      ],
    );
  }

  private async sendFinalSubmissionNotification(
    instanceId: number,
    prebuiltPdfBuffer?: Buffer,
    prebuiltPdfFileName?: string,
  ): Promise<void> {
    const instance = await this.checklistService.getInstanceById(instanceId) as Record<string, unknown>;
    const creatorId = Number(instance?.operator_id || 0);
    const ownerId = Number(instance?.owner_id || 0);
    const creatorName = String(instance?.operator_name || '').trim() || `User #${creatorId || '-'}`;
    const ownerName = String(instance?.owner_name || '').trim() || (ownerId ? `User #${ownerId}` : creatorName);

    const recipients = await this.getActiveUserEmailsByIds([creatorId, ownerId]);
    if (recipients.length === 0) {
      throw new Error(`No active creator/owner recipient emails found for instance ${instanceId}`);
    }

    let attachmentBuffer = prebuiltPdfBuffer;
    let attachmentFileName = prebuiltPdfFileName;
    if (!attachmentBuffer) {
      const exportResult = await this.checklistService.exportInstancePdf(instanceId);
      if (!exportResult?.buffer) {
        throw new Error(`PDF attachment buffer unavailable for instance ${instanceId}`);
      }
      attachmentBuffer = exportResult.buffer;
      attachmentFileName = exportResult.fileName;
    }

    const workOrder = String(instance?.work_order_number || '-').trim() || '-';
    const partNumber = String(instance?.part_number || '-').trim() || '-';
    const serialNumber = String(instance?.serial_number || '-').trim() || '-';
    const templateName = String(instance?.template_name || instance?.name || 'Inspection Checklist').trim();
    const submittedAt = String(instance?.submitted_at || instance?.updated_at || '').trim();
    const submittedLabel = this.formatSubmittedAtLabel(submittedAt);
    const instanceUrl = this.dashboardWebBaseUrl
      ? `${this.dashboardWebBaseUrl}/inspection-checklist/instance?id=${instanceId}`
      : '';

    const subject = `Inspection Checklist Final Submission #${instanceId}`;
    const html = this.emailTemplateService.render('inspection-checklist-final-submission', {
      instanceId,
      templateName: templateName || '-',
      creatorName,
      ownerName,
      submittedLabel,
      workOrder,
      partNumber,
      serialNumber,
      instanceUrl,
    });

    await this.emailService.sendMail({
      to: recipients,
      subject,
      html,
      attachments: [
        {
          filename: attachmentFileName || `instance-${instanceId}-final-submission.pdf`,
          content: attachmentBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    this.logger.log(`Final submission email sent for instance ${instanceId} to ${recipients.join(', ')}`);
  }

  private async getActiveUserEmailsByIds(userIds: number[]): Promise<string[]> {
    const normalized = Array.from(new Set(userIds.filter((id) => Number.isFinite(id) && id > 0)));
    if (normalized.length === 0) {
      return [];
    }

    const placeholders = normalized.map(() => '?').join(',');
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT email
        FROM db.users
        WHERE id IN (${placeholders})
          AND active = 1
          AND email IS NOT NULL
          AND TRIM(email) <> ''
      `,
      normalized,
    );

    return Array.from(
      new Set(
        (rows || [])
          .map((row) => String(row.email || '').trim())
          .filter((email) => email.length > 0),
      ),
    );
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

  private resolveAttachmentsRemoteBaseUrl(): string {
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

  private buildServerDownloadUrl(rawValue: string): string {
    const raw = String(rawValue || '').trim();
    if (!raw) {
      return '';
    }

    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }

    const normalized = raw.startsWith('/') ? raw : `/${raw}`;
    if (normalized.startsWith('/attachments/')) {
      const tail = normalized.slice('/attachments/'.length).replace(/^\/+/, '');
      return `${this.attachmentsRemoteBaseUrl}/${tail}`;
    }

    if (normalized.startsWith('/uploads/')) {
      const tail = normalized.slice('/uploads/'.length).replace(/^\/+/, '');
      return `${this.attachmentsRemoteBaseUrl}/${tail}`;
    }

    const fileName = normalized.replace(/^\/+/, '').split('/').pop() || '';
    return `${this.attachmentsRemoteBaseUrl}/${this.reportSubFolder}/${encodeURIComponent(fileName)}`;
  }
}
