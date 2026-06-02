import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { EmailService } from '@/shared/email/email.service';
import { UsersService } from '../users/users.service';
import {
  CustomerMasterUpsert,
  ShippingChecklistsRepository,
  ShippingChecklistInstanceUpsert,
  ShippingChecklistTemplateUpsert,
} from './shipping-checklists.repository';

type ResponseValue = 'yes' | 'no' | 'na' | '';

@Injectable()
export class ShippingChecklistsService {
  constructor(
    private readonly repository: ShippingChecklistsRepository,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async bootstrap(customerCode?: string) {
    const [templates, instances] = await Promise.all([
      this.getTemplates(customerCode),
      this.getInstances(customerCode, '50'),
    ]);

    return {
      success: true,
      data: {
        templates,
        instances,
      },
    };
  }

  async getTemplates(customerCode?: string) {
    let templateRows = await this.repository.getTemplates(customerCode);

    // Auto-provision defaults so UI dropdown is never empty on a fresh environment.
    if (!customerCode && templateRows.length === 0) {
      await this.ensureDefaultTemplates();
      templateRows = await this.repository.getTemplates(customerCode);
    }

    const questions = await this.repository.getTemplateQuestions(templateRows.map((row) => row.id));

    const questionsByTemplate = new Map<number, Array<Record<string, unknown>>>();
    for (const question of questions) {
      if (!questionsByTemplate.has(question.template_id)) {
        questionsByTemplate.set(question.template_id, []);
      }

      questionsByTemplate.get(question.template_id)?.push({
        id: question.id,
        questionOrder: question.question_order,
        questionCode: question.question_code,
        questionText: question.question_text,
        isRequired: Number(question.is_required) === 1,
      });
    }

    return templateRows.map((row) => {
      const logoUrlFromCustomerMaster = String((row as { customer_logo_url?: string | null }).customer_logo_url || '').trim();
      const logoUrl = logoUrlFromCustomerMaster || null;

      return {
        id: row.id,
        customerCode: row.customer_code,
        customerName: row.customer_name,
        formTitle: row.form_title,
        formCode: row.form_code,
        logoText: row.logo_text,
        assignedVerifierUserId: row.assigned_verifier_user_id,
        assignedVerifierName: row.assigned_verifier_name,
        assignedVerifierEmail: row.assigned_verifier_email,
        logoUrl,
        isActive: Number(row.is_active) === 1,
        questions: questionsByTemplate.get(row.id) || [],
      };
    });
  }

  private async ensureDefaultTemplates(): Promise<void> {
    const defaults: Array<ShippingChecklistTemplateUpsert> = [
      {
        customerCode: 'generic',
        customerName: 'Generic',
        formTitle: 'Generic Shipping Checklist',
        formCode: 'SHIP-FRM-009',
        logoText: null,
        assignedVerifierUserId: null,
        assignedVerifierName: null,
        assignedVerifierEmail: null,
        isActive: true,
        questions: [
          { questionOrder: 1, questionCode: '1.1', questionText: 'For deliveries: Is Packing Slip printed and with the driver?', isRequired: true },
          { questionOrder: 2, questionCode: '1.2', questionText: 'For drop shipments: Is BOL signed by the driver?', isRequired: true },
          { questionOrder: 3, questionCode: '2', questionText: 'Are there any damages to the packaging?', isRequired: true },
          { questionOrder: 4, questionCode: '3', questionText: 'Does Packing Slip match what is physically being shipped - Placard, SN, PN?', isRequired: true },
          { questionOrder: 5, questionCode: '4', questionText: 'Are items "Shrink Wrapped"?', isRequired: true },
          { questionOrder: 6, questionCode: '5', questionText: 'Are items "Banded"?', isRequired: true },
          { questionOrder: 7, questionCode: '6', questionText: 'Were pictures taken of all packed staged products - 5 pictures per pallet: 1 of the placard + 1 per side?', isRequired: true },
          { questionOrder: 8, questionCode: '7', questionText: 'Were pictures taken of every pallet inside the truck?', isRequired: true },
          { questionOrder: 9, questionCode: '8', questionText: 'Were all pictures uploaded to the shared drive/file?', isRequired: true },
        ],
      },
      {
        customerCode: 'igt',
        customerName: 'IGT',
        formTitle: 'IGT Shipping Checklist',
        formCode: 'SHIP-FRM-007',
        logoText: 'IGT',
        isActive: true,
        questions: [
          { questionOrder: 1, questionCode: '1', questionText: 'Transfer form on pallets?', isRequired: true },
          { questionOrder: 2, questionCode: '2', questionText: 'Items on dock match Transfer Form and Packing Slip?', isRequired: true },
          { questionOrder: 3, questionCode: '3', questionText: 'Are there any damages to the packaging?', isRequired: true },
          { questionOrder: 4, questionCode: '4', questionText: 'Does Packing Slip match what is physically being shipped - Placard, SN, PN?', isRequired: true },
          { questionOrder: 5, questionCode: '5', questionText: 'Are items "Shrink Wrapped"?', isRequired: true },
          { questionOrder: 6, questionCode: '6', questionText: 'Are items "Banded"?', isRequired: true },
          { questionOrder: 7, questionCode: '7', questionText: 'Were pictures taken of all packed staged products - 5 pictures per pallet: 1 of the placard + 1 per side?', isRequired: true },
          { questionOrder: 8, questionCode: '8', questionText: 'Were pictures taken of every pallet inside the truck?', isRequired: true },
          { questionOrder: 9, questionCode: '9', questionText: 'Were all pictures uploaded to the shared drive/file?', isRequired: true },
          { questionOrder: 10, questionCode: '10', questionText: 'Is BOL printed and signed by the driver?', isRequired: true },
        ],
      },
      {
        customerCode: 'ags',
        customerName: 'AGS',
        formTitle: 'AGS Shipping Checklist',
        formCode: 'SHIP-FRM-007',
        logoText: 'AGS',
        isActive: true,
        questions: [
          { questionOrder: 1, questionCode: '1', questionText: 'EYEFI placard removed and replaced with FG label?', isRequired: true },
          { questionOrder: 2, questionCode: '2', questionText: 'FG label matches PN of units shipped and BOL?', isRequired: true },
          { questionOrder: 3, questionCode: '3', questionText: 'Are all pallets in the shipment numbered and matched to the packing slip numbers?', isRequired: true },
          { questionOrder: 4, questionCode: '4', questionText: 'Are there any damages to the packaging?', isRequired: true },
          { questionOrder: 5, questionCode: '5', questionText: 'Are items "Shrink Wrapped"?', isRequired: true },
          { questionOrder: 6, questionCode: '6', questionText: 'Are items "Banded"?', isRequired: true },
          { questionOrder: 7, questionCode: '7', questionText: 'Were pictures taken of all packed staged products - 5 pictures per pallet: 1 of the placard + 1 per side?', isRequired: true },
          { questionOrder: 8, questionCode: '8', questionText: 'Were pictures taken of every pallet inside the truck?', isRequired: true },
          { questionOrder: 9, questionCode: '9', questionText: 'Were all pictures uploaded to the shared drive/file?', isRequired: true },
          { questionOrder: 10, questionCode: '10', questionText: 'Is BOL signed by the driver?', isRequired: true },
        ],
      },
      {
        customerCode: 'lnw',
        customerName: 'Light and Wonder',
        formTitle: 'LnW Shipping Checklist',
        formCode: 'SHIP-FRM-006',
        logoText: 'LIGHT & WONDER',
        isActive: true,
        questions: [
          { questionOrder: 1, questionCode: '1.1', questionText: 'For deliveries: Is Packing Slip printed and with the driver?', isRequired: true },
          { questionOrder: 2, questionCode: '1.2', questionText: 'For drop shipments: Is BOL signed by the driver?', isRequired: true },
          { questionOrder: 3, questionCode: '2', questionText: 'Are there any damages to the packaging?', isRequired: true },
          { questionOrder: 4, questionCode: '3', questionText: 'Does Packing Slip match what is physically being shipped - Placard, SN, PN?', isRequired: true },
          { questionOrder: 5, questionCode: '4', questionText: 'Are items "Shrink Wrapped"?', isRequired: true },
          { questionOrder: 6, questionCode: '5', questionText: 'Are items "Banded"?', isRequired: true },
          { questionOrder: 7, questionCode: '6', questionText: 'Were pictures taken of all packed staged products - 5 pictures per pallet: 1 of the placard + 1 per side?', isRequired: true },
          { questionOrder: 8, questionCode: '7', questionText: 'Were pictures taken of every pallet inside the truck?', isRequired: true },
          { questionOrder: 9, questionCode: '8', questionText: 'Were all pictures uploaded to the shared drive/file?', isRequired: true },
        ],
      },
    ];

    for (const template of defaults) {
      await this.repository.upsertTemplate(template);
    }
  }

  async upsertTemplate(payloadInput: Record<string, unknown>) {
    const payload = this.normalizeTemplateUpsert(payloadInput);
    const templateId = await this.repository.upsertTemplate(payload);
    return {
      success: true,
      templateId,
    };
  }

  async getCustomerSettings() {
    const rows = await this.repository.getCustomerMasterList();

    return rows.map((row) => ({
      id: row.id,
      customerCode: row.customer_code,
      customerName: row.customer_name,
      logoUrl: row.logo_url,
      isActive: Number(row.is_active) === 1,
      mappingCount: Number(row.mapping_count || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async upsertCustomerSetting(payloadInput: Record<string, unknown>) {
    const payload = this.normalizeCustomerMasterUpsert(payloadInput);
    const customerId = await this.repository.upsertCustomerMaster(payload);

    return {
      success: true,
      customerId,
    };
  }

  async getInstances(customerCode?: string, limitInput?: string) {
    const limit = Number(limitInput || 100);
    const rows = await this.repository.getInstances(customerCode, Number.isFinite(limit) ? limit : 100);

    return rows.map((row) => ({
      id: row.id,
      templateId: row.template_id,
      customerCode: row.customer_code,
      customerName: row.customer_name,
      formTitle: row.form_title,
      formCode: row.form_code,
      status: row.status,
      formDate: row.form_date,
      shipVia: row.ship_via,
      shippingAccount: row.shipping_account,
      salesOrder: row.sales_order,
      packingSlip: row.packing_slip,
      arrivalDate: row.arrival_date,
      totalPallets: row.total_pallets,
      verifierName: row.verifier_name,
      verifierDate: row.verifier_date,
      secondVerifierName: row.second_verifier_name,
      secondVerifierEmail: row.second_verifier_email,
      secondVerifierEmailSentAt: row.second_verifier_email_sent_at,
      secondVerifierEmailSentBy: row.second_verifier_email_sent_by,
      secondVerifierDate: row.second_verifier_date,
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getInstanceById(id: number) {
    const [instanceRow, lineRows, lineSerialRows, responseRows] = await Promise.all([
      this.repository.getInstanceById(id),
      this.repository.getInstanceLines(id),
      this.repository.getInstanceLineSerials(id),
      this.repository.getInstanceResponses(id),
    ]);

    if (!instanceRow) {
      return { success: false, error: `Instance ${id} not found` };
    }

    const serialsByLineId = new Map<number, string[]>();
    for (const row of lineSerialRows) {
      if (!serialsByLineId.has(row.line_id)) {
        serialsByLineId.set(row.line_id, []);
      }

      serialsByLineId.get(row.line_id)?.push(String(row.serial_number || '').trim());
    }

    return {
      success: true,
      data: {
        id: instanceRow.id,
        templateId: instanceRow.template_id,
        customerCode: instanceRow.customer_code,
        customerName: instanceRow.customer_name,
        formTitle: instanceRow.form_title,
        formCode: instanceRow.form_code,
        status: instanceRow.status,
        formDate: instanceRow.form_date,
        shipVia: instanceRow.ship_via,
        shippingAccount: instanceRow.shipping_account,
        salesOrder: instanceRow.sales_order,
        packingSlip: instanceRow.packing_slip,
        arrivalDate: instanceRow.arrival_date,
        totalPallets: instanceRow.total_pallets,
        verifierName: instanceRow.verifier_name,
        verifierDate: instanceRow.verifier_date,
        secondVerifierName: instanceRow.second_verifier_name,
        secondVerifierEmail: instanceRow.second_verifier_email,
        secondVerifierEmailSentAt: instanceRow.second_verifier_email_sent_at,
        secondVerifierEmailSentBy: instanceRow.second_verifier_email_sent_by,
        secondVerifierDate: instanceRow.second_verifier_date,
        notes: instanceRow.notes,
        createdBy: instanceRow.created_by,
        createdAt: instanceRow.created_at,
        updatedAt: instanceRow.updated_at,
        lines: lineRows.map((line) => ({
          id: line.id,
          lineOrder: line.line_order,
          isSelected: Number(line.is_selected) === 1,
          partNumber: line.part_number,
          qty: line.qty,
          serialNumber: line.serial_number,
          serialNumbers: (serialsByLineId.get(line.id) || []).map((item) => String(item ?? '').trim()),
          palletQty: line.pallet_qty,
        })),
        responses: responseRows.map((response) => ({
          id: response.id,
          questionCode: response.question_code,
          questionText: response.question_text,
          responseValue: response.response_value,
          imageUrls: this.decodeStringArray(response.image_urls_json),
        })),
      },
    };
  }

  async upsertInstance(payloadInput: Record<string, unknown>) {
    const payload = this.normalizeInstanceUpsert(payloadInput);
    const existingInstance = payload.id ? await this.repository.getInstanceById(payload.id) : null;

    if (existingInstance) {
      payload.salesOrder = String(existingInstance.sales_order || '').trim() || payload.salesOrder;
    }

    const instanceId = await this.repository.upsertInstance(payload);

    if (payload.status === 'submitted' && (!existingInstance || existingInstance.status !== 'submitted')) {
      await this.sendSecondaryVerificationEmail(instanceId, payload);
    }

    return {
      success: true,
      instanceId,
    };
  }

  async verifyInstance(payloadInput: Record<string, unknown>) {
    const payload = this.normalizeInstanceUpsert({
      ...payloadInput,
      status: 'verified',
      secondVerifierDate: payloadInput.secondVerifierDate || new Date().toISOString().slice(0, 10),
    });

    const instanceId = await this.repository.upsertInstance(payload);
    return {
      success: true,
      instanceId,
    };
  }

  async getInstancePdf(id: number): Promise<{ buffer: Buffer; fileName: string }> {
    const instanceResult = await this.getInstanceById(id);
    if (!instanceResult.success || !instanceResult.data) {
      throw new Error(instanceResult.error || `Instance ${id} not found`);
    }

    const instance = instanceResult.data as Record<string, unknown>;
    const templates = await this.getTemplates(String(instance.customerCode || ''));
    const template = templates.find((item) => Number(item.id) === Number(instance.templateId)) || null;
    const logoBuffer = template?.logoUrl ? await this.tryLoadImageBuffer(String(template.logoUrl)) : null;
    const formCode = String(instance.formCode || template?.formCode || '—').trim();

    const buffer = await this.generateShippingChecklistPdf({
      instance,
      template,
      formCode,
      logoBuffer,
    });

    const fileName = this.buildShippingChecklistPdfFilename(
      String(instance.customerCode || 'checklist'),
      Number(instance.id || id),
      String(instance.formCode || template?.formCode || 'checklist'),
    );

    return { buffer, fileName };
  }

  private normalizeTemplateUpsert(input: Record<string, unknown>): ShippingChecklistTemplateUpsert {
    const questionsInput = Array.isArray(input.questions) ? (input.questions as Array<Record<string, unknown>>) : [];

    const questions = questionsInput
      .map((question, index) => ({
        questionOrder: this.toPositiveInt(question.questionOrder, index + 1),
        questionCode: this.truncate(String(question.questionCode || index + 1).trim(), 20),
        questionText: this.truncate(String(question.questionText || '').trim(), 500),
        isRequired: Boolean(question.isRequired ?? true),
      }))
      .filter((question) => question.questionText.length > 0)
      .sort((a, b) => a.questionOrder - b.questionOrder);

    if (questions.length === 0) {
      throw new Error('At least one checklist question is required');
    }

    return {
      id: this.toOptionalPositiveInt(input.id),
      customerCode: this.toCustomerCode(input.customerCode),
      customerName: this.truncate(String(input.customerName || '').trim(), 120),
      formTitle: this.truncate(String(input.formTitle || '').trim(), 200),
      formCode: this.truncate(String(input.formCode || '').trim(), 40),
      logoText: this.nullableTruncate(input.logoText, 120),
      assignedVerifierUserId: this.toOptionalPositiveInt(input.assignedVerifierUserId),
      assignedVerifierName: this.nullableTruncate(input.assignedVerifierName, 120),
      assignedVerifierEmail: this.nullableTruncate(input.assignedVerifierEmail, 200),
      isActive: Boolean(input.isActive ?? true),
      questions,
    };
  }

  private normalizeCustomerMasterUpsert(input: Record<string, unknown>): CustomerMasterUpsert {
    const customerCode = this.toCustomerCode(input.customerCode);
    const customerName = this.truncate(String(input.customerName || '').trim(), 120);
    if (!customerName) {
      throw new Error('customerName is required');
    }

    const rawLogoUrl = String(input.logoUrl || '').trim();
    const logoUrl = rawLogoUrl && /^https?:\/\//i.test(rawLogoUrl) ? this.truncate(rawLogoUrl, 1000) : undefined;

    return {
      id: this.toOptionalPositiveInt(input.id),
      customerCode,
      customerName,
      logoUrl,
      isActive: Boolean(input.isActive ?? true),
    };
  }

  private normalizeInstanceUpsert(input: Record<string, unknown>): ShippingChecklistInstanceUpsert {
    const linesInput = Array.isArray(input.lines) ? (input.lines as Array<Record<string, unknown>>) : [];
    const responsesInput = Array.isArray(input.responses) ? (input.responses as Array<Record<string, unknown>>) : [];

    const lines = linesInput
      .map((line, index) => {
        const serialNumbers = this.decodeLineSerials(line.serialNumbers ?? line.serialNumber);
        return {
        lineOrder: this.toPositiveInt(line.lineOrder, index + 1),
        isSelected: this.toBoolean(line.isSelected, true),
        partNumber: this.nullableTruncate(line.partNumber, 120),
        qty: this.nullableTruncate(line.qty, 60),
        serialNumber: serialNumbers[0] || this.nullableTruncate(line.serialNumber, 200),
        serialNumbers,
        palletQty: this.nullableTruncate(line.palletQty, 60),
      };
      })
      .sort((a, b) => a.lineOrder - b.lineOrder);

    const responses = responsesInput.map((response) => ({
      questionCode: this.truncate(String(response.questionCode || '').trim(), 20),
      questionText: this.truncate(String(response.questionText || '').trim(), 500),
      responseValue: this.toResponseValue(response.responseValue),
      imageUrls: this.decodeStringArray(response.imageUrls),
    }));

    return {
      id: this.toOptionalPositiveInt(input.id),
      templateId: this.toPositiveInt(input.templateId, 0),
      customerCode: this.toCustomerCode(input.customerCode),
      customerName: this.truncate(String(input.customerName || '').trim(), 120),
      formTitle: this.truncate(String(input.formTitle || '').trim(), 200),
      formCode: this.nullableTruncate(input.formCode, 40),
      status: (() => {
        const normalizedStatus = String(input.status || 'draft').trim().toLowerCase();
        if (normalizedStatus === 'submitted' || normalizedStatus === 'verified') {
          return normalizedStatus;
        }

        return 'draft';
      })(),
      formDate: this.toDateOnly(input.formDate),
      shipVia: this.nullableTruncate(input.shipVia, 120),
      shippingAccount: this.nullableTruncate(input.shippingAccount, 120),
      salesOrder: this.nullableTruncate(input.salesOrder, 120),
      packingSlip: this.nullableTruncate(input.packingSlip, 120),
      arrivalDate: this.toDateOnly(input.arrivalDate),
      totalPallets: this.toOptionalPositiveInt(input.totalPallets),
      verifierName: this.nullableTruncate(input.verifierName, 120),
      verifierDate: this.toDateOnly(input.verifierDate),
      secondVerifierName: this.nullableTruncate(input.secondVerifierName, 120),
      secondVerifierEmail: this.nullableTruncate(input.secondVerifierEmail, 200),
      secondVerifierDate: this.toDateOnly(input.secondVerifierDate),
      notes: this.nullableTruncate(input.notes, 10000),
      createdBy: this.nullableTruncate(input.createdBy, 120),
      lines,
      responses,
    };
  }

  private toCustomerCode(value: unknown): string {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
      throw new Error('customerCode is required');
    }

    return this.truncate(normalized, 20);
  }

  private toResponseValue(value: unknown): ResponseValue {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'yes' || normalized === 'no' || normalized === 'na') {
      return normalized;
    }

    return '';
  }

  private toBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y') {
      return true;
    }

    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'n') {
      return false;
    }

    return fallback;
  }

  private async sendSecondaryVerificationEmail(instanceId: number, payload: ShippingChecklistInstanceUpsert): Promise<void> {
    const template = await this.repository.getTemplateById(payload.templateId);
    const recipients = this.normalizeRecipientList([
      ...(await this.resolveAssignedVerifierRecipients(template)),
      String(payload.secondVerifierEmail || '').trim(),
    ]);

    if (recipients.length === 0) {
      return;
    }

    const dashboardBase = String(this.configService.get<string>('DASHBOARD_WEB_BASE_URL') || '').replace(/\/+$/, '');
    const link = dashboardBase ? `${dashboardBase}/operations/forms/shipping-checklist?id=${instanceId}&verify=1` : '';
    const subject = `[Shipping Checklist] Secondary verification required - ${payload.formTitle}`;
    const html = this.emailTemplateService.render('shipping-checklist-secondary-verification', {
      customerName: payload.customerName,
      checklistTitle: payload.formTitle,
      salesOrder: payload.salesOrder || '',
      createdBy: payload.createdBy || '',
      verifierName: template?.assigned_verifier_name || payload.secondVerifierName || '',
      link,
    });

    try {
      await this.emailService.sendMail({
        to: recipients,
        subject,
        html,
      });

      const sentAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await this.repository.markSecondaryVerificationEmailSent(
        instanceId,
        sentAt,
        String(payload.createdBy || '').trim(),
      );
    } catch {
      // Do not block the workflow if notification delivery fails.
    }
  }

  private toPositiveInt(value: unknown, fallback: number): number {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) {
      return Math.floor(n);
    }

    return fallback;
  }

  private toOptionalPositiveInt(value: unknown): number | undefined {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) {
      return Math.floor(n);
    }

    return undefined;
  }

  private buildShippingChecklistPdfFilename(customerCode: string, instanceId: number, formCode: string): string {
    const parts = [formCode || 'shipping-checklist', customerCode || 'customer', String(instanceId)];
    const normalized = parts
      .map((part) => String(part || '').trim())
      .filter((part) => part.length > 0)
      .join('-')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-');

    return `${normalized || 'shipping-checklist'}.pdf`;
  }

  private async tryLoadImageBuffer(urlInput: string): Promise<Buffer | null> {
    const normalized = String(urlInput || '').trim();
    if (!normalized || !/^https?:\/\//i.test(normalized)) {
      return null;
    }

    try {
      const response = await fetch(normalized);
      if (!response.ok) {
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  }

  private async generateShippingChecklistPdf(payload: {
    instance: Record<string, unknown>;
    template: { logoUrl?: string | null } | null;
    formCode: string;
    logoBuffer: Buffer | null;
  }): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28 });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

    const finished = new Promise<Buffer>((resolve, reject) => {
      stream.on('finish', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
      doc.on('error', reject);
    });

    doc.pipe(stream);

    const accent = '#255f9e';
    const border = '#d7dce2';
    const heading = '#111827';
    const muted = '#5b6470';

    const customerName = String(payload.instance.customerName || 'Customer').trim();
    const formTitle = String(payload.instance.formTitle || 'Shipping Checklist').trim();
    const formCode = String(payload.formCode || '—').trim();
    const status = String(payload.instance.status || 'draft').trim().toUpperCase();
    const instanceId = String(payload.instance.id || '—');

    const headerTop = 28;
    const leftX = 28;
    const rightX = doc.page.width - 28;

    if (payload.logoBuffer) {
      try {
        doc.image(payload.logoBuffer, leftX, headerTop + 2, { fit: [150, 44] });
      } catch {
        // Ignore logo rendering failures.
      }
    }

    doc
      .fillColor(accent)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('SHIPPING CHECKLIST', leftX + 170, headerTop, { width: 250, continued: false })
      .fillColor(heading)
      .font('Helvetica-Bold')
      .fontSize(18)
      .text(formTitle, leftX + 170, headerTop + 12, { width: 360 });

    doc
      .fillColor(muted)
      .font('Helvetica')
      .fontSize(9)
      .text(`${customerName} · ${formCode}`, leftX + 170, headerTop + 36, { width: 360 });

    const statusBoxX = rightX - 150;
    doc.roundedRect(statusBoxX, headerTop, 150, 42, 6).fillAndStroke('#f6f8fb', border);
    doc
      .fillColor(muted)
      .font('Helvetica-Bold')
      .fontSize(7)
      .text('STATUS', statusBoxX + 10, headerTop + 8, { width: 130, align: 'right' })
      .fillColor(heading)
      .fontSize(12)
      .text(status, statusBoxX + 10, headerTop + 19, { width: 130, align: 'right' });

    const sectionY = 88;
    doc.moveTo(leftX, sectionY).lineTo(rightX, sectionY).lineWidth(1.2).stroke(accent);

    const writeFooter = () => {
      const footerY = doc.page.height - 24;
      doc
        .save()
        .strokeColor(border)
        .lineWidth(0.7)
        .moveTo(leftX, footerY - 6)
        .lineTo(rightX, footerY - 6)
        .stroke()
        .fillColor(muted)
        .font('Helvetica')
        .fontSize(7.5)
        .text(`Generated ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`, leftX, footerY, {
          width: 250,
        })
        .text('Page 1', leftX, footerY, {
          width: rightX - leftX,
          align: 'right',
        })
        .restore();
    };

    let y = sectionY + 10;
    y = this.writePdfSectionTitle(doc, 'Checklist Summary', y, accent);
    y = this.writeSummaryGrid(doc, payload.instance, y, border, muted, heading);

    y += 4;
    y = this.writePdfSectionTitle(doc, 'Shipping Details', y, accent);
    y = this.writeInfoCards(doc, [
      ['Instance #', instanceId],
      ['Date', String(payload.instance.formDate || '—')],
      ['Sales Order', String(payload.instance.salesOrder || '—')],
      ['Packing Slip', String(payload.instance.packingSlip || '—')],
      ['Ship Via', String(payload.instance.shipVia || '—')],
      ['Shipping Account', String(payload.instance.shippingAccount || '—')],
      ['Verifier', String(payload.instance.verifierName || '—')],
      ['2nd Verifier', String(payload.instance.secondVerifierName || 'Unassigned')],
    ], y, border, muted, heading);

    y += 4;
    y = this.writePdfSectionTitle(doc, 'Line Items', y, accent);
    y = this.writeLineItemsTable(doc, Array.isArray(payload.instance.lines) ? (payload.instance.lines as Array<Record<string, unknown>>) : [], y, border, heading, muted);

    y += 4;
    y = this.writePdfSectionTitle(doc, 'Verification', y, accent);
    y = this.writeVerificationTable(doc, Array.isArray(payload.instance.responses) ? (payload.instance.responses as Array<Record<string, unknown>>) : [], y, border, heading, muted);

    y += 4;
    y = this.writePdfSectionTitle(doc, 'Notes', y, accent);
    y = this.writeNotesBox(doc, String(payload.instance.notes || 'No notes entered.'), y, border, muted);

    writeFooter();

    doc.end();
    return finished;
  }

  private writePdfSectionTitle(doc: PDFKit.PDFDocument, title: string, y: number, accent: string): number {
    doc.fillColor(accent).font('Helvetica-Bold').fontSize(10).text(title.toUpperCase(), 28, y);
    return doc.y + 6;
  }

  private writeSummaryGrid(
    doc: PDFKit.PDFDocument,
    instance: Record<string, unknown>,
    y: number,
    border: string,
    muted: string,
    heading: string,
  ): number {
    const rows: Array<[string, string]> = [
      ['Checklist #', String(instance.formCode || '—')],
      ['Instance #', String(instance.id || '—')],
      ['Created By', String(instance.createdBy || '—')],
      ['Customer', String(instance.customerName || '—')],
      ['Status', String(instance.status || '—').toUpperCase()],
      ['Sales Order', String(instance.salesOrder || '—')],
      ['Total Pallets', String(instance.totalPallets ?? '0')],
    ];

    const boxWidth = 170;
    const boxHeight = 30;
    const gap = 8;
    const startX = 28;

    rows.forEach((row, index) => {
      const col = index % 3;
      const rowIndex = Math.floor(index / 3);
      const x = startX + (boxWidth + gap) * col;
      const boxY = y + (boxHeight + gap) * rowIndex;
      doc.roundedRect(x, boxY, boxWidth, boxHeight, 5).fillAndStroke('#fbfcfe', border);
      doc.fillColor(muted).font('Helvetica-Bold').fontSize(7).text(row[0].toUpperCase(), x + 8, boxY + 6);
      doc.fillColor(heading).font('Helvetica-Bold').fontSize(10).text(row[1], x + 8, boxY + 15, {
        width: boxWidth - 16,
        ellipsis: true,
      });
    });

    const totalRows = Math.ceil(rows.length / 3);
    return y + totalRows * (boxHeight + gap) + 4;
  }

  private writeInfoCards(
    doc: PDFKit.PDFDocument,
    rows: Array<[string, string]>,
    y: number,
    border: string,
    muted: string,
    heading: string,
  ): number {
    const cardWidth = 120;
    const cardHeight = 32;
    const gap = 9;
    const startX = 28;
    const cardsPerRow = 4;

    rows.forEach((row, index) => {
      const col = index % cardsPerRow;
      const rowIndex = Math.floor(index / cardsPerRow);
      const x = startX + (cardWidth + gap) * col;
      const cardY = y + (cardHeight + gap) * rowIndex;

      doc.roundedRect(x, cardY, cardWidth, cardHeight, 5).fillAndStroke('#fbfcfe', border);
      doc.fillColor(muted).font('Helvetica-Bold').fontSize(7).text(row[0].toUpperCase(), x + 7, cardY + 5, {
        width: cardWidth - 14,
      });
      doc.fillColor(heading).font('Helvetica-Bold').fontSize(9).text(row[1], x + 7, cardY + 15, {
        width: cardWidth - 14,
        ellipsis: true,
      });
    });

    return y + Math.ceil(rows.length / cardsPerRow) * (cardHeight + gap) + 4;
  }

  private writeLineItemsTable(
    doc: PDFKit.PDFDocument,
    lines: Array<Record<string, unknown>>,
    y: number,
    border: string,
    heading: string,
    muted: string,
  ): number {
    const colWidths = [40, 170, 60, 205, 70];
    const headers = ['Ship', 'Part #', 'Qty', 'Serials', 'Pallet Qty'];
    const startX = 28;

    const drawHeader = (currentY: number): number => {
      let x = startX;
      doc.font('Helvetica-Bold').fontSize(8);
      headers.forEach((label, index) => {
        doc.rect(x, currentY, colWidths[index], 18).fillAndStroke('#e9f1fb', '#c9d8ea');
        doc.fillColor('#255f9e').text(label, x + 4, currentY + 5, {
          width: colWidths[index] - 8,
          ellipsis: true,
        });
        x += colWidths[index];
      });
      return currentY + 18;
    };

    y = drawHeader(y);
    doc.font('Helvetica').fontSize(8);

    lines.forEach((line, index) => {
      const values = [
        Number(line.isSelected) === 1 || line.isSelected === true ? 'Yes' : 'No',
        String(line.partNumber || '—'),
        String(line.qty || '—'),
        this.normalizeSerialNumbers((line.serialNumbers as unknown[] | string[] | undefined) || line.serialNumber).join(', ') || '—',
        String(line.palletQty || '—'),
      ];

      const rowHeight = Math.max(18, ...values.map((value, i) => doc.heightOfString(String(value), { width: colWidths[i] - 8 }))) + 8;

      if (y + rowHeight > doc.page.height - 80) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 28 });
        y = drawHeader(28);
      }

      const fillColor = index % 2 === 0 ? '#fbfcfe' : '#ffffff';
      doc.roundedRect(startX, y, colWidths.reduce((sum, width) => sum + width, 0), rowHeight, 4).fillAndStroke(fillColor, border);

      let x = startX;
      values.forEach((value, i) => {
        doc.rect(x, y, colWidths[i], rowHeight).stroke(border);
        doc.fillColor(heading).text(String(value), x + 4, y + 4, { width: colWidths[i] - 8 });
        x += colWidths[i];
      });
      y += rowHeight;
    });

    return y + 4;
  }

