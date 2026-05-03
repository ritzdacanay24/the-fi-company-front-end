import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { EmailService } from '@/shared/email/email.service';
import { TripDetailRepository } from './trip-detail.repository';

@Injectable()
export class TripDetailService {
  constructor(
    private readonly repository: TripDetailRepository,
    private readonly emailService: EmailService,
  ) {}

  async getAll() {
    return this.repository.getAll();
  }

  async find(query: Record<string, unknown>) {
    return this.repository.find(query);
  }

  async getById(id: number) {
    return this.repository.getById(id);
  }

  async create(payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const insertId = await this.repository.create(sanitized);
    const created = await this.repository.getById(insertId);
    if (!created) {
      throw new NotFoundException('Trip detail not found after create');
    }

    return created;
  }

  async update(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    await this.repository.update(id, sanitized);
    return this.repository.getById(id);
  }

  async delete(id: number) {
    await this.repository.delete(id);
    return { success: true };
  }

  async findByFsId(id: number) {
    return this.repository.findByFsId(id);
  }

  async findByGroupFsId(id: number) {
    return this.repository.findByGroupFsId(id);
  }

  async emailTripDetails(fsId: number, _payload?: Record<string, unknown>) {
    const tripDetails = await this.repository.getEmailTripDetails(fsId);
    if (!tripDetails.length) {
      return [];
    }

    const recipients = await this.repository.getEmailRecipients(fsId);
    const emails = String(recipients?.emails || '')
      .split(',')
      .map((email) => email.trim())
      .filter((email) => !!email);

    if (emails.length) {
      const jobs = await this.repository.getEmailJobs(fsId);
      const html = this.buildEmailHtml(fsId, recipients?.names || '', jobs, tripDetails);
      const itineraryPdf = await this.generateItineraryPdf(
        fsId,
        recipients?.names || '',
        jobs,
        tripDetails,
      );

      await this.emailService.sendMail({
        to: emails,
        cc: [
          'ritz.dacanay@the-fi-company.com',
          'adriann.k@the-fi-company.com',
          'juvenal.torres@the-fi-company.com',
          'heidi.elya@the-fi-company.com',
        ],
        subject: `Trip Itinerary for Group # ${fsId}`,
        html,
        attachments: [
          {
            filename: `trip-itinerary-group-${fsId}.pdf`,
            content: itineraryPdf,
            contentType: 'application/pdf',
          },
        ],
      });
    }

    await this.repository.markEmailSent(fsId);
    return tripDetails;
  }

  private buildEmailHtml(
    fsId: number,
    namesCsv: string,
    jobs: Array<Record<string, unknown>>,
    details: Array<Record<string, unknown>>,
  ): string {
    const techNames = String(namesCsv || '')
      .split(',')
      .map((name) => name.trim())
      .filter((name) => !!name);
    const teamSummary = techNames.length ? techNames.join(', ') : 'No assigned technicians';
    const jobsCount = jobs.length;
    const detailsCount = details.length;

    return `
      <html>
        <body>
          <h3>Trip Itinerary #${fsId}</h3>
          <p>The professional itinerary is attached as a PDF for your trip planning and execution.</p>
          <p><strong>Team:</strong> ${teamSummary}</p>
          <p><strong>Summary:</strong> ${jobsCount} job(s), ${detailsCount} itinerary item(s)</p>
          <p>Please review the attachment for full schedule, addresses, confirmations, and travel notes.</p>
        </body>
      </html>
    `;
  }

