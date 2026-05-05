import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'node:stream';
import { EyeFiSerialRepository } from './eyefi-serial.repository';
import { UpdateEyeFiSerialStatusDto } from './dto/update-eyefi-serial-status.dto';
import { BulkCreateEyeFiSerialDto } from './dto/bulk-create-eyefi-serial.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';

type WorkflowReportPayload = {
  workOrder?: Record<string, unknown>;
  batch?: Record<string, unknown>;
  customer?: string;
  assets?: Array<Record<string, unknown>>;
  timestamp?: string | Date;
  createdBy?: string;
  fileName?: string;
};

@Injectable()
export class EyeFiSerialService {
  constructor(
    private readonly eyeFiSerialRepository: EyeFiSerialRepository,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  async search(params: {
    search?: string;
    status?: string;
    product_model?: string;
    batch_number?: string;
    date_from?: string;
    date_to?: string;
    sort?: string;
    order?: string;
    limit?: number;
    offset?: number;
  }) {
    const results = await this.eyeFiSerialRepository.search(params);
    return {
      success: true,
      data: results,
      count: results.length,
    };
  }

  async getBySerialNumber(serialNumber: string) {
    const record = await this.eyeFiSerialRepository.getBySerialNumber(serialNumber);
    if (!record) {
      throw new NotFoundException({
        code: 'RC_EYEFI_SERIAL_NOT_FOUND',
        message: `EyeFi serial '${serialNumber}' not found`,
      });
    }
    return record;
  }

  async getById(id: number) {
    const record = await this.eyeFiSerialRepository.getById(id);
    if (!record) {
      throw new NotFoundException({
        code: 'RC_EYEFI_SERIAL_NOT_FOUND',
        message: `EyeFi serial with id ${id} not found`,
      });
    }
    return record;
  }

  async updateStatus(serialNumber: string, dto: UpdateEyeFiSerialStatusDto) {
    const existing = await this.eyeFiSerialRepository.getBySerialNumber(serialNumber);
    if (!existing) {
      throw new NotFoundException({
        code: 'RC_EYEFI_SERIAL_NOT_FOUND',
        message: `EyeFi serial '${serialNumber}' not found`,
      });
    }

    const affected = await this.eyeFiSerialRepository.updateStatus(
      serialNumber,
      dto.status,
      dto.reason,
    );

    if (affected === 0) {
      throw new BadRequestException({
        code: 'RC_EYEFI_SERIAL_UPDATE_FAILED',
        message: 'Status update had no effect',
      });
    }

    return { success: true, serial_number: serialNumber, status: dto.status };
  }

  async getStatistics() {
    return this.eyeFiSerialRepository.getStatistics();
  }

  async bulkCreate(dto: BulkCreateEyeFiSerialDto) {
    const result = await this.eyeFiSerialRepository.bulkCreate(dto.serialNumbers);
    return {
      success: true,
      message: `Created ${result.inserted} serial numbers (${result.duplicates} duplicates skipped)`,
      ...result,
    };
  }

  async getProductModels() {
    const models = await this.eyeFiSerialRepository.getProductModels();
    return { success: true, data: models };
  }

  async exportCsv(serialNumbers?: string[]): Promise<string> {
    const records = await this.eyeFiSerialRepository.getExportData(serialNumbers);
    const header = 'Serial Number,Product Model,Status,Hardware Version,Firmware Version,Manufacture Date,Batch Number,Notes,Created At\n';
    const rows = records
      .map(
        (r) =>
          `"${r.serial_number}","${r.product_model}","${r.status}","${r.hardware_version ?? ''}","${r.firmware_version ?? ''}","${r.manufacture_date ?? ''}","${r.batch_number ?? ''}","${r.notes ?? ''}","${r.created_at ?? ''}"`,
      )
      .join('\n');
    return header + rows;
  }

  async createAssignment(dto: CreateAssignmentDto) {
    const serial = await this.eyeFiSerialRepository.getBySerialNumber(dto.serial_number);
    if (!serial) {
      throw new NotFoundException({ code: 'RC_EYEFI_SERIAL_NOT_FOUND', message: `Serial '${dto.serial_number}' not found` });
    }
    const id = await this.eyeFiSerialRepository.createAssignment(dto);
    return { success: true, id };
  }

  async getAssignments(filters: { serial_number?: string; customer_name?: string; work_order_number?: string; limit?: number }) {
    const data = await this.eyeFiSerialRepository.getAssignments(filters);
    return { success: true, data, count: data.length };
  }

  async getAssignmentById(id: number) {
    const record = await this.eyeFiSerialRepository.getAssignmentById(id);
    if (!record) {
      throw new NotFoundException({ code: 'RC_ASSIGNMENT_NOT_FOUND', message: `Assignment ${id} not found` });
    }
    return record;
  }

  async updateAssignment(id: number, dto: UpdateAssignmentDto) {
    await this.getAssignmentById(id); // throws 404 if not found
    const affected = await this.eyeFiSerialRepository.updateAssignment(id, dto);
    if (affected === 0) {
      throw new BadRequestException({ code: 'RC_ASSIGNMENT_UPDATE_FAILED', message: 'Update had no effect' });
    }
    return { success: true, id };
  }

  async sendWorkflowReportToCurrentUser(body: Record<string, unknown>, userId: number) {
    const payload = this.normalizeWorkflowReportPayload(body);
    const recipientEmail = await this.eyeFiSerialRepository.getActiveUserEmailById(userId);
    const pdfBuffer = await this.generateWorkflowReportPdf(payload);

    if (!recipientEmail) {
      throw new BadRequestException('Current user does not have an active email address');
    }

    const html = this.emailTemplateService.render('serial-workflow-report', {
      createdBy: payload.createdBy,
      workOrderNumber: payload.workOrder.number,
      customer: payload.customer,
      quantity: payload.batch.quantity,
      generatedAt: payload.timestamp,
    });

    await this.emailService.sendMail({
      to: recipientEmail,
      subject: `Serial Workflow Report: WO ${payload.workOrder.number}`,
      html,
      attachments: [
        {
          filename: payload.fileName,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return { success: true, email: recipientEmail };
  }

  private normalizeWorkflowReportPayload(body: Record<string, unknown>): {
    workOrder: { number: string } & Record<string, unknown>;
    batch: { quantity: number } & Record<string, unknown>;
    customer: string;
    createdBy: string;
    timestamp: string;
    fileName: string;
    assets: Array<Record<string, unknown>>;
  } {
    const payload = body as WorkflowReportPayload;
    const workOrderNumber = String(payload.workOrder?.['number'] || '').trim();
    const quantity = Number(payload.batch?.['quantity']);
    const customer = String(payload.customer || '').trim();
    const createdBy = String(payload.createdBy || '').trim();
    const fileName = String(payload.fileName || '').trim();
    const assets = Array.isArray(payload.assets) ? payload.assets : [];
    const timestampRaw = payload.timestamp instanceof Date
      ? payload.timestamp.toISOString()
      : String(payload.timestamp || '').trim();

    if (!workOrderNumber) {
      throw new BadRequestException('workOrder.number is required');
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('batch.quantity is required');
    }

    if (!customer) {
      throw new BadRequestException('customer is required');
    }

    if (!createdBy) {
      throw new BadRequestException('createdBy is required');
    }

    if (assets.length === 0) {
      throw new BadRequestException('assets are required');
    }

    return {
      workOrder: {
        ...(payload.workOrder || {}),
        number: workOrderNumber,
      },
      batch: {
        ...(payload.batch || {}),
        quantity,
      },
      customer,
      createdBy,
      timestamp: timestampRaw || new Date().toISOString(),
      fileName: fileName || this.buildWorkflowReportFilename(workOrderNumber),
      assets,
    };
  }

  private buildWorkflowReportFilename(workOrderNumber: string): string {
    const normalized = String(workOrderNumber || 'unknown')
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-');

    return `serial-number-report-${normalized || 'unknown'}.pdf`;
  }

  private async generateWorkflowReportPdf(payload: {
    workOrder: Record<string, unknown>;
    batch: Record<string, unknown>;
    customer: string;
    createdBy: string;
    timestamp: string;
    assets: Array<Record<string, unknown>>;
  }): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

    const finished = new Promise<Buffer>((resolve, reject) => {
      stream.on('finish', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
      doc.on('error', reject);
    });

    doc.pipe(stream);

    let y = 40;
    y = this.writePdfTitle(doc, 'Serial Number Assignment Report', y);
    y = this.writePdfMeta(doc, payload, y);
    y = this.writePdfSection(doc, 'Work Order Information', [
      ['Work Order #', payload.workOrder['number']],
      ['Part Number', payload.workOrder['part']],
      ['Customer Part #', payload.workOrder['cp_cust_part']],
      ['Description', payload.workOrder['description']],
      ['Ordered Quantity', payload.workOrder['qty_ord']],
      ['Due Date', payload.workOrder['due_date']],
      ['Routing', payload.workOrder['routing']],
      ['Line', payload.workOrder['line']],
    ], y);

    y = this.writePdfSection(doc, 'Batch Details', [
      ['Quantity', payload.batch['quantity']],
      ['Category', payload.batch['category']],
      ['Status', payload.batch['status']],
      ['Customer', payload.customer],
      ['Date/Time', payload.batch['date'] || payload.timestamp],
      ['Created By', payload.batch['createdBy'] || payload.createdBy],
    ], y);

    y = this.ensurePdfSpace(doc, y, 40);
    doc.font('Helvetica-Bold').fontSize(13).text(`Created Assets (${payload.assets.length})`, 40, y);
    y = doc.y + 8;

    const columnXs = [40, 75, 200, 320, 420, 500];
    y = this.writePdfAssetRow(doc, ['#', 'Asset Number', 'EyeFi Serial', 'UL Number', 'UL Cat', 'Extra'], columnXs, y, true);

    payload.assets.forEach((asset, index) => {
      y = this.ensurePdfSpace(doc, y, 20);
      y = this.writePdfAssetRow(doc, [
        String(asset['index'] || index + 1),
        String(asset['assetNumber'] || 'N/A'),
        String(asset['eyefiSerial'] || 'N/A'),
        String(asset['ulNumber'] || 'N/A'),
        String(asset['ulCategory'] || 'N/A'),
        String(asset['igtSerial'] || asset['agsAsset'] || asset['sgAsset'] || ''),
      ], columnXs, y, false);
    });

    doc.end();
    return finished;
  }

  private writePdfTitle(doc: PDFKit.PDFDocument, title: string, y: number): number {
    doc.font('Helvetica-Bold').fontSize(18).text(title, 40, y);
    doc.moveTo(40, doc.y + 6).lineTo(555, doc.y + 6).stroke('#0b5cab');
    return doc.y + 18;
  }

  private writePdfMeta(
    doc: PDFKit.PDFDocument,
    payload: { createdBy: string; timestamp: string },
    y: number,
  ): number {
    doc.roundedRect(40, y, 515, 34, 4).fillAndStroke('#f5f8fb', '#d7e3f1');
    doc.fillColor('#1f2933').font('Helvetica').fontSize(10);
    doc.text(`Created By: ${payload.createdBy}`, 50, y + 10);
    doc.text(`Generated: ${payload.timestamp}`, 280, y + 10);
    return y + 50;
  }

  private writePdfSection(
    doc: PDFKit.PDFDocument,
    title: string,
    rows: Array<[string, unknown]>,
    y: number,
  ): number {
    y = this.ensurePdfSpace(doc, y, 60);
    doc.fillColor('#1f2933').font('Helvetica-Bold').fontSize(13).text(title, 40, y);
    y = doc.y + 8;

    rows.forEach(([label, value]) => {
      y = this.ensurePdfSpace(doc, y, 18);
      doc.font('Helvetica-Bold').fontSize(10).text(`${label}:`, 40, y, { width: 130 });
      doc.font('Helvetica').text(String(value || 'N/A'), 170, y, { width: 385 });
      y = doc.y + 4;
    });

    return y + 10;
  }

  private writePdfAssetRow(
    doc: PDFKit.PDFDocument,
    values: string[],
    columnXs: number[],
    y: number,
    isHeader: boolean,
  ): number {
    const lineHeight = 16;
    doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(isHeader ? 9 : 8);

    for (let index = 0; index < values.length; index += 1) {
      const startX = columnXs[index];
      const endX = index + 1 < columnXs.length ? columnXs[index + 1] - 8 : 555;
      doc.text(values[index], startX, y, {
        width: Math.max(30, endX - startX),
        ellipsis: true,
      });
    }

    doc.moveTo(40, y + lineHeight).lineTo(555, y + lineHeight).stroke(isHeader ? '#6b7c93' : '#d9e2ec');
    return y + lineHeight + 4;
  }

  private ensurePdfSpace(doc: PDFKit.PDFDocument, y: number, neededHeight: number): number {
    const bottomLimit = doc.page.height - doc.page.margins.bottom;
    if (y + neededHeight <= bottomLimit) {
      return y;
    }

    doc.addPage();
    return doc.page.margins.top;
  }
}
