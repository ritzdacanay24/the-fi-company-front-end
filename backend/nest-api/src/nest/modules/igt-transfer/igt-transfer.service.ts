import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RowDataPacket } from 'mysql2/promise';
import PDFDocument from 'pdfkit';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { UrlBuilder } from '@/shared/url/url-builder';
import { EmailNotificationsService, type EmailNotificationAccessValue } from '../email-notifications';

interface IgtTransferRow extends RowDataPacket {
  id: number;
}

interface GetListParams {
  selectedViewType?: string;
  dateFrom?: string;
  dateTo?: string;
  isAll: boolean;
}

interface IgtTransferSoLineRow {
  sod_part: string;
  sod_qty_ord: number;
  sod_qty_ship: number;
  sod_order_category: string;
  pt_desc1: string;
  pt_desc2: string;
  sod_line: number;
  so_rmks: string;
  so_po: string;
  to_loc: string;
}

interface AutomatedIgtTransferMain {
  so_number?: string;
  transfer_reference?: string;
  transfer_reference_description?: string;
  from_location?: string;
  to_location?: string;
  email_sent_datetime?: string;
  email_sent_created_by_name?: string;
}

interface AutomatedIgtTransferDetail {
  part_number?: string;
  description?: string;
  qty?: number | string;
  pallet_count?: number | string;
  serial_numbers?: string;
  so_line?: number | string;
}

interface AutomatedIgtTransferPayload {
  main?: AutomatedIgtTransferMain;
  details?: AutomatedIgtTransferDetail[];
  printedName?: string;
}

interface SoDueDateRow {
  sod_due_date: string;
}

@Injectable()
export class IgtTransferService {
  constructor(
    @Inject(MysqlService)
    private readonly mysqlService: MysqlService,
    @Inject(QadOdbcService)
    private readonly qadOdbcService: QadOdbcService,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Inject(EmailTemplateService)
    private readonly emailTemplateService: EmailTemplateService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(UrlBuilder)
    private readonly urlBuilder: UrlBuilder,
    private readonly emailNotificationsService: EmailNotificationsService,
  ) {}

