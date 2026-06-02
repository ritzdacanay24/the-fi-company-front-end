import { Inject, Injectable } from '@nestjs/common';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

interface ShippingChecklistTemplateRow extends RowDataPacket {
  id: number;
  customer_id: number | null;
  customer_code: string;
  customer_name: string;
  form_title: string;
  form_code: string;
  logo_text: string | null;
  customer_logo_url: string | null;
  assigned_verifier_user_id: number | null;
  assigned_verifier_name: string | null;
  assigned_verifier_email: string | null;
  is_active: number;
}

interface ShippingChecklistTemplateQuestionRow extends RowDataPacket {
  id: number;
  template_id: number;
  question_order: number;
  question_code: string;
  question_text: string;
  is_required: number;
}

interface FsCustomerLogoRow extends RowDataPacket {
  name: string | null;
  image: string | null;
}

interface CustomerMasterRow extends RowDataPacket {
  id: number;
  customer_code: string;
  customer_name: string;
  logo_url: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  mapping_count: number;
}

interface ShippingChecklistInstanceRow extends RowDataPacket {
  id: number;
  template_id: number;
  customer_code: string;
  customer_name: string;
  form_title: string;
  form_code: string | null;
  status: 'draft' | 'submitted' | 'verified';
  form_date: string | null;
  ship_via: string | null;
  shipping_account: string | null;
  sales_order: string | null;
  packing_slip: string | null;
  arrival_date: string | null;
  total_pallets: number | null;
  verifier_name: string | null;
  verifier_date: string | null;
  second_verifier_name: string | null;
  second_verifier_email: string | null;
  second_verifier_email_sent_at: string | null;
  second_verifier_email_sent_by: string | null;
  second_verifier_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ShippingChecklistInstanceLineRow extends RowDataPacket {
  id: number;
  instance_id: number;
  line_order: number;
  is_selected: number;
  part_number: string | null;
  qty: string | null;
  serial_number: string | null;
  pallet_qty: string | null;
}

interface ShippingChecklistInstanceLineSerialRow extends RowDataPacket {
  id: number;
  line_id: number;
  serial_order: number;
  serial_number: string;
}

interface ShippingChecklistInstanceResponseRow extends RowDataPacket {
  id: number;
  instance_id: number;
  question_code: string;
  question_text: string;
  response_value: 'yes' | 'no' | 'na' | '';
  image_urls_json: unknown;
}

export interface ShippingChecklistTemplateUpsert {
  id?: number;
  customerCode: string;
  customerName: string;
  formTitle: string;
  formCode: string;
  logoText?: string | null;
  assignedVerifierUserId?: number | null;
  assignedVerifierName?: string | null;
  assignedVerifierEmail?: string | null;
  isActive?: boolean;
  questions: Array<{
    questionOrder: number;
    questionCode: string;
    questionText: string;
    isRequired: boolean;
  }>;
}

export interface ShippingChecklistInstanceUpsert {
  id?: number;
  templateId: number;
  customerCode: string;
  customerName: string;
  formTitle: string;
  formCode?: string | null;
  status: 'draft' | 'submitted' | 'verified';
  formDate?: string | null;
  shipVia?: string | null;
  shippingAccount?: string | null;
  salesOrder?: string | null;
  packingSlip?: string | null;
  arrivalDate?: string | null;
  totalPallets?: number | null;
  verifierName?: string | null;
  verifierDate?: string | null;
  secondVerifierName?: string | null;
  secondVerifierEmail?: string | null;
  secondVerifierEmailSentAt?: string | null;
  secondVerifierEmailSentBy?: string | null;
  secondVerifierDate?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  lines: Array<{
    lineOrder: number;
    isSelected?: boolean;
    partNumber?: string | null;
    qty?: string | null;
    serialNumber?: string | null;
    serialNumbers?: string[];
    palletQty?: string | null;
  }>;
  responses: Array<{
    questionCode: string;
    questionText: string;
    responseValue: 'yes' | 'no' | 'na' | '';
    imageUrls?: string[];
  }>;
}

export interface CustomerMasterUpsert {
  id?: number;
  customerCode: string;
  customerName: string;
  logoUrl?: string | null;
  isActive?: boolean;
}

@Injectable()
export class ShippingChecklistsRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getTemplates(customerCode?: string): Promise<ShippingChecklistTemplateRow[]> {
    const normalizedCustomerCode = String(customerCode || '').trim().toLowerCase();
    if (!normalizedCustomerCode) {
      return this.mysqlService.query<ShippingChecklistTemplateRow[]>(
        `
          SELECT t.*, COALESCE(cm.logo_url, cm_by_code.logo_url) AS customer_logo_url
          FROM eyefidb.shipping_checklist_templates t
          LEFT JOIN eyefidb.customer_master cm ON cm.id = t.customer_id
          LEFT JOIN eyefidb.customer_master cm_by_code ON cm_by_code.customer_code = t.customer_code
          WHERE t.is_active = 1
          ORDER BY t.customer_name ASC
        `,
      );
    }