  private writeVerificationTable(
    doc: PDFKit.PDFDocument,
    responses: Array<Record<string, unknown>>,
    y: number,
    border: string,
    heading: string,
    muted: string,
  ): number {
    const colWidths = [48, 385, 112];
    const headers = ['#', 'Checklist Item', 'Result'];
    const startX = 28;

    const drawHeader = (currentY: number): number => {
      let x = startX;
      doc.font('Helvetica-Bold').fontSize(8);
      headers.forEach((label, index) => {
        doc.rect(x, currentY, colWidths[index], 18).fillAndStroke('#e9f1fb', '#c9d8ea');
        doc.fillColor('#255f9e').text(label, x + 4, currentY + 5, { width: colWidths[index] - 8 });
        x += colWidths[index];
      });
      return currentY + 18;
    };

    y = drawHeader(y);
    doc.font('Helvetica').fontSize(8);

    responses.forEach((response) => {
      const questionCode = String(response.questionCode || '');
      const questionText = String(response.questionText || '');
      const result = String(response.responseValue || '').toUpperCase() || '—';
      const attachments = this.decodeStringArray(response.imageUrls);
      const attachmentLabel = attachments.length > 0 ? `Attachments: ${attachments.map((item) => this.shortenPdfText(String(item), 42)).join(', ')}` : '';
      const itemText = attachmentLabel ? `${questionText}\n${attachmentLabel}` : questionText;
      const rowHeight = Math.max(18, doc.heightOfString(itemText, { width: colWidths[1] - 8 }) + 8);

      if (y + rowHeight > doc.page.height - 80) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 28 });
        y = drawHeader(28);
      }

