import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { EmailService } from '@/shared/email/email.service';
import { RfqRepository } from './rfq.repository';

@Injectable()
export class RfqService {
  private readonly logger = new Logger(RfqService.name);

  constructor(
    private readonly repository: RfqRepository,
    private readonly emailService: EmailService,
  ) {}

  async getList(query: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll?: boolean;
  }): Promise<RowDataPacket[]> {
    return this.repository.getList(query.selectedViewType);
  }

  async find(filters: Record<string, unknown>) {
    return this.repository.find(filters);
  }

  async getAll(selectedViewType?: string) {
    return this.repository.getAll(selectedViewType);
  }

  async getById(id: number): Promise<RowDataPacket> {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_RFQ_NOT_FOUND',
        message: `RFQ with id ${id} not found`,
      });
    }
    return row;
  }

  async create(payload: Record<string, unknown>) {
    const insertId = await this.repository.create(payload);
    return { insertId };
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    await this.getById(id);
    const rowCount = await this.repository.updateById(id, payload);
    return { rowCount };
  }

  async deleteById(id: number) {
    await this.getById(id);
    const rowCount = await this.repository.deleteById(id);
    return { rowCount };
  }

  async searchBySoAndSoLine(so: string, line: string, userName?: string) {
    const rows = await this.repository.readBySalesOrder(so);

    const mainInfo = {
      shipperName: 'EYEFI',
      address: '7900 West Sunset Rd. Suite 200 & 300',
      city: 'Las Vegas',
      state: 'NV',
      zip: '89113',
      phone: '725-261-1525',
      requestorName: userName || '',
      contactName: 'Greg Nix',
      shippingHours: '7-4',
      readyDateTime: '',
      puNumber: 'N/A',
      poShippingFull: 'No',
      appointmentRequired: 'No',
      liftGateRequired: 'No',
      bolFaxEmail: ['eyefilogistics@the-fi-company.com'],
      ccEmails: ['eyefilogistics@the-fi-company.com'],
      dest_address: 'N/A',
      dest_address2: '',
      dest_country: 'N/A',
      dest_city: 'N/A',
      dest_state: 'N/A',
      dest_zip: 'N/A',
      dest_phone: 'N/A',
      dest_contactName: 'N/A',
      dest_deliveryNumber: 'N/A',
      dest_deliveryDate: '',
      dest_appointmentRequired: 'No',
      dest_companyName: 'N/A',
      descriptionOfProduct: '',
      piecesQty: 0,
      piecesQtyUoM: 'Pallets',
      palletSpacesLinearFeet: '',
      weight: '',
      itemNumber: '',
      value: 0,
      freightClass: '300',
      palletSize: '',
      poNumber: '',
      lineNumber: line,
      sod_nbr: so,
      specialRequirements: '',
    } as Record<string, unknown>;

    const otherLines = rows.map((row) => {
      const qtyOpen = Number(row.qty_open || 0);
      const sodListPrice = Number(row.sod_list_pr || 0);
      return {
        ...row,
        addItemsList: qtyOpen > 0,
        value: 0,
        piecesQty: 0,
        open_balance: sodListPrice * qtyOpen,
      };
    });

    const selectedLine = rows.find((row) => String(row.sod_line) === String(line));
    if (selectedLine) {
      mainInfo.dest_address = (selectedLine.ad_line1 as string) || 'N/A';
      mainInfo.dest_address2 = (selectedLine.ad_line2 as string) || '';
      mainInfo.dest_country = (selectedLine.ad_country as string) || 'N/A';
      mainInfo.dest_city = (selectedLine.ad_city as string) || 'N/A';
      mainInfo.dest_state = (selectedLine.ad_state as string) || 'N/A';
      mainInfo.dest_zip = (selectedLine.ad_zip as string) || 'N/A';
      mainInfo.dest_companyName = (selectedLine.ad_name as string) || 'N/A';
      mainInfo.itemNumber = (selectedLine.sod_part as string) || '';
      mainInfo.poNumber = (selectedLine.sod_contr_id as string) || '';
    }

    return {
      main: mainInfo,
      otherLines,
    };
  }

  async sendEmail(id: number, payload: Record<string, unknown>) {
    await this.getById(id);

    const details = (payload.details as Record<string, unknown>) || {};
    const recipients = this.parseEmails(details.emailToSendTo);
    const cc = this.parseEmails(details.ccEmails);
    const lineInfoEachShow = this.parseObjectArray(payload.lineInfoEachShow);
    const palletSizes = this.parseObjectArray(payload.palletSizeInformationSendInfo);

    if (recipients.length === 0) {
      return { message: 'Access denied' };
    }

    const subject = String(details.subjectLine || `RFQ #${id}`);
    const insuranceIncluded = this.toYesNo(details.insuranceIncluded);
    const bolFaxEmail = this.parseEmails(details.bolFaxEmail).join(',<br>') || 'No emails attached';

    const palletRows = palletSizes
      .map((row, index) => {
        const size = String(row.size || '').trim();
        if (!size) {
          return '';
        }
        return `<tr><td><strong>Pallet Size (${index + 1})</strong></td><td>${this.escapeHtml(size)}</td></tr>`;
      })
      .filter(Boolean)
      .join('');

    const lineRows = lineInfoEachShow
      .filter((row) => Boolean(row.addItemsList))
      .map((row) => {
        const part = this.escapeHtml(String(row.sod_part || ''));
        const qty = this.escapeHtml(String(row.qty || '0'));
        const price = this.formatCurrency(row.sod_list_pr);
        return `<tr><td>${part}</td><td>${qty}</td><td>${price}</td></tr>`;
      })
      .join('');

    const hasLineRows = lineRows.length > 0;

    const html = `
      <html>
        <body>
          <table align="left" style="text-align:center;width:600px;">
            <tr>
              <td align="left" style="text-align:center;">
                <br>
                <br>
                <table style="border: 1px solid black;width:100%;border-collapse:collapse;">
                  <tr style="font-size:25px;background-color:#2a3140;padding:30px;color:white;text-align:center"><td colspan="2" style="padding:10px"><strong>Shipping Information</strong></td></tr>
                  <tr><td><strong>Shipper Name</strong></td><td>${this.escapeHtml(String(details.shipperName || ''))}</td></tr>
                  <tr><td><strong>Address</strong></td><td>${this.escapeHtml(String(details.address || ''))}</td></tr>
                  <tr><td><strong>City/State/Zip</strong></td><td>${this.escapeHtml(String(details.city || ''))}, ${this.escapeHtml(String(details.state || ''))} ${this.escapeHtml(String(details.zip || ''))}</td></tr>
                  <tr><td><strong>Phone</strong></td><td>${this.escapeHtml(String(details.phone || ''))}</td></tr>
                  <tr><td><strong>Requester Name</strong></td><td>${this.escapeHtml(String(details.requestorName || ''))}</td></tr>
                  <tr><td><strong>Contact Name</strong></td><td>${this.escapeHtml(String(details.contactName || ''))}</td></tr>
                  <tr><td><strong>Shipping Hours</strong></td><td>${this.escapeHtml(String(details.shippingHours || ''))}</td></tr>
                  <tr><td><strong>Ready Date & Time</strong></td><td>${this.escapeHtml(String(details.readyDateTime || ''))}</td></tr>
                  <tr><td><strong>PU#- provide if required</strong></td><td>${this.escapeHtml(String(details.puNumber || ''))}</td></tr>
                  <tr><td><strong>PO#</strong></td><td>${this.escapeHtml(String(details.poNumber || ''))}</td></tr>
                  <tr><td><strong>Is PO Shipping in FULL?</strong></td><td>${this.escapeHtml(String(details.poShippingFull || ''))}</td></tr>
                  <tr><td><strong>Appointment Required?</strong></td><td>${this.escapeHtml(String(details.appointmentRequired || ''))}</td></tr>
                  <tr><td><strong>Lift Gate Required?</strong></td><td>${this.escapeHtml(String(details.liftGateRequired || ''))}</td></tr>
                  <tr><td><strong>BOL GOES TO FAX/EMAIL</strong></td><td>${bolFaxEmail}</td></tr>

                  <tr style="font-size:25px;background-color:#2a3140;padding:30px;color:white;text-align:center"><td colspan="2" style="padding:10px"><strong>Destination Information</strong></td></tr>
                  <tr><td><strong>Company Name</strong></td><td>${this.escapeHtml(String(details.dest_companyName || ''))}</td></tr>
                  <tr><td><strong>Address</strong></td><td>${this.escapeHtml(String(details.dest_address || ''))}</td></tr>
                  <tr><td><strong>Address 2</strong></td><td>${this.escapeHtml(String(details.dest_address2 || ''))}</td></tr>
                  <tr><td><strong>City/State/Zip</strong></td><td>${this.escapeHtml(String(details.dest_city || ''))}, ${this.escapeHtml(String(details.dest_state || ''))} ${this.escapeHtml(String(details.dest_zip || ''))}</td></tr>
                  <tr><td><strong>Country</strong></td><td>${this.escapeHtml(String(details.dest_country || ''))}</td></tr>
                  <tr><td><strong>Phone</strong></td><td>${this.escapeHtml(String(details.dest_phone || ''))}</td></tr>
                  <tr><td><strong>Contact Name</strong></td><td>${this.escapeHtml(String(details.dest_contactName || ''))}</td></tr>
                  <tr><td><strong>Deliver # - provide if required</strong></td><td>${this.escapeHtml(String(details.dest_deliveryNumber || ''))}</td></tr>
                  <tr><td><strong>Delivery Date</strong></td><td>${this.escapeHtml(String(details.dest_deliveryDate || ''))}</td></tr>
                  <tr><td><strong>Appointment Required?</strong></td><td>${this.escapeHtml(String(details.dest_appointmentRequired || ''))}</td></tr>

                  <tr style="font-size:25px;background-color:#2a3140;padding:30px;color:white;text-align:center"><td colspan="2" style="padding:10px"><strong>Commodity Information</strong></td></tr>
                  <tr><td><strong>Description Of Product</strong></td><td>${this.escapeHtml(String(details.descriptionOfProduct || ''))}</td></tr>
                  <tr><td><strong>Pallets/Pieces/Cartons</strong></td><td>${this.escapeHtml(String(details.piecesQty || ''))} ${this.escapeHtml(String(details.piecesQtyUoM || ''))}</td></tr>
                  ${palletRows}
                  <tr><td><strong>Weight</strong></td><td>${this.escapeHtml(String(details.weight || ''))}</td></tr>
                  <tr><td><strong>Decalared Value</strong></td><td>${this.formatCurrency(details.value)}</td></tr>
                  <tr><td><strong>Include Insurance</strong></td><td>${insuranceIncluded}</td></tr>
                  <tr><td><strong>Freight Class</strong></td><td>${this.escapeHtml(String(details.freightClass || ''))}</td></tr>
                  <tr><td><strong>Special Requirements</strong></td><td>${this.escapeHtml(String(details.specialRequirements || ''))}</td></tr>
                </table>
                ${
                  hasLineRows
                    ? `<table style="border:1px solid black;width:100%;border-collapse:collapse;margin-top:10px;">
                        <tr style="background:#eee;">
                          <td><strong>Part</strong></td>
                          <td><strong>Qty Shipped</strong></td>
                          <td><strong>Price</strong></td>
                        </tr>
                        ${lineRows}
                      </table>`
                    : ''
                }
                <br><hr>
                Thank you. <br>
                Ref: Email sent by ${this.escapeHtml(String(details.requestorName || ''))}
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    try {
      await this.emailService.sendMail({
        from: process.env.MAIL_FROM || 'noreply@the-fi-company.com',
        to: recipients,
        cc,
        bcc: ['ritz.dacanay@the-fi-company.com'],
        subject,
        html,
      });

      await this.repository.updateById(id, { email_sent_date: new Date() });
      return { sent: true };
    } catch (error) {
      this.logger.warn(
        `RFQ send email failed for id ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { message: 'Access denied' };
    }
  }

  private parseEmails(value: unknown): string[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.map((v) => String(v).trim()).filter(Boolean);
    }

    const raw = String(value).trim();
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      // Fall back to comma-separated values.
    }

    return raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  private parseObjectArray(value: unknown): Array<Record<string, unknown>> {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.filter((v) => typeof v === 'object' && v !== null) as Array<Record<string, unknown>>;
    }

    const raw = String(value).trim();
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((v) => typeof v === 'object' && v !== null) as Array<Record<string, unknown>>;
      }
    } catch {
      return [];
    }

    return [];
  }

  private toYesNo(value: unknown): string {
    if (value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true') {
      return 'Yes';
    }
    return 'No';
  }

  private formatCurrency(value: unknown): string {
    const parsed = Number(value || 0);
    return `$${parsed.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