    return this.mysqlService.query<ShippingChecklistTemplateRow[]>(
      `
        SELECT t.*, COALESCE(cm.logo_url, cm_by_code.logo_url) AS customer_logo_url
        FROM eyefidb.shipping_checklist_templates t
        LEFT JOIN eyefidb.customer_master cm ON cm.id = t.customer_id
        LEFT JOIN eyefidb.customer_master cm_by_code ON cm_by_code.customer_code = t.customer_code
        WHERE t.customer_code = ?
        LIMIT 1
      `,
      [normalizedCustomerCode],
    );
  }

  async getTemplateById(id: number): Promise<ShippingChecklistTemplateRow | null> {
    const rows = await this.mysqlService.query<ShippingChecklistTemplateRow[]>(
      `SELECT * FROM eyefidb.shipping_checklist_templates WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }

  async getTemplateQuestions(templateIds: number[]): Promise<ShippingChecklistTemplateQuestionRow[]> {
    if (templateIds.length === 0) {
      return [];
    }

    const placeholders = templateIds.map(() => '?').join(', ');
    return this.mysqlService.query<ShippingChecklistTemplateQuestionRow[]>(
      `
        SELECT *
        FROM eyefidb.shipping_checklist_template_questions
        WHERE template_id IN (${placeholders})
        ORDER BY template_id ASC, question_order ASC
      `,
      templateIds,
    );
  }

  async getCustomerLogos(): Promise<FsCustomerLogoRow[]> {
    return this.mysqlService.query<FsCustomerLogoRow[]>(
      `
        SELECT name, image
        FROM eyefidb.fs_company_det
        WHERE active = 1
          AND TRIM(COALESCE(name, '')) <> ''
          AND TRIM(COALESCE(image, '')) <> ''
      `,
    );
  }

  async getCustomerMasterList(): Promise<CustomerMasterRow[]> {
    return this.mysqlService.query<CustomerMasterRow[]>(
      `
        SELECT
          c.*,
          COUNT(cem.id) AS mapping_count
        FROM eyefidb.customer_master c
        LEFT JOIN eyefidb.customer_external_map cem
          ON cem.customer_id = c.id
         AND cem.is_active = 1
        GROUP BY c.id
        ORDER BY c.is_active DESC, c.customer_name ASC
      `,
    );
  }

  async upsertCustomerMaster(payload: CustomerMasterUpsert): Promise<number> {
    const customerId = Number(payload.id || 0);

    if (customerId > 0) {
      await this.mysqlService.query(
        `
          UPDATE eyefidb.customer_master
          SET
            customer_code = ?,
            customer_name = ?,
            logo_url = ?,
            is_active = ?
          WHERE id = ?
        `,
        [
          payload.customerCode,
          payload.customerName,
          payload.logoUrl || null,
          payload.isActive === false ? 0 : 1,
          customerId,
        ],
      );

      return customerId;
    }

    const result = await this.mysqlService.query<ResultSetHeader>(
      `
        INSERT INTO eyefidb.customer_master (
          customer_code,
          customer_name,
          logo_url,
          is_active
        ) VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          id = LAST_INSERT_ID(id),
          customer_name = VALUES(customer_name),
          logo_url = VALUES(logo_url),
          is_active = VALUES(is_active)
      `,
      [
        payload.customerCode,
        payload.customerName,
        payload.logoUrl || null,
        payload.isActive === false ? 0 : 1,
      ],
    );

    return Number(result.insertId || 0);
  }

  async upsertTemplate(payload: ShippingChecklistTemplateUpsert): Promise<number> {
    return this.mysqlService.withTransaction(async (connection) => {
      const customerId = await this.upsertCustomerMaster(connection, payload);
      const templateId = await this.upsertTemplateRow(connection, payload, customerId);
      await this.replaceTemplateQuestions(connection, templateId, payload.questions);
      return templateId;
    });
  }

  private async upsertCustomerMaster(connection: PoolConnection, payload: ShippingChecklistTemplateUpsert): Promise<number> {
    const result = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO eyefidb.customer_master (
          customer_code,
          customer_name,
          is_active
        ) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          id = LAST_INSERT_ID(id),
          customer_name = VALUES(customer_name),
          is_active = VALUES(is_active)
      `,
      [
        payload.customerCode,
        payload.customerName,
        payload.isActive === false ? 0 : 1,
      ],
    );

    return Number(result[0].insertId || 0);
  }

