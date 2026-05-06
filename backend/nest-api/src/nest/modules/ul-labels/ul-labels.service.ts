import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import * as XLSX from 'xlsx';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { FileStorageService } from '@/nest/modules/file-storage/file-storage.service';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  count?: number;
  error?: string;
}

interface BulkUploadError {
  index: number;
  ul_number: string;
  error: string;
}

@Injectable()
export class UlLabelsService {
  constructor(
    @Inject(MysqlService)
    private readonly mysqlService: MysqlService,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async getLabels(filters: Record<string, string>): Promise<ApiResponse<RowDataPacket[]>> {
    try {
      const rows = await this.fetchLabelRows(filters);
      return {
        success: true,
        data: rows,
        count: rows.length,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching UL labels: ${this.getErrorMessage(error)}`,
      };
    }
  }
  async checkExistingUlNumbers(ulNumbers: string[]): Promise<ApiResponse<string[]>> {
    const normalized = (ulNumbers || [])
      .map((num) => String(num || '').trim())
      .filter(Boolean);

    if (normalized.length === 0) {
      return { success: true, data: [] };
    }

    try {
      const uniqueNumbers = Array.from(new Set(normalized));
      const placeholders = uniqueNumbers.map(() => '?').join(',');
      const rows = await this.mysqlService.query<Array<RowDataPacket & { ul_number: string }>>(
        `SELECT ul_number FROM ul_labels WHERE ul_number IN (${placeholders})`,
        uniqueNumbers,
      );

      return {
        success: true,
        data: rows.map((row) => String(row.ul_number || '').trim()).filter(Boolean),
      };
    } catch (error) {
      return {
        success: false,
        message: `Error checking existing UL numbers: ${this.getErrorMessage(error)}`,
        data: [],
      };
    }
  }

  async createLabel(body: Record<string, unknown>, currentUserId?: number): Promise<ApiResponse<{ id: number }>> {
    const ulNumber = String(body.ul_number || '').trim();
    if (!ulNumber) {
      return { success: false, message: 'ul_number is required' };
    }

    const description = String(body.description || '').trim();
    const category = String(body.category || '').trim() || 'New';
    const manufacturer = this.toNullableString(body.manufacturer);
    const partNumber = this.toNullableString(body.part_number);
    const certificationDate = this.toNullableString(body.certification_date);
    const expiryDate = this.toNullableString(body.expiry_date);
    const status = String(body.status || 'active');
    const createdBy = await this.resolveUserDisplayName(currentUserId, body.created_by);

    try {
      const result = await this.mysqlService.execute<ResultSetHeader>(
        `
          INSERT INTO ul_labels
          (ul_number, description, category, manufacturer, part_number, certification_date, expiry_date, status, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          ulNumber,
          description,
          category,
          manufacturer,
          partNumber,
          certificationDate,
          expiryDate,
          status,
          createdBy,
        ],
      );

      return {
        success: true,
        message: 'UL label created successfully',
        data: { id: result.insertId },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error creating UL label: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async updateLabel(idRaw: string | undefined, body: Record<string, unknown>, currentUserId?: number): Promise<ApiResponse> {
    const id = Number(idRaw);
    if (!Number.isFinite(id) || id <= 0) {
      return { success: false, message: 'ID is required for update' };
    }

    const allowedFields = [
      'ul_number',
      'description',
      'category',
      'manufacturer',
      'part_number',
      'certification_date',
      'expiry_date',
      'status',
    ] as const;

    const assignments: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        assignments.push(`${field} = ?`);
        values.push(this.toNullableFieldValue(body[field]));
      }
    }

    assignments.push('updated_at = NOW()');
    assignments.push('updated_by = ?');
    values.push(await this.resolveUserDisplayName(currentUserId, body.updated_by));

    if (assignments.length === 1) {
      return { success: false, message: 'No updatable fields provided' };
    }

    values.push(id);

    try {
      const result = await this.mysqlService.execute<ResultSetHeader>(
        `UPDATE ul_labels SET ${assignments.join(', ')} WHERE id = ?`,
        values,
      );

      if (result.affectedRows === 0) {
        return { success: false, message: 'UL label not found' };
      }

      return {
        success: true,
        message: 'UL label updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error updating UL label: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async voidLabel(idRaw?: string, reason?: string, performedBy?: string): Promise<ApiResponse> {
    const id = Number(idRaw);
    if (!Number.isFinite(id) || id <= 0) {
      return { success: false, message: 'ID is required' };
    }

    try {
      const assignmentRows = await this.mysqlService.query<Array<RowDataPacket & { id: number }>>(
        'SELECT id FROM serial_assignments WHERE ul_label_id = ? LIMIT 1',
        [id],
      );
      if (assignmentRows.length > 0) {
        return {
          success: false,
          message: 'Cannot mark as used. UL label is already linked to a serial assignment.',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error validating serial assignment link: ${this.getErrorMessage(error)}`,
      };
    }

    const consumedBy = reason
      ? `${reason} (${performedBy ?? 'system'})`
      : (performedBy ?? null);

    try {
      const result = await this.mysqlService.execute<ResultSetHeader>(
        `UPDATE ul_labels SET is_consumed = 1, consumed_at = NOW(), consumed_by = ? WHERE id = ? AND COALESCE(is_consumed, 0) = 0`,
        [consumedBy, id],
      );

      if (result.affectedRows === 0) {
        return { success: false, message: 'UL label not found or already consumed' };
      }

      return { success: true, message: 'UL label marked as used' };
    } catch (error) {
      return {
        success: false,
        message: `Error marking UL label as used: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async writeOffLabel(
    idRaw: string,
    reason: 'Damaged' | 'Lost' | 'Other',
    notes: string | undefined,
    performedBy: string,
  ): Promise<ApiResponse> {
    const id = Number(idRaw);
    if (!Number.isFinite(id) || id <= 0) {
      return { success: false, message: 'ID is required' };
    }
    if (!reason) {
      return { success: false, message: 'Reason is required' };
    }

    try {
      const assignmentRows = await this.mysqlService.query<Array<RowDataPacket & { id: number }>>(
        'SELECT id FROM serial_assignments WHERE ul_label_id = ? LIMIT 1',
        [id],
      );
      if (assignmentRows.length > 0) {
        return {
          success: false,
          message: 'Cannot write off. UL label is already linked to a serial assignment.',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error validating serial assignment link: ${this.getErrorMessage(error)}`,
      };
    }

    const consumedBy = notes?.trim()
      ? `WRITE-OFF:${reason} - ${notes.trim()} (${performedBy})`
      : `WRITE-OFF:${reason} (${performedBy})`;

    try {
      const result = await this.mysqlService.execute<ResultSetHeader>(
        `UPDATE ul_labels
         SET is_consumed = 1, consumed_at = NOW(), consumed_by = ?
         WHERE id = ? AND COALESCE(is_consumed, 0) = 0`,
        [consumedBy, id],
      );

      if (result.affectedRows === 0) {
        return { success: false, message: 'UL label not found or already consumed' };
      }

      return { success: true, message: `UL label written off: ${reason}` };
    } catch (error) {
      return {
        success: false,
        message: `Error writing off UL label: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async restoreLabelAvailability(idRaw: string, reason?: string, performedBy?: string): Promise<ApiResponse> {
    const id = Number(idRaw);
    if (!Number.isFinite(id) || id <= 0) {
      return { success: false, message: 'ID is required' };
    }

    try {
      const assignmentRows = await this.mysqlService.query<Array<RowDataPacket & { id: number }>>(
        'SELECT id FROM serial_assignments WHERE ul_label_id = ? LIMIT 1',
        [id],
      );
      if (assignmentRows.length > 0) {
        return {
          success: false,
          message: 'Cannot restore. UL label is linked to a serial assignment.',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error validating serial assignment link: ${this.getErrorMessage(error)}`,
      };
    }

    const restoredBy = reason
      ? `RESTORED:${reason} (${performedBy ?? 'system'})`
      : `RESTORED (${performedBy ?? 'system'})`;

    try {
      const result = await this.mysqlService.execute<ResultSetHeader>(
        `UPDATE ul_labels
         SET is_consumed = 0,
             consumed_at = NULL,
             consumed_by = ?,
             status = 'active'
         WHERE id = ? AND COALESCE(is_consumed, 0) = 1`,
        [restoredBy, id],
      );

      if (result.affectedRows === 0) {
        return { success: false, message: 'UL label not found or already available' };
      }

      return { success: true, message: 'UL label restored to available' };
    } catch (error) {
      return {
        success: false,
        message: `Error restoring UL label: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async deleteLabel(idRaw?: string): Promise<ApiResponse> {
    const id = Number(idRaw);
    if (!Number.isFinite(id) || id <= 0) {
      return { success: false, message: 'ID is required for delete' };
    }

    try {
      const usageRows = await this.mysqlService.query<Array<RowDataPacket & { usage_count: number }>>(
        `
          SELECT COUNT(*) AS usage_count
          FROM ul_label_usages
          WHERE ul_label_id = ?
            AND (status IS NULL OR status != 'deleted')
            AND (is_voided IS NULL OR is_voided = 0)
        `,
        [id],
      );

      if ((usageRows[0]?.usage_count || 0) > 0) {
        return {
          success: false,
          message: 'Cannot delete UL label that is in use. Please remove all usages first.',
        };
      }

      const result = await this.mysqlService.execute<ResultSetHeader>('DELETE FROM ul_labels WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return { success: false, message: 'UL label not found' };
      }

      return {
        success: true,
        message: 'UL label deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error deleting UL label: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async handleBulkUploadJson(body: Record<string, unknown>, currentUserId?: number): Promise<ApiResponse> {
    const createdBy = await this.resolveUserDisplayName(currentUserId, body.created_by);

    if (Array.isArray(body.labels)) {
      return this.bulkCreateLabels(body.labels as Record<string, unknown>[], createdBy);
    }

    if (body.start_number !== undefined && body.end_number !== undefined) {
      return this.createLabelsFromRange(body, createdBy);
    }

    return {
      success: false,
      message: "Invalid upload format. Expected 'labels' array or range payload.",
    };
  }

  async handleBulkUploadFile(file: { originalname?: string; buffer: Buffer }, currentUserId?: number): Promise<ApiResponse> {
    const createdBy = await this.resolveUserDisplayName(currentUserId);
    const fileName = (file.originalname || '').toLowerCase();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return {
          success: false,
          message: 'Excel file has no sheets to import',
        };
      }

      const sheet = workbook.Sheets[firstSheetName];
      const labels = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
        raw: false,
      });

      return this.bulkCreateLabels(
        labels.map((row: Record<string, unknown>) => this.normalizeBulkRow(row)),
        createdBy,
      );
    }

    const csv = file.buffer.toString('utf-8');
    const lines = csv
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return {
        success: false,
        message: 'CSV must include a header row and at least one data row',
      };
    }

    const headers = this.parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
    const labels: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i += 1) {
      const values = this.parseCsvLine(lines[i]);
      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      labels.push(this.normalizeBulkRow(row));
    }

    return this.bulkCreateLabels(labels, createdBy);
  }

  async uploadImage(
    file: { originalname?: string; mimetype?: string; buffer: Buffer } | undefined,
    ulLabelIdRaw: unknown,
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const ulLabelId = Number(ulLabelIdRaw);
    if (!Number.isFinite(ulLabelId) || ulLabelId <= 0) {
      return {
        success: false,
        message: 'ul_label_id is required',
      };
    }

    if (!file || !file.buffer || file.buffer.length === 0) {
      return {
        success: false,
        message: 'image file is required',
      };
    }

    const mime = String(file.mimetype || '').toLowerCase();
    const supportedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!supportedMimes.includes(mime)) {
      return {
        success: false,
        message: 'Unsupported file type. Allowed: JPG, PNG, PDF',
      };
    }

    try {
      const existing = await this.mysqlService.query<Array<RowDataPacket & { id: number }>>(
        'SELECT id FROM ul_labels WHERE id = ? LIMIT 1',
        [ulLabelId],
      );

      if (!existing[0]) {
        return {
          success: false,
          message: 'UL label not found',
        };
      }

      const subFolder = 'ul-labels';
      const fileName = await this.fileStorageService.storeUploadedFile(file, subFolder);
      const publicPath = this.fileStorageService.resolveLink(fileName, subFolder)
        || `/attachments/${subFolder}/${encodeURIComponent(fileName)}`;

      await this.mysqlService.execute(
        'UPDATE ul_labels SET label_image_url = ?, updated_at = NOW() WHERE id = ?',
        [publicPath, ulLabelId],
      );

      return {
        success: true,
        data: {
          ul_label_id: ulLabelId,
          label_image_url: publicPath,
        },
        message: 'Label image uploaded successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error uploading label image: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async getUsage(filters: Record<string, string>): Promise<ApiResponse<RowDataPacket[] | RowDataPacket>> {
    try {
      const id = Number(filters.id);
      const rows = await this.fetchUsageRows(filters);

      if (Number.isFinite(id) && id > 0) {
        const row = rows[0];
        if (!row) {
          return { success: false, message: 'Usage record not found', error: 'NOT_FOUND' };
        }

        return { success: true, data: row, message: 'Usage record retrieved successfully' };
      }

      return {
        success: true,
        data: rows,
        message: 'Usage records retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error retrieving usage records: ${this.getErrorMessage(error)}`,
        error: 'DATABASE_ERROR',
      };
    }
  }

  async createUsage(body: Record<string, unknown>, currentUserId?: number): Promise<ApiResponse<{ id: number }>> {
    const required = ['ul_label_id', 'ul_number', 'eyefi_serial_number', 'date_used', 'user_signature', 'user_name'];
    for (const field of required) {
      const value = body[field];
      if (value === undefined || value === null || String(value).trim() === '') {
        return { success: false, message: `Missing required field: ${field}`, error: 'VALIDATION_ERROR' };
      }
    }

    try {
      const labelRows = await this.mysqlService.query<Array<RowDataPacket & { id: number; status: string }>>(
        'SELECT id, status FROM ul_labels WHERE id = ? LIMIT 1',
        [Number(body.ul_label_id)],
      );

      const label = labelRows[0];
      if (!label) {
        return { success: false, message: 'UL Label not found', error: 'NOT_FOUND' };
      }

      if (String(label.status).toLowerCase() !== 'active') {
        return { success: false, message: 'UL Label is not active', error: 'VALIDATION_ERROR' };
      }

      const result = await this.mysqlService.execute<ResultSetHeader>(
        `
          INSERT INTO ul_label_usages
          (ul_label_id, ul_number, eyefi_serial_number, quantity_used, date_used,
           user_signature, user_name, customer_name, notes,
           wo_nbr, wo_due_date, wo_part, wo_qty_ord, wo_routing, wo_line, wo_description,
           created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          Number(body.ul_label_id),
          String(body.ul_number),
          String(body.eyefi_serial_number),
          Number(body.quantity_used || 1),
          String(body.date_used),
          String(body.user_signature),
          String(body.user_name),
          String(body.customer_name || ''),
          this.toNullableString(body.notes),
          this.toNullableNumber(body.wo_nbr),
          this.toNullableString(body.wo_due_date),
          this.toNullableString(body.wo_part),
          this.toNullableNumber(body.wo_qty_ord),
          this.toNullableString(body.wo_routing),
          this.toNullableString(body.wo_line),
          this.toNullableString(body.wo_description),
          Number(currentUserId) > 0 ? Number(currentUserId) : (this.toNullableNumber(body.created_by) || 1),
        ],
      );

      return {
        success: true,
        data: { id: result.insertId },
        message: 'Usage record created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error creating usage record: ${this.getErrorMessage(error)}`,
        error: 'DATABASE_ERROR',
      };
    }
  }

  async updateUsage(idRaw: string | undefined, body: Record<string, unknown>, currentUserId?: number): Promise<ApiResponse<{ id: number }>> {
    const id = Number(idRaw);
    if (!Number.isFinite(id) || id <= 0) {
      return { success: false, message: 'ID required for update', error: 'INVALID_REQUEST' };
    }

    try {
      const existing = await this.mysqlService.query<Array<RowDataPacket & { id: number }>>(
        'SELECT id FROM ul_label_usages WHERE id = ? LIMIT 1',
        [id],
      );

      if (!existing[0]) {
        return { success: false, message: 'Usage record not found', error: 'NOT_FOUND' };
      }

      await this.mysqlService.execute(
        `
          UPDATE ul_label_usages
          SET ul_label_id = ?, ul_number = ?, eyefi_serial_number = ?, quantity_used = ?,
              date_used = ?, user_signature = ?, user_name = ?, customer_name = ?,
              notes = ?, wo_nbr = ?, wo_due_date = ?, wo_part = ?, wo_qty_ord = ?,
              wo_routing = ?, wo_line = ?, wo_description = ?, updated_by = ?, updated_at = NOW()
          WHERE id = ?
        `,
        [
          Number(body.ul_label_id),
          String(body.ul_number),
          String(body.eyefi_serial_number),
          Number(body.quantity_used || 1),
          String(body.date_used),
          String(body.user_signature),
          String(body.user_name),
          String(body.customer_name || ''),
          this.toNullableString(body.notes),
          this.toNullableNumber(body.wo_nbr),
          this.toNullableString(body.wo_due_date),
          this.toNullableString(body.wo_part),
          this.toNullableNumber(body.wo_qty_ord),
          this.toNullableString(body.wo_routing),
          this.toNullableString(body.wo_line),
          this.toNullableString(body.wo_description),
          Number(currentUserId) > 0 ? Number(currentUserId) : (this.toNullableNumber(body.updated_by) || 1),
          id,
        ],
      );

      return {
        success: true,
        data: { id },
        message: 'Usage record updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error updating usage record: ${this.getErrorMessage(error)}`,
        error: 'DATABASE_ERROR',
      };
    }
  }

  async voidUsage(idRaw: string, voidReason?: string): Promise<ApiResponse<Record<string, unknown>>> {
    const id = Number(idRaw);
    if (!Number.isFinite(id) || id <= 0) {
      return { success: false, message: 'ID required for void', error: 'INVALID_REQUEST' };
    }

    try {
      const usageRows = await this.mysqlService.query<
        Array<RowDataPacket & { ul_label_id: number; ul_number: string; eyefi_serial_number: string }>
      >('SELECT ul_label_id, ul_number, eyefi_serial_number FROM ul_label_usages WHERE id = ? LIMIT 1', [id]);

      const usage = usageRows[0];
      if (!usage) {
        return { success: false, message: 'Usage record not found', error: 'NOT_FOUND' };
      }

      await this.mysqlService.execute(
        `
          UPDATE ul_label_usages
          SET is_voided = 1,
              void_reason = ?,
              void_date = NOW(),
              updated_at = NOW()
          WHERE id = ?
        `,
        [voidReason || null, id],
      );

      await this.mysqlService.execute('UPDATE ul_labels SET status = ? WHERE id = ?', ['active', usage.ul_label_id]);

      try {
        await this.mysqlService.execute(
          `
            UPDATE eyefi_serial_numbers
            SET status = 'available',
                assigned_to_table = NULL,
                assigned_to_id = NULL,
                assigned_by = NULL,
                assigned_at = NULL
            WHERE serial_number = ?
          `,
          [usage.eyefi_serial_number],
        );
      } catch {
        // Serial table can vary between environments; UL void still succeeds without this update.
      }

      return {
        success: true,
        data: {
          id,
          freed_ul_label: usage.ul_number,
          freed_eyefi_serial: usage.eyefi_serial_number,
        },
        message: 'Usage record voided and resources freed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error voiding usage record: ${this.getErrorMessage(error)}`,
        error: 'DATABASE_ERROR',
      };
    }
  }

  async deleteUsage(idRaw?: string): Promise<ApiResponse<null>> {
    const id = Number(idRaw);
    if (!Number.isFinite(id) || id <= 0) {
      return { success: false, message: 'ID required for delete', error: 'INVALID_REQUEST' };
    }

    try {
      const existing = await this.mysqlService.query<Array<RowDataPacket & { id: number }>>(
        'SELECT id FROM ul_label_usages WHERE id = ? LIMIT 1',
        [id],
      );

      if (!existing[0]) {
        return { success: false, message: 'Usage record not found', error: 'NOT_FOUND' };
      }

      await this.mysqlService.execute('DELETE FROM ul_label_usages WHERE id = ?', [id]);
      return { success: true, data: null, message: 'Usage record deleted successfully' };
    } catch (error) {
      return {
        success: false,
        message: `Error deleting usage record: ${this.getErrorMessage(error)}`,
        error: 'DATABASE_ERROR',
      };
    }
  }

  async getUlNumbers(): Promise<ApiResponse<string[]>> {
    try {
      const rows = await this.mysqlService.query<Array<RowDataPacket & { ul_number: string }>>(
        "SELECT ul_number FROM ul_labels WHERE status = 'active' ORDER BY ul_number ASC",
      );

      return {
        success: true,
        data: rows.map((row) => row.ul_number),
        message: 'UL Numbers retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error loading UL numbers: ${this.getErrorMessage(error)}`,
        error: 'SERVER_ERROR',
      };
    }
  }

  async validateUlNumber(ulNumberRaw?: string): Promise<ApiResponse<RowDataPacket>> {
    const ulNumber = String(ulNumberRaw || '').trim();
    if (!ulNumber) {
      return {
        success: false,
        error: 'INVALID_REQUEST',
        message: 'UL number parameter is required',
      };
    }

    try {
      const rows = await this.mysqlService.query<Array<RowDataPacket & { id: number }>>(
        `
          SELECT id, ul_number, description, category, manufacturer, part_number,
                 certification_date, expiry_date, status,
                 CASE
                   WHEN expiry_date IS NOT NULL AND expiry_date < CURDATE() THEN 'expired'
                   WHEN expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'expiring_soon'
                   ELSE status
                 END AS computed_status
          FROM ul_labels
          WHERE ul_number = ?
          LIMIT 1
        `,
        [ulNumber],
      );

      const label = rows[0];
      if (!label) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'UL Number not found',
        };
      }

      const usageStats = await this.mysqlService.query<
        Array<RowDataPacket & { usage_count: number; total_quantity_used: number; last_used_date: string | null }>
      >(
        `
          SELECT COUNT(*) AS usage_count,
                 COALESCE(SUM(quantity_used), 0) AS total_quantity_used,
                 MAX(date_used) AS last_used_date
          FROM ul_label_usages
          WHERE ul_label_id = ?
            AND (is_voided IS NULL OR is_voided = 0)
        `,
        [label.id],
      );

      return {
        success: true,
        data: {
          ...label,
          usage_count: usageStats[0]?.usage_count || 0,
          total_quantity_used: usageStats[0]?.total_quantity_used || 0,
          last_used_date: usageStats[0]?.last_used_date || null,
        },
        message: 'UL Number is valid and found',
      };
    } catch (error) {
      return {
        success: false,
        error: 'SERVER_ERROR',
        message: `Internal server error: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async getDashboardStats(): Promise<ApiResponse<Record<string, unknown>>> {
    try {
      const statsRows = await this.mysqlService.query<Array<RowDataPacket & Record<string, unknown>>>(
        `
          SELECT
            (SELECT COUNT(*) FROM ul_labels WHERE status = 'active') AS active_labels,
            (SELECT COUNT(*) FROM ul_labels WHERE status = 'inactive') AS inactive_labels,
            (SELECT COUNT(*) FROM ul_labels WHERE status = 'expired' OR (expiry_date IS NOT NULL AND expiry_date < CURDATE())) AS expired_labels,
            (SELECT COUNT(*) FROM ul_labels WHERE expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND expiry_date >= CURDATE()) AS expiring_soon_labels,
            (SELECT COUNT(*) FROM ul_label_usages WHERE date_used >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND (is_voided IS NULL OR is_voided = 0)) AS usage_last_30_days,
            (SELECT COUNT(*) FROM ul_label_usages WHERE date_used = CURDATE() AND (is_voided IS NULL OR is_voided = 0)) AS usage_today,
            (SELECT COUNT(*) FROM ul_label_usages WHERE date_used >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND (is_voided IS NULL OR is_voided = 0)) AS usage_last_7_days,
            (SELECT COUNT(DISTINCT customer_name) FROM ul_label_usages WHERE date_used >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND (is_voided IS NULL OR is_voided = 0)) AS active_customers_30_days,
            (SELECT COALESCE(SUM(quantity_used), 0) FROM ul_label_usages WHERE date_used >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND (is_voided IS NULL OR is_voided = 0)) AS total_quantity_used_30_days,
            (SELECT COALESCE(SUM(quantity_used), 0) FROM ul_label_usages WHERE date_used = CURDATE() AND (is_voided IS NULL OR is_voided = 0)) AS total_quantity_used_today,
            (SELECT COUNT(*) FROM ul_labels) AS total_labels,
            (SELECT COUNT(*) FROM ul_label_usages) AS total_usage_records
        `,
      );

      const recentActivity = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT
            ulu.ul_number,
            ul.description AS ul_description,
            ulu.customer_name,
            ulu.user_name,
            ulu.quantity_used,
            ulu.date_used,
            ulu.created_at
          FROM ul_label_usages ulu
          INNER JOIN ul_labels ul ON ulu.ul_label_id = ul.id
          WHERE (ulu.is_voided IS NULL OR ulu.is_voided = 0)
          ORDER BY ulu.created_at DESC
          LIMIT 10
        `,
      );

      const expiringLabels = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT
            ul_number,
            description,
            category,
            expiry_date,
            DATEDIFF(expiry_date, CURDATE()) AS days_until_expiry
          FROM ul_labels
          WHERE expiry_date IS NOT NULL
            AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            AND expiry_date >= CURDATE()
          ORDER BY expiry_date ASC
          LIMIT 10
        `,
      );

      const topCustomers = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT
            customer_name,
            COUNT(*) AS usage_count,
            SUM(quantity_used) AS total_quantity
          FROM ul_label_usages
          WHERE date_used >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            AND (is_voided IS NULL OR is_voided = 0)
          GROUP BY customer_name
          ORDER BY total_quantity DESC, usage_count DESC
          LIMIT 5
        `,
      );

      const topUlNumbers = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT
            ulu.ul_number,
            ul.description,
            COUNT(*) AS usage_count,
            SUM(ulu.quantity_used) AS total_quantity
          FROM ul_label_usages ulu
          INNER JOIN ul_labels ul ON ulu.ul_label_id = ul.id
          WHERE ulu.date_used >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            AND (ulu.is_voided IS NULL OR ulu.is_voided = 0)
          GROUP BY ulu.ul_number, ul.description
          ORDER BY total_quantity DESC, usage_count DESC
          LIMIT 5
        `,
      );

      const usageTrend = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT
            DATE(date_used) AS usage_date,
            COUNT(*) AS usage_count,
            SUM(quantity_used) AS total_quantity
          FROM ul_label_usages
          WHERE date_used >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            AND (is_voided IS NULL OR is_voided = 0)
          GROUP BY DATE(date_used)
          ORDER BY usage_date ASC
        `,
      );

      return {
        success: true,
        data: {
          stats: statsRows[0] || {},
          recent_activity: recentActivity,
          expiring_labels: expiringLabels,
          top_customers: topCustomers,
          top_ul_numbers: topUlNumbers,
          usage_trend: usageTrend,
        },
        message: 'Dashboard statistics retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: 'SERVER_ERROR',
        message: `Internal server error: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async validateWorkOrder(woNumberRaw?: string): Promise<ApiResponse<RowDataPacket[]>> {
    const woNumber = Number(woNumberRaw);
    if (!Number.isFinite(woNumber) || woNumber <= 0) {
      return {
        success: false,
        message: 'Invalid work order number provided',
        data: [],
      };
    }

    try {
      const rows = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT ulu.id, ulu.ul_number, ulu.eyefi_serial_number, ulu.quantity_used,
                 ulu.date_used, ulu.user_name, ulu.customer_name, ulu.wo_nbr,
                 ulu.wo_part, ulu.wo_description,
                 ul.description AS ul_description, ul.category
          FROM ul_label_usages ulu
          LEFT JOIN ul_labels ul ON ulu.ul_label_id = ul.id
          WHERE ulu.wo_nbr = ?
          ORDER BY ulu.date_used DESC
        `,
        [woNumber],
      );

      return {
        success: true,
        message:
          rows.length > 0
            ? 'Work order found in existing usage records'
            : 'Work order not found in existing usage records',
        data: rows,
        count: rows.length,
      };
    } catch (error) {
      return {
        success: false,
        message: `Database error occurred: ${this.getErrorMessage(error)}`,
        data: [],
      };
    }
  }

  async getConsumedSerials(filters: Record<string, string>): Promise<ApiResponse<RowDataPacket[]>> {
    try {
      const where: string[] = ['1=1'];
      const params: unknown[] = [];

      if (filters.source_table) {
        where.push('source_table = ?');
        params.push(filters.source_table);
      }

      if (filters.search) {
        const search = `%${filters.search}%`;
        where.push(
          '(eyefi_serial_number LIKE ? OR ul_number LIKE ? OR igt_serial_number LIKE ? OR ags_serial_number LIKE ? OR sg_asset_number LIKE ? OR wo_number LIKE ? OR po_number LIKE ? OR used_by LIKE ?)',
        );
        params.push(search, search, search, search, search, search, search, search);
      }

      if (filters.used_by) {
        where.push('used_by LIKE ?');
        params.push(`%${filters.used_by}%`);
      }

      if (filters.wo_number) {
        const woSearch = `%${filters.wo_number}%`;
        where.push('(wo_number LIKE ? OR po_number LIKE ?)');
        params.push(woSearch, woSearch);
      }

      if (filters.date_from) {
        where.push('DATE(used_date) >= ?');
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        where.push('DATE(used_date) <= ?');
        params.push(filters.date_to);
      }

      if (filters.ul_category) {
        where.push('ul_category = ?');
        params.push(filters.ul_category);
      }

      const page = Math.max(1, Number(filters.page) || 1);
      const limit = Math.min(500, Math.max(1, Number(filters.limit) || 50));
      const offset = (page - 1) * limit;

      const whereClause = where.join(' AND ');

      const rows = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT *
          FROM vw_all_consumed_serials
          WHERE ${whereClause}
          ORDER BY used_date DESC
          LIMIT ? OFFSET ?
        `,
        [...params, limit, offset],
      );

      return {
        success: true,
        data: rows,
        count: rows.length,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching consumed serials: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async getAuditSignoffs(): Promise<ApiResponse<RowDataPacket[]>> {
    try {
      const rows = await this.mysqlService.query<RowDataPacket[]>(
        `
          SELECT *
          FROM ul_audit_signoffs
          ORDER BY audit_date DESC, created_at DESC
        `,
      );

      const mapped = rows.map((row) => ({
        ...row,
        ul_numbers: this.parseJsonArray((row as Record<string, unknown>).ul_numbers),
      }));

      return {
        success: true,
        data: mapped,
        message: 'Audit signoffs retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get audit signoffs: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async submitAuditSignoff(body: Record<string, unknown>): Promise<ApiResponse<{ id: number; email_sent: boolean }>> {
    const auditDate = String(body.audit_date || '').trim();
    const auditorName = String(body.auditor_name || '').trim();
    const auditorSignature = String(body.auditor_signature || '').trim();
    const itemsAudited = Number(body.items_audited);
    const ulNumbersRaw = Array.isArray(body.ul_numbers) ? body.ul_numbers : [];
    const ulNumbers = ulNumbersRaw.map((ul) => String(ul || '').trim()).filter((ul) => !!ul);
    const notes = String(body.notes || '').trim();
    const email = String(body.email || '').trim();

    if (!auditDate || !auditorName || !auditorSignature || !Number.isFinite(itemsAudited) || itemsAudited < 0) {
      return {
        success: false,
        message: 'Missing or invalid required fields for audit signoff',
      };
    }

    try {
      const result = await this.mysqlService.execute<ResultSetHeader>(
        `
          INSERT INTO ul_audit_signoffs (
            audit_date,
            auditor_name,
            auditor_signature,
            items_audited,
            ul_numbers,
            notes
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [auditDate, auditorName, auditorSignature, itemsAudited, JSON.stringify(ulNumbers), notes],
      );

      let emailSent = false;
      if (email) {
        try {
          const formattedAuditDate = new Date(auditDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          await this.emailService.sendMail({
            to: email,
            subject: `UL New Audit Sign-Off Report - ${formattedAuditDate}`,
            html: this.buildAuditSignoffEmailHtml({
              auditDate,
              auditorName,
              auditorSignature,
              itemsAudited,
              ulNumbers,
              notes,
            }),
          });
          emailSent = true;
        } catch {
          emailSent = false;
        }
      }

      return {
        success: true,
        message: `Audit signoff submitted successfully${email ? (emailSent ? ' and email sent' : ' (email send failed)') : ''}`,
        data: {
          id: result.insertId,
          email_sent: emailSent,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to submit audit signoff: ${this.getErrorMessage(error)}`,
      };
    }
  }

  async exportLabelsCsv(filters: Record<string, string>): Promise<string> {
    const rows = await this.fetchLabelRows(filters);
    return this.toCsv(rows);
  }

  async exportUsageCsv(filters: Record<string, string>): Promise<string> {
    const rows = await this.fetchUsageRows(filters);
    return this.toCsv(rows);
  }

  private async fetchLabelRows(filters: Record<string, string>): Promise<RowDataPacket[]> {
    const params: unknown[] = [];
    const where: string[] = ['1=1'];

    const filterAvailable = String(filters.available).toLowerCase() === 'true';
    let sql = `
      SELECT ul.*
      FROM ul_labels ul
    `;

    if (filterAvailable) {
      where.push('COALESCE(ul.is_consumed, 0) = 0');
    }

    const id = Number(filters.id);
    if (Number.isFinite(id) && id > 0) {
      where.push('ul.id = ?');
      params.push(id);
    }

    const search = this.toSearchLike(filters.search);
    if (search) {
      where.push('(ul.ul_number LIKE ? OR ul.description LIKE ?)');
      params.push(search, search);
    }

    if (filters.category) {
      where.push('ul.category = ?');
      params.push(filters.category);
    }

    if (filters.status) {
      where.push('ul.status = ?');
      params.push(filters.status);
    }

    if (filters.manufacturer) {
      where.push('ul.manufacturer LIKE ?');
      params.push(`%${filters.manufacturer}%`);
    }

    if (filters.date_from) {
      where.push('ul.created_at >= ?');
      params.push(`${filters.date_from} 00:00:00`);
    }

    if (filters.date_to) {
      where.push('ul.created_at <= ?');
      params.push(`${filters.date_to} 23:59:59`);
    }

    const sortMap: Record<string, string> = {
      ul_number: 'ul.ul_number',
      description: 'ul.description',
      category: 'ul.category',
      status: 'ul.status',
      created_at: 'ul.created_at',
    };

    const sortColumn = sortMap[filters.sort || ''] || 'ul.ul_number';
    const sortOrder = String(filters.order || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    sql += ` WHERE ${where.join(' AND ')} ORDER BY ${sortColumn} ${sortOrder}`;

    const limit = Number(filters.limit);
    if (Number.isFinite(limit) && limit > 0) {
      const offset = Number(filters.offset);
      sql += ' LIMIT ? OFFSET ?';
      params.push(limit, Number.isFinite(offset) && offset >= 0 ? offset : 0);
    }

    return this.mysqlService.query<RowDataPacket[]>(sql, params);
  }

  private async fetchUsageRows(filters: Record<string, string>): Promise<RowDataPacket[]> {
    const params: unknown[] = [];
    const where: string[] = [];

    const id = Number(filters.id);
    if (Number.isFinite(id) && id > 0) {
      where.push('ulu.id = ?');
      params.push(id);
    }

    const ulLabelId = Number(filters.ulLabelId || filters.ul_label_id);
    if (Number.isFinite(ulLabelId) && ulLabelId > 0) {
      where.push('ulu.ul_label_id = ?');
      params.push(ulLabelId);
    }

    if (filters.start_date) {
      where.push('ulu.date_used >= ?');
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      where.push('ulu.date_used <= ?');
      params.push(filters.end_date);
    }

    if (filters.customer_name) {
      where.push('ulu.customer_name LIKE ?');
      params.push(`%${filters.customer_name}%`);
    }

    let sql = `
      SELECT
        ulu.*,
        ul.description AS description,
        ul.description AS ul_description,
        ul.category,
        ul.manufacturer
      FROM ul_label_usages ulu
      INNER JOIN ul_labels ul ON ulu.ul_label_id = ul.id
    `;

    if (where.length > 0) {
      sql += ` WHERE ${where.join(' AND ')}`;
    }

    sql += ' ORDER BY ulu.created_at DESC';
    return this.mysqlService.query<RowDataPacket[]>(sql, params);
  }

  private async createLabelsFromRange(rangeData: Record<string, unknown>, createdBy: string): Promise<ApiResponse> {
    const start = Number(rangeData.start_number);
    const end = Number(rangeData.end_number);

    if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0) {
      return {
        success: false,
        message: 'Start and end numbers must be positive integers',
      };
    }

    if (start >= end) {
      return {
        success: false,
        message: 'End number must be greater than start number',
      };
    }

    const total = end - start + 1;
    if (total > 1000) {
      return {
        success: false,
        message: 'Range too large. Maximum 1000 UL numbers per upload.',
      };
    }

    const category = String(rangeData.category || 'New').trim();
    const normalizedCategory = category.toLowerCase();
    const categoryPrefix = normalizedCategory === 'used' ? 'T' : 'Q';

    const labels: Record<string, unknown>[] = [];
    for (let i = start; i <= end; i += 1) {
      labels.push({
        ul_number: `${categoryPrefix}${i}`,
        description: String(rangeData.description || '').trim(),
        category,
        manufacturer: this.toNullableString(rangeData.manufacturer),
        part_number: this.toNullableString(rangeData.part_number),
        certification_date: this.toNullableString(rangeData.certification_date),
        expiry_date: this.toNullableString(rangeData.expiry_date),
        status: String(rangeData.status || 'active').trim(),
      });
    }

    return this.bulkCreateLabels(labels, createdBy);
  }

  private async bulkCreateLabels(labelsData: Record<string, unknown>[], createdBy: string): Promise<ApiResponse> {
    const errors: BulkUploadError[] = [];
    let uploadedCount = 0;

    for (let i = 0; i < labelsData.length; i += 1) {
      const label = labelsData[i];
      const ulNumber = String(label.ul_number || '').trim();
      const description = String(label.description || '').trim();
      const category = String(label.category || '').trim();

      if (!ulNumber || !description || !category) {
        errors.push({
          index: i,
          ul_number: ulNumber,
          error: 'Missing required fields (ul_number, description, category)',
        });
        continue;
      }

      try {
        const exists = await this.mysqlService.query<Array<RowDataPacket & { id: number }>>(
          'SELECT id FROM ul_labels WHERE ul_number = ? LIMIT 1',
          [ulNumber],
        );

        if (exists.length > 0) {
          errors.push({
            index: i,
            ul_number: ulNumber,
            error: 'UL Number already exists',
          });
          continue;
        }

        await this.mysqlService.execute(
          `
            INSERT INTO ul_labels
            (ul_number, description, category, manufacturer, part_number, certification_date, expiry_date, status, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `,
          [
            ulNumber,
            description,
            category,
            this.toNullableString(label.manufacturer),
            this.toNullableString(label.part_number),
            this.toNullableString(label.certification_date),
            this.toNullableString(label.expiry_date),
            String(label.status || 'active').trim(),
            createdBy,
          ],
        );

        uploadedCount += 1;
      } catch (error) {
        errors.push({
          index: i,
          ul_number: ulNumber,
          error: this.getErrorMessage(error),
        });
      }
    }

    const payload = {
      uploaded_count: uploadedCount,
      total_count: labelsData.length,
      error_count: errors.length,
      errors,
    };

    if (uploadedCount > 0) {
      return {
        success: true,
        data: payload,
        message: `Successfully uploaded ${uploadedCount} out of ${labelsData.length} UL labels`,
      };
    }

    return {
      success: false,
      data: payload,
      message: 'No UL labels were uploaded. Please check the errors.',
    };
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    values.push(current.trim());
    return values;
  }

  private toCsv(rows: RowDataPacket[]): string {
    if (!rows.length) {
      return 'no_data\n';
    }

    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];

    for (const row of rows) {
      const line = headers
        .map((header) => this.escapeCsvValue((row as Record<string, unknown>)[header]))
        .join(',');
      lines.push(line);
    }

    return lines.join('\n');
  }

  private normalizeBulkRow(row: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};
    Object.keys(row).forEach((key) => {
      normalized[String(key).trim().toLowerCase()] = row[key];
    });
    return normalized;
  }

  private escapeCsvValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  private toNullableString(value: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const text = String(value).trim();
    return text === '' ? null : text;
  }

  private async resolveUserDisplayName(currentUserId?: number, fallback?: unknown): Promise<string> {
    if (Number(currentUserId) > 0) {
      const rows = await this.mysqlService.query<Array<RowDataPacket & { full_name: string }>>(
        `
          SELECT TRIM(CONCAT(COALESCE(first, ''), ' ', COALESCE(last, ''))) AS full_name
          FROM db.users
          WHERE id = ?
          LIMIT 1
        `,
        [Number(currentUserId)],
      );

      const fullName = String(rows[0]?.full_name || '').trim();
      if (fullName) {
        return fullName;
      }
    }

    const fallbackName = String(fallback || '').trim();
    return fallbackName || 'system';
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toSearchLike(value: unknown): string | null {
    if (!value) {
      return null;
    }

    const text = String(value).trim();
    return text ? `%${text}%` : null;
  }

  private toNullableFieldValue(value: unknown): unknown {
    if (value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    }

    return value;
  }

  private parseJsonArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry || '').trim()).filter((entry) => !!entry);
    }

    if (typeof value !== 'string' || !value.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry || '').trim()).filter((entry) => !!entry);
      }
      return [];
    } catch {
      return [];
    }
  }

  private buildAuditSignoffEmailHtml(payload: {
    auditDate: string;
    auditorName: string;
    auditorSignature: string;
    itemsAudited: number;
    ulNumbers: string[];
    notes: string;
  }): string {
    const ulNumbersHtml = payload.ulNumbers
      .map((ul) => `<span style="display:inline-block;margin:2px;padding:4px 8px;background:#f1f3f5;border:1px solid #dee2e6;border-radius:4px;font-family:monospace;">${ul}</span>`)
      .join('');

    return `
      <div style="font-family:Arial,sans-serif;line-height:1.4;color:#212529;">
        <h2 style="color:#198754;margin-bottom:8px;">UL New Audit Sign-Off Report</h2>
        <p style="margin:0 0 12px 0;color:#6c757d;">Generated ${new Date().toLocaleString()}</p>

        <table style="border-collapse:collapse;width:100%;max-width:700px;margin-bottom:16px;">
          <tr><td style="padding:6px 0;font-weight:600;width:180px;">Audit Date</td><td style="padding:6px 0;">${payload.auditDate}</td></tr>
          <tr><td style="padding:6px 0;font-weight:600;">Auditor Name</td><td style="padding:6px 0;">${payload.auditorName}</td></tr>
          <tr><td style="padding:6px 0;font-weight:600;">Auditor Signature</td><td style="padding:6px 0;">${payload.auditorSignature}</td></tr>
          <tr><td style="padding:6px 0;font-weight:600;">Items Audited</td><td style="padding:6px 0;">${payload.itemsAudited}</td></tr>
        </table>

        <div style="margin-bottom:14px;">
          <div style="font-weight:600;margin-bottom:6px;">UL Numbers Audited</div>
          <div>${ulNumbersHtml || '<span style="color:#6c757d;">None</span>'}</div>
        </div>

        <div>
          <div style="font-weight:600;margin-bottom:6px;">Notes</div>
          <div style="padding:10px;border:1px solid #dee2e6;border-radius:4px;background:#f8f9fa;">${payload.notes || 'No notes provided'}</div>
        </div>
      </div>
    `;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error || 'Unknown error');
  }
}
