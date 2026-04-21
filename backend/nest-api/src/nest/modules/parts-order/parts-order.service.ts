import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { EmailService } from '@/shared/email/email.service';
import { PartsOrderRepository } from './parts-order.repository';

interface PartsOrderRow extends Record<string, unknown> {
  id: number;
  so_number?: string | null;
  details?: string | Array<Record<string, unknown>>;
  arrival_date?: string | null;
  qad_info?: Record<string, unknown>;
  isPastDue?: 'Yes' | 'No';
}

@Injectable()
export class PartsOrderService {
  constructor(
    private readonly repository: PartsOrderRepository,
    private readonly qadOdbcService: QadOdbcService,
    private readonly emailService: EmailService,
  ) {}

  async getAll(): Promise<PartsOrderRow[]> {
    const rows = (await this.repository.find()) as PartsOrderRow[];

    const soNumbers = Array.from(
      new Set(
        rows
          .map((row) => String(row.so_number || '').trim())
          .filter((so) => so.length > 0),
      ),
    );

    const qadBySo = soNumbers.length ? await this.getQadInfoBySo(soNumbers) : new Map<string, Record<string, unknown>>();

    return rows.map((row) => {
      const parsedDetails = this.parseDetails(row.details);
      const so = String(row.so_number || '').trim();
      const qadInfo = so ? qadBySo.get(so) ?? {} : {};

      const dueDate = String((qadInfo.sod_due_date as string) || '');
      const qtyOpen = Number(qadInfo.qty_open ?? 0);
      const arrivalDate = String(row.arrival_date || '');
      const isPastDue = dueDate && arrivalDate && qtyOpen !== 0 && dueDate > arrivalDate ? 'Yes' : 'No';

      return {
        ...row,
        details: parsedDetails,
        qad_info: qadInfo,
        isPastDue,
      };
    });
  }

  async find(query: Record<string, unknown>): Promise<PartsOrderRow[]> {
    return (await this.repository.find(query)) as PartsOrderRow[];
  }

  async getById(id: number): Promise<PartsOrderRow | null> {
    return (await this.repository.findOne({ id })) as PartsOrderRow | null;
  }

  async getBySoLineNumber(soNumber: string): Promise<PartsOrderRow | null> {
    if (!soNumber) {
      throw new BadRequestException('so_number is required');
    }

    const row = (await this.repository.getBySoLineNumber(soNumber)) as PartsOrderRow | null;
    if (!row) {
      return null;
    }

    return {
      ...row,
      details: this.parseDetails(row.details),
    };
  }

  async create(payload: Record<string, unknown>): Promise<{ insertId: number }> {
    const normalized = this.normalizePayload(payload);
    const sanitized = this.repository.sanitizePayload(normalized);

    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const insertId = await this.repository.create(sanitized);
    await this.sendPartsOrderEmail(insertId, sanitized);
    return { insertId };
  }