  async getInstances(customerCode?: string, limit = 100): Promise<ShippingChecklistInstanceRow[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));
    const normalizedCustomerCode = String(customerCode || '').trim().toLowerCase();

    if (!normalizedCustomerCode) {
      return this.mysqlService.query<ShippingChecklistInstanceRow[]>(
        `
          SELECT *
          FROM eyefidb.shipping_checklist_instances
          ORDER BY updated_at DESC
          LIMIT ${safeLimit}
        `,
      );
    }

    return this.mysqlService.query<ShippingChecklistInstanceRow[]>(
      `
        SELECT *
        FROM eyefidb.shipping_checklist_instances
        WHERE customer_code = ?
        ORDER BY updated_at DESC
        LIMIT ${safeLimit}
      `,
      [normalizedCustomerCode],
    );
  }

  async getInstanceById(id: number): Promise<ShippingChecklistInstanceRow | null> {
    const rows = await this.mysqlService.query<ShippingChecklistInstanceRow[]>(
      `SELECT * FROM eyefidb.shipping_checklist_instances WHERE id = ? LIMIT 1`,
      [id],
    );

    return rows[0] || null;
  }

  async markSecondaryVerificationEmailSent(instanceId: number, sentAt: string, sentBy: string): Promise<void> {
    await this.mysqlService.query(
      `
        UPDATE eyefidb.shipping_checklist_instances
        SET second_verifier_email_sent_at = ?, second_verifier_email_sent_by = ?
        WHERE id = ?
      `,
      [sentAt, sentBy, instanceId],
    );
  }

  async getInstanceLines(instanceId: number): Promise<ShippingChecklistInstanceLineRow[]> {
    return this.mysqlService.query<ShippingChecklistInstanceLineRow[]>(
      `
        SELECT *
        FROM eyefidb.shipping_checklist_instance_lines
        WHERE instance_id = ?
        ORDER BY line_order ASC
      `,
      [instanceId],
    );
  }

  async getInstanceResponses(instanceId: number): Promise<ShippingChecklistInstanceResponseRow[]> {
    return this.mysqlService.query<ShippingChecklistInstanceResponseRow[]>(
      `
        SELECT *
        FROM eyefidb.shipping_checklist_instance_responses
        WHERE instance_id = ?
        ORDER BY question_code ASC
      `,
      [instanceId],
    );
  }

  async getInstanceLineSerials(instanceId: number): Promise<ShippingChecklistInstanceLineSerialRow[]> {
    return this.mysqlService.query<ShippingChecklistInstanceLineSerialRow[]>(
      `
        SELECT s.*
        FROM eyefidb.shipping_checklist_instance_line_serials s
        INNER JOIN eyefidb.shipping_checklist_instance_lines l ON l.id = s.line_id
        WHERE l.instance_id = ?
        ORDER BY l.line_order ASC, s.serial_order ASC
      `,
      [instanceId],
    );
  }

  async upsertInstance(payload: ShippingChecklistInstanceUpsert): Promise<number> {
    return this.mysqlService.withTransaction(async (connection) => {
      const instanceId = await this.upsertInstanceRow(connection, payload);
      const lineSerialLinks = await this.replaceInstanceLines(connection, instanceId, payload.lines);
      await this.replaceInstanceLineSerials(connection, instanceId, lineSerialLinks);
      await this.replaceInstanceResponses(connection, instanceId, payload.responses);
      return instanceId;
    });
  }

  private async upsertTemplateRow(
    connection: PoolConnection,
    payload: ShippingChecklistTemplateUpsert,
    customerId: number,
  ): Promise<number> {
    const templateId = Number(payload.id || 0);

    if (templateId > 0) {
      await connection.execute<ResultSetHeader>(
        `
          UPDATE eyefidb.shipping_checklist_templates
            SET customer_id = ?, customer_code = ?, customer_name = ?, form_title = ?, form_code = ?, logo_text = ?, assigned_verifier_user_id = ?, assigned_verifier_name = ?, assigned_verifier_email = ?, is_active = ?
          WHERE id = ?
        `,
        [
          customerId || null,
          payload.customerCode,
          payload.customerName,
          payload.formTitle,
          payload.formCode,
          payload.logoText || null,
            payload.assignedVerifierUserId ?? null,
            payload.assignedVerifierName || null,
            payload.assignedVerifierEmail || null,
          payload.isActive === false ? 0 : 1,
          templateId,
        ],
      );

      return templateId;
    }

    const insertResult = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO eyefidb.shipping_checklist_templates (
          customer_id,
          customer_code,
          customer_name,
          form_title,
          form_code,
          logo_text,
          assigned_verifier_user_id,
          assigned_verifier_name,
          assigned_verifier_email,
          is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          id = LAST_INSERT_ID(id),
          customer_id = VALUES(customer_id),
          customer_name = VALUES(customer_name),
          form_title = VALUES(form_title),
          form_code = VALUES(form_code),
          logo_text = VALUES(logo_text),
          assigned_verifier_user_id = VALUES(assigned_verifier_user_id),
          assigned_verifier_name = VALUES(assigned_verifier_name),
          assigned_verifier_email = VALUES(assigned_verifier_email),
          is_active = VALUES(is_active)
      `,
      [
        customerId || null,
        payload.customerCode,
        payload.customerName,
        payload.formTitle,
        payload.formCode,
        payload.logoText || null,
        payload.assignedVerifierUserId ?? null,
        payload.assignedVerifierName || null,
        payload.assignedVerifierEmail || null,
        payload.isActive === false ? 0 : 1,
      ],
    );

    return insertResult[0].insertId || templateId;
  }

  private async replaceTemplateQuestions(
    connection: PoolConnection,
    templateId: number,
    questions: ShippingChecklistTemplateUpsert['questions'],
  ): Promise<void> {
    await connection.execute<ResultSetHeader>(
      `DELETE FROM eyefidb.shipping_checklist_template_questions WHERE template_id = ?`,
      [templateId],
    );

    for (const question of questions) {
      await connection.execute<ResultSetHeader>(
        `
          INSERT INTO eyefidb.shipping_checklist_template_questions (
            template_id,
            question_order,
            question_code,
            question_text,
            is_required
          ) VALUES (?, ?, ?, ?, ?)
        `,
        [
          templateId,
          question.questionOrder,
          question.questionCode,
          question.questionText,
          question.isRequired ? 1 : 0,
        ],
      );
    }
  }

  private async upsertInstanceRow(connection: PoolConnection, payload: ShippingChecklistInstanceUpsert): Promise<number> {
    const instanceId = Number(payload.id || 0);

    if (instanceId > 0) {
      try {
        await connection.execute<ResultSetHeader>(
          `
            UPDATE eyefidb.shipping_checklist_instances
            SET
              template_id = ?,
              customer_code = ?,
              customer_name = ?,
              form_title = ?,
              form_code = ?,
              status = ?,
              form_date = ?,
              ship_via = ?,
              shipping_account = ?,
              sales_order = ?,
              packing_slip = ?,
              arrival_date = ?,
              total_pallets = ?,
              verifier_name = ?,
              verifier_date = ?,
              second_verifier_name = ?,
              second_verifier_email = ?,
              second_verifier_date = ?,
              notes = ?,
              created_by = ?
            WHERE id = ?
          `,
          [
            payload.templateId,
            payload.customerCode,
            payload.customerName,
            payload.formTitle,
            payload.formCode || null,
            payload.status,
            payload.formDate || null,
            payload.shipVia || null,
            payload.shippingAccount || null,
            payload.salesOrder || null,
            payload.packingSlip || null,
            payload.arrivalDate || null,
            payload.totalPallets ?? null,
            payload.verifierName || null,
            payload.verifierDate || null,
            payload.secondVerifierName || null,
            payload.secondVerifierEmail || null,
            payload.secondVerifierDate || null,
            payload.notes || null,
            payload.createdBy || null,
            instanceId,
          ],
        );
      } catch (error) {
        if (!this.isMissingColumnError(error, 'form_code')) {
          throw error;
        }

        await connection.execute<ResultSetHeader>(
          `
            UPDATE eyefidb.shipping_checklist_instances
            SET
              template_id = ?,
              customer_code = ?,
              customer_name = ?,
              form_title = ?,
              status = ?,
              form_date = ?,
              ship_via = ?,
              shipping_account = ?,
              sales_order = ?,
              packing_slip = ?,
              arrival_date = ?,
              total_pallets = ?,
              verifier_name = ?,
              verifier_date = ?,
              second_verifier_name = ?,
              second_verifier_email = ?,
              second_verifier_date = ?,
              notes = ?,
              created_by = ?
            WHERE id = ?
          `,
          [
            payload.templateId,
            payload.customerCode,
            payload.customerName,
            payload.formTitle,
            payload.status,
            payload.formDate || null,
            payload.shipVia || null,
            payload.shippingAccount || null,
            payload.salesOrder || null,
            payload.packingSlip || null,
            payload.arrivalDate || null,
            payload.totalPallets ?? null,
            payload.verifierName || null,
            payload.verifierDate || null,
            payload.secondVerifierName || null,
            payload.secondVerifierEmail || null,
            payload.secondVerifierDate || null,
            payload.notes || null,
            payload.createdBy || null,
            instanceId,
          ],
        );
      }

      return instanceId;
    }

    let insertResult;
    try {
      insertResult = await connection.execute<ResultSetHeader>(
        `
          INSERT INTO eyefidb.shipping_checklist_instances (
            template_id,
            customer_code,
            customer_name,
            form_title,
            form_code,
            status,
            form_date,
            ship_via,
            shipping_account,
            sales_order,
            packing_slip,
            arrival_date,
            total_pallets,
            verifier_name,
            verifier_date,
            second_verifier_name,
            second_verifier_email,
            second_verifier_date,
            notes,
            created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          payload.templateId,
          payload.customerCode,
          payload.customerName,
          payload.formTitle,
          payload.formCode || null,
          payload.status,
          payload.formDate || null,
          payload.shipVia || null,
          payload.shippingAccount || null,
          payload.salesOrder || null,
          payload.packingSlip || null,
          payload.arrivalDate || null,
          payload.totalPallets ?? null,
          payload.verifierName || null,
          payload.verifierDate || null,
          payload.secondVerifierName || null,
          payload.secondVerifierEmail || null,
          payload.secondVerifierDate || null,
          payload.notes || null,
          payload.createdBy || null,
        ],
      );
    } catch (error) {
      if (!this.isMissingColumnError(error, 'form_code')) {
        throw error;
      }

      insertResult = await connection.execute<ResultSetHeader>(
        `
          INSERT INTO eyefidb.shipping_checklist_instances (
            template_id,
            customer_code,
            customer_name,
            form_title,
            status,
            form_date,
            ship_via,
            shipping_account,
            sales_order,
            packing_slip,
            arrival_date,
            total_pallets,
            verifier_name,
            verifier_date,
            second_verifier_name,
            second_verifier_email,
            second_verifier_date,
            notes,
            created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          payload.templateId,
          payload.customerCode,
          payload.customerName,
          payload.formTitle,
          payload.status,
          payload.formDate || null,
          payload.shipVia || null,
          payload.shippingAccount || null,
          payload.salesOrder || null,
          payload.packingSlip || null,
          payload.arrivalDate || null,
          payload.totalPallets ?? null,
          payload.verifierName || null,
          payload.verifierDate || null,
          payload.secondVerifierName || null,
          payload.secondVerifierEmail || null,
          payload.secondVerifierDate || null,
          payload.notes || null,
          payload.createdBy || null,
        ],
      );
    }

    return insertResult[0].insertId;
  }

  private isMissingColumnError(error: unknown, columnName: string): boolean {
    const code = String((error as { code?: string })?.code || '');
    const message = String((error as { message?: string })?.message || '').toLowerCase();
    return code === 'ER_BAD_FIELD_ERROR' && message.includes(`unknown column '${String(columnName || '').toLowerCase()}`);
  }

  private async replaceInstanceLines(
    connection: PoolConnection,
    instanceId: number,
    lines: ShippingChecklistInstanceUpsert['lines'],
  ): Promise<Array<{ lineId: number; serialNumbers: string[] }>> {
    await connection.execute<ResultSetHeader>(`DELETE FROM eyefidb.shipping_checklist_instance_lines WHERE instance_id = ?`, [instanceId]);

    const lineSerialLinks: Array<{ lineId: number; serialNumbers: string[] }> = [];

    for (const line of lines) {
      const normalizedSerialNumbers = Array.isArray(line.serialNumbers)
        ? line.serialNumbers.map((item) => String(item || '').trim())
        : [];

      const serialFallback = String(line.serialNumber || '').trim();
      const insertResult = await connection.execute<ResultSetHeader>(
        `
          INSERT INTO eyefidb.shipping_checklist_instance_lines (
            instance_id,
            line_order,
            is_selected,
            part_number,
            qty,
            serial_number,
            pallet_qty
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          instanceId,
          line.lineOrder,
          line.isSelected === false ? 0 : 1,
          line.partNumber || null,
          line.qty || null,
          normalizedSerialNumbers[0] || serialFallback || null,
          line.palletQty || null,
        ],
      );

      lineSerialLinks.push({
        lineId: insertResult[0].insertId,
        serialNumbers: normalizedSerialNumbers.length > 0
          ? normalizedSerialNumbers
          : serialFallback
            ? [serialFallback]
            : [],
      });
    }

    return lineSerialLinks;
  }

  private async replaceInstanceLineSerials(
    connection: PoolConnection,
    instanceId: number,
    lineSerialLinks: Array<{ lineId: number; serialNumbers: string[] }>,
  ): Promise<void> {
    await connection.execute<ResultSetHeader>(
      `
        DELETE s
        FROM eyefidb.shipping_checklist_instance_line_serials s
        INNER JOIN eyefidb.shipping_checklist_instance_lines l ON l.id = s.line_id
        WHERE l.instance_id = ?
      `,
      [instanceId],
    );

    for (const link of lineSerialLinks) {
      for (let index = 0; index < link.serialNumbers.length; index += 1) {
        await connection.execute<ResultSetHeader>(
          `
            INSERT INTO eyefidb.shipping_checklist_instance_line_serials (
              line_id,
              serial_order,
              serial_number
            ) VALUES (?, ?, ?)
          `,
          [link.lineId, index + 1, link.serialNumbers[index]],
        );
      }
    }
  }

  private async replaceInstanceResponses(
    connection: PoolConnection,
    instanceId: number,
    responses: ShippingChecklistInstanceUpsert['responses'],
  ): Promise<void> {
    await connection.execute<ResultSetHeader>(`DELETE FROM eyefidb.shipping_checklist_instance_responses WHERE instance_id = ?`, [instanceId]);

    for (const response of responses) {
      await connection.execute<ResultSetHeader>(
        `
          INSERT INTO eyefidb.shipping_checklist_instance_responses (
            instance_id,
            question_code,
            question_text,
            response_value,
            image_urls_json
          ) VALUES (?, ?, ?, ?, CAST(? AS JSON))
        `,
        [
          instanceId,
          response.questionCode,
          response.questionText,
          response.responseValue,
          JSON.stringify(Array.isArray(response.imageUrls) ? response.imageUrls : []),
        ],
      );
    }
  }
}