  private async generateItineraryPdf(
    fsId: number,
    namesCsv: string,
    jobs: Array<Record<string, unknown>>,
    details: Array<Record<string, unknown>>,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error: Error) => reject(error));

      const pageWidth = doc.page.width;
      const left = 28;
      const right = pageWidth - 28;
      const bottom = doc.page.height - 28;
      const contentWidth = right - left;

      doc.font('Helvetica-Bold').fontSize(18).text('Field Service Trip Itinerary', left, 36);
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#444444')
        .text(`Group # ${fsId}`, left, 58)
        .text(`Generated: ${new Date().toLocaleString()}`, left + 110, 58)
        .fillColor('#000000');

      let y = 86;

      const ensureSpace = (neededHeight: number): void => {
        if (y + neededHeight > bottom) {
          doc.addPage();
          y = 40;
        }
      };

      const writeSectionHeader = (title: string): void => {
        ensureSpace(24);
        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .fillColor('#0b4f8a')
          .text(title, left, y)
          .fillColor('#000000');
        y = doc.y + 8;
      };

      const normalize = (value: unknown): string => {
        const text = String(value ?? '').trim();
        return text || '-';
      };

      const drawTable = (headers: string[], widths: number[], rows: string[][]): void => {
        const cellPaddingX = 5;
        const cellPaddingY = 4;
        const minRowHeight = 18;

        const drawHeaderRow = (): number => {
          doc.font('Helvetica-Bold').fontSize(9);
          const headerHeight = headers.reduce((maxHeight, headerText, idx) => {
            const textHeight = doc.heightOfString(headerText, {
              width: widths[idx] - cellPaddingX * 2,
              align: 'left',
            });
            return Math.max(maxHeight, Math.max(minRowHeight, textHeight + cellPaddingY * 2));
          }, minRowHeight);

          let x = left;
          headers.forEach((headerText, idx) => {
            doc
              .rect(x, y, widths[idx], headerHeight)
              .fillAndStroke('#e8effa', '#c8d6ef');

            doc
              .fillColor('#1c3f72')
              .text(headerText, x + cellPaddingX, y + cellPaddingY, {
                width: widths[idx] - cellPaddingX * 2,
                align: 'left',
              })
              .fillColor('#000000');
            x += widths[idx];
          });

          y += headerHeight;
          return headerHeight;
        };

        ensureSpace(40);
        drawHeaderRow();

        doc.font('Helvetica').fontSize(9);
        rows.forEach((row, rowIndex) => {
          const rowHeight = row.reduce((maxHeight, cellText, idx) => {
            const textHeight = doc.heightOfString(cellText, {
              width: widths[idx] - cellPaddingX * 2,
              align: 'left',
            });
            return Math.max(maxHeight, Math.max(minRowHeight, textHeight + cellPaddingY * 2));
          }, minRowHeight);

          if (y + rowHeight > bottom) {
            doc.addPage();
            y = 40;
            drawHeaderRow();
            doc.font('Helvetica').fontSize(9);
          }

          let x = left;
          row.forEach((cellText, idx) => {
            const fill = rowIndex % 2 === 0 ? '#ffffff' : '#f8fbff';
            doc.rect(x, y, widths[idx], rowHeight).fillAndStroke(fill, '#d8e1ee');

            doc
              .fillColor('#1d2736')
              .text(cellText, x + cellPaddingX, y + cellPaddingY, {
                width: widths[idx] - cellPaddingX * 2,
                align: 'left',
              })
              .fillColor('#000000');
            x += widths[idx];
          });

          y += rowHeight;
        });
      };

      const techNames = String(namesCsv || '')
        .split(',')
        .map((name) => name.trim())
        .filter((name) => !!name);

      writeSectionHeader('Assigned Technicians');
      const techRows = techNames.length
        ? techNames.map((name, idx) => [String(idx + 1), normalize(name)])
        : [['-', 'No assigned technicians']];
      drawTable(['#', 'Technician'], [56, contentWidth - 56], techRows);

      y += 4;
      writeSectionHeader('Jobs');
      const jobsRows = jobs.length
        ? jobs.map((job) => {
          const address = [job.job_address_1, job.job_address_2, job.job_city, job.job_state, job.job_zip_code]
            .filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
            .join(' ');
          const dateTime = `${String(job.request_date || '').trim()} ${String(job.start_time || '').trim()}`.trim();

          return [
            normalize(job.fsId),
            normalize(job.customer),
            normalize(job.service_type),
            normalize(dateTime),
            normalize(job.property),
            normalize(address),
          ];
        })
        : [['-', 'No jobs found', '-', '-', '-', '-']];

      drawTable(
        ['FSID', 'Customer', 'Service Type', 'Date/Time', 'Property', 'Address'],
        [56, 120, 96, 104, 100, contentWidth - 476],
        jobsRows,
      );

      y += 4;
      writeSectionHeader('Trip Details');
      const detailRows = details.length
        ? details.map((row) => [
          normalize(row.type_of_travel),
          normalize(row.fsId),
          normalize(row.address_name),
          normalize(row.start_datetime),
          normalize(row.end_datetime),
          normalize(row.confirmation),
          normalize(row.notes),
        ])
        : [['-', '-', 'No trip details found', '-', '-', '-', '-']];

      drawTable(
        ['Type', 'FSID', 'Name', 'Start', 'End', 'Confirmation', 'Notes'],
        [74, 56, 120, 88, 88, 90, contentWidth - 516],
        detailRows,
      );

      doc.end();
    });
  }
}