  async update(id: number, payload: Record<string, unknown>): Promise<{ success: true }> {
    const normalized = this.normalizePayload(payload);
    const sanitized = this.repository.sanitizePayload(normalized);

    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`Parts order ${id} not found`);
    }

    return { success: true };
  }

  async delete(id: number): Promise<{ success: true }> {
    const affectedRows = await this.repository.deleteById(id);
    if (!affectedRows) {
      throw new NotFoundException(`Parts order ${id} not found`);
    }

    return { success: true };
  }

  async updateAndSendEmail(id: number, payload: Record<string, unknown>): Promise<{ insertId: number }> {
    const normalized = this.normalizePayload(payload);
    const sanitized = this.repository.sanitizePayload(normalized);

    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`Parts order ${id} not found`);
    }

    await this.sendPartsOrderEmail(id, sanitized);
    return { insertId: id };
  }

  private normalizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    const normalized = { ...payload };

    const oem = normalized.oem as Record<string, unknown> | string | undefined;
    if (oem && typeof oem === 'object' && 'cm_addr' in oem) {
      normalized.oem = String((oem as Record<string, unknown>).cm_addr || '');
    }

    return normalized;
  }

  private parseDetails(details: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(details)) {
      return details as Array<Record<string, unknown>>;
    }

    if (typeof details !== 'string' || !details.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(details);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async getQadInfoBySo(soNumbers: string[]): Promise<Map<string, Record<string, unknown>>> {
    const placeholders = soNumbers.map(() => '?').join(',');

    const sql = `
      SELECT a.sod_nbr,
             a.sod_due_date,
             CASE WHEN b.pt_part IS NULL THEN a.sod_desc ELSE b.fullDesc END AS fullDesc,
             a.sod_qty_ord - a.sod_qty_ship AS qty_open,
             c.so_ord_date AS so_ord_date,
             f.abs_ship_qty AS abs_ship_qty,
             f.abs_shp_date AS abs_shp_date,
             a.sod_nbr so
      FROM sod_det a
      LEFT JOIN (
        SELECT pt_part,
               MAX(pt_desc1) AS pt_desc1,
               MAX(pt_desc2) AS pt_desc2,
               MAX(CONCAT(pt_desc1, pt_desc2)) AS fullDesc,
               MAX(pt_routing) AS pt_routing
        FROM pt_mstr
        WHERE pt_domain = 'EYE'
        GROUP BY pt_part
      ) b ON b.pt_part = a.sod_part
      JOIN (
        SELECT so_nbr,
               so_cust,
               so_ord_date,
               so_ship,
               so_bol,
               so_cmtindx,
               so_compl_date,
               so_shipvia,
               LEFT(TO_CHAR(oid_so_mstr), 8) AS oid_so_order_date,
               RIGHT(TO_CHAR(ROUND(oid_so_mstr,0)), 10) AS oid_so_order_time,
               oid_so_mstr
        FROM so_mstr
        WHERE so_domain = 'EYE'
      ) c ON c.so_nbr = a.sod_nbr
      LEFT JOIN (
        SELECT abs_shipto,
               abs_shp_date,
               abs_item,
               abs_line,
               SUM(abs_ship_qty) AS abs_ship_qty,
               abs_inv_nbr,
               abs_par_id,
               abs_order
        FROM abs_mstr
        WHERE abs_domain = 'EYE'
        GROUP BY abs_shipto,
                 abs_shp_date,
                 abs_item,
                 abs_line,
                 abs_inv_nbr,
                 abs_par_id,
                 abs_order
      ) f ON f.abs_order = a.sod_nbr
      WHERE a.sod_domain = 'EYE'
        AND a.sod_nbr IN (${placeholders})
    `;

    const rows = await this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(
      sql,
      soNumbers,
      { keyCase: 'lower' },
    );

    const map = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      const so = String(row.sod_nbr || '').trim();
      if (so && !map.has(so)) {
        map.set(so, {
          sod_nbr: so,
          sod_due_date: String(row.sod_due_date || ''),
          fullDesc: String(row.fulldesc || ''),
          qty_open: Number(row.qty_open || 0),
          so_ord_date: String(row.so_ord_date || ''),
          abs_ship_qty: Number(row.abs_ship_qty || 0),
          abs_shp_date: String(row.abs_shp_date || ''),
        });
      }
    }

    return map;
  }

  private async sendPartsOrderEmail(id: number, payload: Record<string, unknown>): Promise<void> {
    const recipients = [
      'ritz.dacanay@the-fi-company.com',
      'juvenal.torres@the-fi-company.com',
      'orderslv@the-fi-company.com',
    ];

    const nowDate = new Date().toISOString().slice(0, 10);
    const link = `https://dashboard.eye-fi.com/dist/web/field-service/parts-order/edit?id=${id}`;

    const oem = String(payload.oem || '');
    const casinoName = String(payload.casino_name || '');
    const arrivalDate = String(payload.arrival_date || '');
    const address = String(payload.address || '');
    const contactName = String(payload.contact_name || '');
    const contactPhone = String(payload.contact_phone_number || '');
    const instructions = String(payload.instructions || '');
    const soNumber = String(payload.so_number || '');
    const details = this.parseDetails(payload.details);

    const detailsRows = details
      .map((row) => {
        const part = String(row.part_number || '');
        const billable = String(row.billable || '');
        const qty = String(row.qty || '');
        return `<tr><td>${part}</td><td>${billable}</td><td>${qty}</td></tr>`;
      })
      .join('');

    const detailsTable = details.length
      ? `
        <p>Parts</p>
        <table border="1" cellpadding="5" cellspacing="0">
          <tr><th>Part Number</th><th>Billable</th><th>Qty</th></tr>
          ${detailsRows}
        </table>
      `
      : '';

    const html = `
      <html><body>
        <p>Parts Order Request</p>
        ${soNumber ? `<p>SV Number: ${soNumber}</p>` : ''}
        <p>Parts Order ID #: ${id}</p>
        <p>OEM: ${oem}</p>
        <p>Casino Name: ${casinoName}</p>
        <p>Arrival Date: ${arrivalDate}</p>
        <p>Address: ${address}</p>
        <p>Contact: ${contactName}</p>
        <p>Contact Phone Number: ${contactPhone}</p>
        <p>${instructions}</p>
        ${detailsTable}
        <p>Please click <a href="${link}">here</a> to view request.</p>
      </body></html>
    `;

    await this.emailService.sendMail({
      from: 'noreply@the-fi-company.com',
      to: recipients,
      subject: `ID - ${id} Parts Order - ${nowDate}`,
      html,
    });
  }
}