      const fillColor = responses.indexOf(response) % 2 === 0 ? '#fbfcfe' : '#ffffff';
      doc.roundedRect(startX, y, colWidths.reduce((sum, width) => sum + width, 0), rowHeight, 4).fillAndStroke(fillColor, border);

      doc.rect(startX, y, colWidths[0], rowHeight).stroke(border);
      doc.rect(startX + colWidths[0], y, colWidths[1], rowHeight).stroke(border);
      doc.rect(startX + colWidths[0] + colWidths[1], y, colWidths[2], rowHeight).stroke(border);

      doc.fillColor(heading).font('Helvetica-Bold').text(questionCode, startX + 4, y + 4, {
        width: colWidths[0] - 8,
      });
      doc.fillColor(heading).font('Helvetica').text(itemText, startX + colWidths[0] + 4, y + 4, {
        width: colWidths[1] - 8,
      });
      doc.fillColor(heading).font('Helvetica-Bold').text(result, startX + colWidths[0] + colWidths[1] + 4, y + 4, {
        width: colWidths[2] - 8,
        align: 'center',
      });

      y += rowHeight;
    });

    return y + 4;
  }

  private writeNotesBox(doc: PDFKit.PDFDocument, notes: string, y: number, border: string, muted: string): number {
    const boxHeight = Math.max(26, doc.heightOfString(notes, { width: 527 - 12 }) + 14);
    if (y + boxHeight > doc.page.height - 60) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 28 });
      y = 28;
    }

    doc.roundedRect(28, y, 527, boxHeight, 5).fillAndStroke('#fbfcfe', border);
    doc.fillColor('#111827').font('Helvetica').fontSize(9).text(notes, 34, y + 6, { width: 515 });
    return y + boxHeight;
  }

  private shortenPdfText(value: string, max: number): string {
    const raw = String(value || '').trim();
    if (raw.length <= max) {
      return raw;
    }

    return `${raw.slice(0, Math.max(0, max - 1))}…`;
  }

  private async resolveAssignedVerifierRecipients(template: {
    assigned_verifier_user_id: number | null;
    assigned_verifier_email: string | null;
  } | null): Promise<string[]> {
    if (!template) {
      return [];
    }

    const recipients: string[] = [];

    if (template.assigned_verifier_user_id) {
      try {
        const user = await this.usersService.getById(Number(template.assigned_verifier_user_id));
        const userEmail = String(user.email || '').trim();
        if (userEmail) {
          recipients.push(userEmail);
        }
      } catch {
        // Fall through to the stored email on the template.
      }
    }

    recipients.push(...this.normalizeRecipientList([String(template.assigned_verifier_email || '').trim()]));
    return this.normalizeRecipientList(recipients);
  }

  private normalizeRecipientList(values: string[]): string[] {
    const result: string[] = [];
    const seen = new Set<string>();

    for (const value of values) {
      const tokens = String(value || '')
        .split(/[;,\n\r]+/g)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      for (const token of tokens) {
        const lower = token.toLowerCase();
        if (seen.has(lower)) {
          continue;
        }

        seen.add(lower);
        result.push(token);
      }
    }

    return result;
  }

  private toDateOnly(value: unknown): string | null {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return normalized;
    }

    return null;
  }

  private truncate(value: string, max: number): string {
    return value.length > max ? value.slice(0, max) : value;
  }

  private nullableTruncate(value: unknown, max: number): string | null {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return null;
    }

    return this.truncate(normalized, max);
  }

  private decodeStringArray(value: unknown): string[] {
    let parsed: unknown = value;

    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = [];
      }
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => String(item || '').trim())
      .filter((item) => item.length > 0)
      .slice(0, 25);
  }

  private decodeLineSerials(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item || '').trim())
        .slice(0, 500);
    }

    const raw = String(value || '').trim();
    if (!raw) {
      return [];
    }

    return raw
      .split(/\r?\n|,|;/g)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, 500);
  }

  private normalizeSerialNumbers(value: unknown): string[] {
    return this.decodeLineSerials(value);
  }

}