  async getList(params: GetListParams): Promise<IgtTransferRow[]> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];

    if (params.isAll) {
      whereClauses.push('a.id != 0');
    } else if (params.dateFrom && params.dateTo) {
      whereClauses.push('date(a.created_date) between ? AND ?');
      values.push(params.dateFrom, params.dateTo);
    } else {
      whereClauses.push('a.id != 0');
    }

    if (params.selectedViewType === 'Active') {
      whereClauses.push('a.active = 1');
    } else if (params.selectedViewType === 'Inactive') {
      whereClauses.push('a.active = 0');
    }

    const sql = `
      select *
      from igt_transfer a
      where ${whereClauses.join(' and ')}
      order by a.created_date DESC
    `;

    return this.mysqlService.query<IgtTransferRow[]>(sql, values);
  }

  async find(igtTransferIdRaw?: string): Promise<IgtTransferRow[]> {
    const id = Number(igtTransferIdRaw);
    if (!Number.isFinite(id) || id <= 0) {
      return [];
    }

    const sql = `
      select *
      from igt_transfer_details
      where igt_transfer_ID = ?
      order by id asc
    `;

    return this.mysqlService.query<IgtTransferRow[]>(sql, [id]);
  }

  async getHeader(idRaw?: string): Promise<IgtTransferRow | null> {
    const id = Number(idRaw);
    if (!Number.isFinite(id) || id <= 0) {
      return null;
    }

    const sql = `
      select *
      from igt_transfer
      where id = ?
      limit 1
    `;

    const rows = await this.mysqlService.query<IgtTransferRow[]>(sql, [id]);
    return rows[0] ?? null;
  }

  async getSoLineDetails(soNumberRaw?: string): Promise<IgtTransferSoLineRow[]> {
    const soNumber = (soNumberRaw || '').trim();
    if (!soNumber) {
      return [];
    }

    const sql = `
      select case when sod_custpart <> '' THEN sod_custpart else a.sod_part END as sod_part
        , a.sod_qty_ord
        , a.sod_qty_ship
        , a.sod_order_category
        , b.pt_desc1
        , b.pt_desc2
        , a.sod_line
        , c.so_rmks
        , c.so_po
        , case when c.so_ship = 'NV.PROTO' THEN 'R200' ELSE 'Z024' END as to_loc
      from sod_det a
      left join (
        select pt_part
          , max(pt_desc1) as pt_desc1
          , max(pt_desc2) as pt_desc2
        from pt_mstr
        where pt_domain = 'EYE'
        group by pt_part
      ) b ON b.pt_part = a.sod_part
      join so_mstr c on c.so_nbr = a.sod_nbr and so_domain = 'EYE' AND so_cust = 'INTGAM'
      where a.sod_nbr = ? and a.sod_qty_ord > 0 and sod_domain = 'EYE'
      order by a.sod_line ASC
    `;

    return this.qadOdbcService.queryWithParams<IgtTransferSoLineRow[]>(sql, [soNumber]);
  }

  async automatedIgtTransfer(idRaw?: string, payload?: unknown): Promise<{ ok: true }> {
    const id = Number(idRaw);
    if (!Number.isFinite(id) || id <= 0) {
      throw new BadRequestException('Invalid transfer id');
    }

    const data = (payload || {}) as AutomatedIgtTransferPayload;
    const payloadMain = data.main || {};
    const pickNonEmpty = (...values: unknown[]): string => {
      for (const value of values) {
        if (typeof value === 'string') {
          const normalized = value.trim();
          if (normalized) {
            return normalized;
          }
        }
      }

      return '';
    };

    const main: AutomatedIgtTransferMain = {
      ...payloadMain,
      transfer_reference: pickNonEmpty(payloadMain.transfer_reference),
      transfer_reference_description: pickNonEmpty(payloadMain.transfer_reference_description),
      to_location: pickNonEmpty(payloadMain.to_location),
    };
    const details = Array.isArray(data.details) ? data.details : [];

    if (!main.transfer_reference || !main.to_location) {
      throw new BadRequestException('Missing required transfer header fields');
    }

    const recipients = await this.resolveRecipients(main.to_location);
    if (recipients.to.length === 0) {
      throw new BadRequestException(
        `No recipient email configured for to_location ${main.to_location}`,
      );
    }

    const soDueRows = await this.getSoDueRows(main.so_number, details);

    const serialNumbers = details
      .map((row) => (row.serial_numbers || '').trim())
      .filter((sn) => sn && sn.toUpperCase() !== 'NA');

    const slug = this.slugify(main.transfer_reference_description);
    const serialSuffix = serialNumbers.length > 0 ? ` SN# ${serialNumbers.join(', ')}` : '';
    const subject = `${main.transfer_reference} - ${slug}${serialSuffix}`;

    const normalizedToLocation = (main.to_location || '').toUpperCase();
    const signatureImageUrl =
      this.configService.get<string>('MAIL_SIGNATURE_IMAGE_URL') ||
      'https://dashboard.eye-fi.com/test/signatures/Picture1.png';
    const editUrl = this.urlBuilder.operations.igtTransferEdit(id);

    const body = this.emailTemplateService.render('igt-transfer', {
      isReno: normalizedToLocation === 'R200',
      hasSoDueRows: soDueRows.length > 0,
      soDueRows,
      signatureImageUrl,
      editUrl,
    });
    const pdfBuffer = await this.generateTransferPdfBuffer(main, details, data.printedName);

    await this.emailService.sendMail({
      to: recipients.to,
      cc: recipients.cc.length > 0 ? recipients.cc : undefined,
      subject,
      html: body,
      attachments: [
        {
          filename: `${subject}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    await this.mysqlService.execute(
      `
        update igt_transfer
        set email_sent_datetime = ?,
            email_sent_created_by_name = ?
        where id = ?
      `,
      [
        main.email_sent_datetime || new Date().toISOString().slice(0, 19).replace('T', ' '),
        main.email_sent_created_by_name || data.printedName || '',
        id,
      ],
    );

    return { ok: true };
  }

  private async resolveRecipients(toLocation: string): Promise<{ to: string[]; cc: string[] }> {
    const normalized = (toLocation || '').toUpperCase();
    const toKey = this.getNoticeKeyForLocation(normalized);
    if (!toKey) {
      return { to: [], cc: [] };
    }

    const to = await this.emailNotificationsService.getRecipients(toKey);

    return { to, cc: [] };
  }

  private getNoticeKeyForLocation(toLocation: string): EmailNotificationAccessValue | null {
    const normalized = (toLocation || '').toUpperCase();
    if (normalized === 'R200') {
      return 'igt_transfer_location_R200';
    }

    if (normalized === 'Z024') {
      return 'igt_transfer_location_Z024';
    }

    return null;
  }

  private slugify(value?: string): string {
    return (value || '')
      .toLowerCase()
      .replace(/[\W\s/]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async getSoDueRows(
    soNumber?: string,
    details: AutomatedIgtTransferDetail[] = [],
  ): Promise<Array<{ so_number: string; so_line: string; due_date: string }>> {
    const parsedSo = this.parseSoReference(soNumber);
    const sourceSo = parsedSo.soNumber;
    if (!sourceSo) {
      return [];
    }

    const detailLines = Array.from(
      new Set(
        details
          .map((row) => String(row.so_line || '').trim())
          .filter(Boolean),
      ),
    );
    const uniqueLines =
      detailLines.length > 0
        ? detailLines
        : parsedSo.lineHint
          ? [parsedSo.lineHint]
          : [];

    if (uniqueLines.length === 0) {
      return [];
    }

    const rows: Array<{ so_number: string; so_line: string; due_date: string }> = [];
    for (const soLine of uniqueLines) {
      const query = `
        SELECT sod_due_date
        FROM sod_det
        WHERE sod_nbr = ?
          AND sod_line = ?
          AND sod_domain = 'EYE'
      `;

      const dueDateRows = await this.qadOdbcService.queryWithParams<SoDueDateRow[]>(query, [
        sourceSo,
        soLine,
      ]);

      const due = dueDateRows[0]?.sod_due_date;
      rows.push({
        so_number: sourceSo,
        so_line: soLine,
        due_date: due ? String(due).slice(0, 10) : 'N/A',
      });
    }

    return rows;
  }

  private async generateTransferPdfBuffer(
    main: AutomatedIgtTransferMain,
    details: AutomatedIgtTransferDetail[],
    printedName?: string,
  ): Promise<Buffer> {
    const logoBuffer = await this.tryLoadIgtLogoBuffer();

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error: Error) => reject(error));

      const transferDate = this.formatDateYmd(main.email_sent_datetime) || this.formatDateYmd();

      const leftX = 55;
      const rightX = doc.page.width - 55;
      const topY = 20;
      const rightBlockWidth = 320;
      const rightBlockX = rightX - rightBlockWidth;
      const contentWidth = rightX - leftX;

      let logoRendered = false;
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, leftX, topY, { width: 95 });
          logoRendered = true;
        } catch {
          logoRendered = false;
        }
      }

      if (!logoRendered) {
        doc.font('Helvetica-Bold').fontSize(26).fillColor('#1b5fa7').text('IGT', leftX, topY + 6);
        doc.fillColor('#000000');
      }

      doc.font('Helvetica-Bold').fontSize(13).text('PRODUCT TRANSFER FORM', rightBlockX, topY + 2, {
        width: rightBlockWidth,
        align: 'right',
      });
      doc.font('Helvetica').fontSize(9).text(`IGT Internal transaction: 311 to ${main.to_location || ''}`, rightBlockX, topY + 22, {
        width: rightBlockWidth,
        align: 'right',
      });

      doc.moveTo(leftX, topY + 52).lineTo(rightX, topY + 52).lineWidth(0.8).stroke('#9a9a9a');
      doc.fillColor('#000000').lineWidth(1);

      const infoY = topY + 68;
      const labelWidth = 118;
      doc.font('Helvetica-Bold').fontSize(10).text('Transfer Reference:', leftX, infoY, {
        width: labelWidth,
      });
      doc.font('Helvetica').fontSize(10).text(main.transfer_reference || '', leftX + labelWidth, infoY, {
        width: contentWidth - labelWidth - 220,
      });

      doc.font('Helvetica-Bold').fontSize(10).text('Description:', leftX, infoY + 20, {
        width: labelWidth,
      });
      doc.font('Helvetica').fontSize(10).text(main.transfer_reference_description || '', leftX + labelWidth, infoY + 20, {
        width: contentWidth - labelWidth - 220,
      });

      doc.font('Helvetica-Bold').fontSize(10).text('Date:', rightBlockX + 130, infoY, { width: 35 });
      doc.font('Helvetica').fontSize(10).text(transferDate, rightBlockX + 165, infoY, {
        width: rightBlockWidth - 165,
        align: 'left',
      });

      const headers = ['Part #', 'Description', 'Qty', 'From/Loc', 'To/Loc', 'Pallet #', 'S/N'];
      const baseWidths = [185, 335, 48, 68, 68, 102, 135];
      const tableLeftMargin = leftX;
      const tableRightMargin = doc.page.width - rightX;
      const availableWidth = doc.page.width - tableLeftMargin - tableRightMargin;
      const baseWidthTotal = baseWidths.reduce((sum, width) => sum + width, 0);
      const scale = availableWidth / baseWidthTotal;
      const widths = baseWidths.map((width) => Math.max(44, Math.floor(width * scale)));
      const usedWidth = widths.slice(0, widths.length - 1).reduce((sum, width) => sum + width, 0);
      widths[widths.length - 1] = Math.max(44, Math.floor(availableWidth - usedWidth));
      const headerHeight = 19;
      const minRowHeight = 18;
      const cellPaddingX = 4;
      const cellPaddingY = 4;
      const startX = tableLeftMargin;
      let y = 144;

      const drawTableHeader = () => {
        let x = startX;
        doc.font('Helvetica-Bold').fontSize(8.5);
        for (let i = 0; i < headers.length; i++) {
          doc.rect(x, y, widths[i], headerHeight).fillAndStroke('#f1f3f6', '#2d2d2d');
          doc.fillColor('#000000').text(headers[i], x + cellPaddingX, y + 5, {
            width: widths[i] - cellPaddingX * 2,
            ellipsis: true,
          });
          x += widths[i];
        }
        y += headerHeight;
      };

      drawTableHeader();

      doc.font('Helvetica').fontSize(8.5);
      for (const row of details) {
        const values = [
          row.part_number || '',
          row.description || '',
          String(row.qty ?? ''),
          main.from_location || '',
          main.to_location || '',
          String(row.pallet_count ?? ''),
          row.serial_numbers || '',
        ];

        const contentHeight = values.reduce((maxHeight, value, index) => {
          const cellHeight = doc.heightOfString(value, {
            width: widths[index] - cellPaddingX * 2,
            align: 'left',
          });
          return Math.max(maxHeight, cellHeight);
        }, 0);

        const rowHeight = Math.max(minRowHeight, Math.ceil(contentHeight + cellPaddingY * 2));
        

        if (y + rowHeight > doc.page.height - 130) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 28 });
          y = 48;
          drawTableHeader();
          doc.font('Helvetica').fontSize(8.5);
        }

        let x = startX;
        for (let i = 0; i < values.length; i++) {
          doc.rect(x, y, widths[i], rowHeight).stroke();
          doc.text(values[i], x + cellPaddingX, y + cellPaddingY, {
            width: widths[i] - cellPaddingX * 2,
            height: rowHeight - cellPaddingY * 2,
          });
          x += widths[i];
        }
        y += rowHeight;
      }

      if (y + 128 > doc.page.height - 32) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 28 });
        y = 56;
      }

      const signOffY = y + 24;
      const signOffWidth = contentWidth;
      const signOffHeight = 96;
      const signAreaWidth = Math.floor(signOffWidth * 0.54);
      const rightSectionX = leftX + signAreaWidth + 34;
      const rightSectionMaxX = leftX + signOffWidth - 22;
      const fieldLabelWidth = 82;
      const rawFieldLineWidth = rightSectionMaxX - (rightSectionX + fieldLabelWidth);
      const fieldLineWidth = Math.max(96, Math.min(158, rawFieldLineWidth));
      const signatureLabelY = signOffY + 30;
      const signatureLineY = signOffY + 70;
      const signatureTextY = signatureLineY - 20;
      const signatureValue = (printedName || 'Authorized User').trim();

      doc
        .roundedRect(leftX, signOffY, signOffWidth, signOffHeight, 6)
        .fillAndStroke('#f7f9fc', '#8ea3b5');

      doc.fillColor('#1e3a5f').font('Helvetica-Bold').fontSize(9).text('AUTHORIZED SIGN-OFF', leftX + 12, signOffY + 9);
      doc.moveTo(leftX + 12, signOffY + 23).lineTo(leftX + signOffWidth - 12, signOffY + 23).lineWidth(0.6).stroke('#b8c5d3');

      doc.fillColor('#000000').font('Helvetica').fontSize(10).text('Eyefi Signature', leftX + 14, signatureLabelY);
      doc.moveTo(leftX + 14, signatureLineY).lineTo(leftX + signAreaWidth - 8, signatureLineY).lineWidth(0.9).stroke('#6f6f6f');

      doc.fillColor('#163a70').font('Times-Italic').fontSize(15).text(signatureValue, leftX + 20, signatureTextY, {
        width: signAreaWidth - 30,
        characterSpacing: 0.15,
      });

      doc.fillColor('#64748b').font('Helvetica-Oblique').fontSize(8).text('Electronically signed and timestamped', leftX + 14, signatureLineY + 8);

      const printNameY = signOffY + 40;
      const dateY = signOffY + 65;

      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9).text('Print Name', rightSectionX, printNameY, {
        width: fieldLabelWidth,
      });
      doc.moveTo(rightSectionX + fieldLabelWidth, printNameY + 11).lineTo(rightSectionX + fieldLabelWidth + fieldLineWidth, printNameY + 11).lineWidth(0.8).stroke('#6f6f6f');
      doc.font('Helvetica').fontSize(9).text(signatureValue, rightSectionX + fieldLabelWidth + 4, printNameY + 2, {
        width: fieldLineWidth - 8,
      });

      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9).text('Date', rightSectionX, dateY, {
        width: fieldLabelWidth,
      });
      doc.moveTo(rightSectionX + fieldLabelWidth, dateY + 11).lineTo(rightSectionX + fieldLabelWidth + fieldLineWidth, dateY + 11).lineWidth(0.8).stroke('#6f6f6f');
      doc.font('Helvetica').fontSize(9).text(transferDate, rightSectionX + fieldLabelWidth + 4, dateY + 2, {
        width: fieldLineWidth - 8,
      });

      doc.end();
    });
  }

  private async tryLoadIgtLogoBuffer(): Promise<Buffer | null> {
    const logoUrl = process.env.IGT_TRANSFER_LOGO_URL || 'https://dashboard.eye-fi.com/attachments/igt.png';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(logoUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  }

  private formatDateYmd(value?: string): string {
    if (!value) {
      return new Date().toISOString().slice(0, 10);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value).slice(0, 10);
    }

    return date.toISOString().slice(0, 10);
  }

  private parseSoReference(soRef?: string): { soNumber: string; lineHint: string | null } {
    const normalized = (soRef || '').trim();
    if (!normalized) {
      return { soNumber: '', lineHint: null };
    }

    const match = normalized.match(/^(.+)-(\d+)$/);
    if (!match) {
      return { soNumber: normalized, lineHint: null };
    }

    return {
      soNumber: match[1].trim(),
      lineHint: match[2].trim(),
    };
  }
}