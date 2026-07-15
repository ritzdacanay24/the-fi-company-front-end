import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { TripDetailRepository } from './trip-detail.repository';

@Injectable()
export class TripDetailService {
  constructor(
    private readonly repository: TripDetailRepository,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
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

    return this.emailTemplateService.render('trip-itinerary', {
      fsId,
      teamSummary,
      jobsCount,
      detailsCount,
    });
  }

  private async generateItineraryPdf(
    fsId: number,
    namesCsv: string,
    jobs: Array<Record<string, unknown>>,
    details: Array<Record<string, unknown>>,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28, bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error: Error) => reject(error));

      const pageWidth = doc.page.width;
      const left = 28;
      const right = pageWidth - 28;
      const bottom = doc.page.height - 28;
      const contentWidth = right - left;
      const generatedAt = new Date();

      const toTitleCase = (value: unknown): string =>
        String(value ?? '')
          .trim()
          .replace(/[_-]+/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

      const formatDateTime = (value: unknown): string => {
        const raw = String(value ?? '').trim();
        if (!raw) {
          return '-';
        }

        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
        }

        return raw;
      };

      doc.rect(left, 28, contentWidth, 42).fill('#0b4f8a');
      doc
        .font('Helvetica-Bold')
        .fontSize(17)
        .fillColor('#ffffff')
        .text('Field Service Trip Itinerary', left + 12, 41)
        .fillColor('#000000');

      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#444444')
        .text(`Group # ${fsId}`, left, 78)
        .text(`Generated: ${generatedAt.toLocaleString()}`, left + 110, 78)
        .text(`Jobs: ${jobs.length}`, left + 350, 78)
        .text(`Stops: ${details.length}`, left + 430, 78)
        .fillColor('#000000');

      let y = 104;

      const ensureSpace = (neededHeight: number): void => {
        if (y + neededHeight > bottom) {
          doc.addPage();
          y = 40;
        }
      };

      const writeSectionHeader = (title: string): void => {
        ensureSpace(32);
        doc.moveTo(left, y - 2).lineTo(right, y - 2).strokeColor('#d6e0ef').stroke();
        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .fillColor('#0b4f8a')
          .text(title, left, y)
          .fillColor('#000000');
        y = doc.y + 12;
      };

      const normalize = (value: unknown): string => {
        const text = String(value ?? '').trim();
        return text || '-';
      };

      const normalizeNotes = (value: unknown): string => {
        const text = String(value ?? '')
          .normalize('NFKC')
          .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
          .replace(/[\t\v\f\r]+/g, ' ')
          .replace(/[“”„‟]/g, '')
          .replace(/[‘’‚‛]/g, '')
          .replace(/[•·]/g, '\n')
          .replace(/\r?\n/g, '\n')
          .replace(/\s*\n\s*/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        if (!text) {
          return '-';
        }

        return text
          .split('\n')
          .map((line) => line.replace(/\s+/g, ' ').trim())
          .filter((line) => !!line)
          .join('\n');
      };

      const joinAddress = (...parts: unknown[]): string => {
        const values = parts
          .map((part) => String(part ?? '').trim())
          .filter((part) => !!part);
        return values.length ? values.join(', ') : '-';
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
              .fillAndStroke('#e2ecfb', '#b9cae7');

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

      const drawTripDetailsWithAdvanced = (rowsData: Array<Record<string, unknown>>): void => {
        const headers = ['Type', 'FSID', 'Name', 'Start', 'End', 'Confirmation', 'Notes'];
        const widths = [70, 52, 104, 96, 96, 76, contentWidth - 494];
        const cellPaddingX = 5;
        const cellPaddingY = 4;
        const minRowHeight = 18;
        const subCellPaddingX = 4;
        const subCellPaddingY = 2;
        const subLeft = left + 10;
        const subWidth = contentWidth - 20;
        const subBoxPaddingX = 6;
        const subBoxPaddingY = 4;
        const detailLabelWidth = 110;
        const detailValueWidth = subWidth - subBoxPaddingX * 2 - detailLabelWidth;

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
              .fillAndStroke('#e2ecfb', '#b9cae7');

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

        rowsData.forEach((row, rowIndex) => {
          const basicRow = [
            normalize(toTitleCase(row.type_of_travel)),
            normalize(row.fsId),
            normalize(row.address_name),
            formatDateTime(row.start_datetime),
            formatDateTime(row.end_datetime),
            normalize(row.confirmation),
            normalizeNotes(row.notes),
          ];

          const travelType = String(row.type_of_travel ?? '').trim().toLowerCase();
          const hasValue = (value: unknown): boolean => {
            const text = String(value ?? '').trim();
            return !!text && text !== '-';
          };

          const locationLabel = normalize(row.location_name);
          const fullLocation = joinAddress(
            row.address_name,
            row.address,
            row.address1,
            row.city,
            row.state,
            row.zip_code,
          );
          const flightOut = normalize(row.flight_out);
          const flightIn = normalize(row.flight_in);
          const rentalDriver = normalize(row.rental_car_driver);

          const detailRows: string[][] = [];

          if (hasValue(locationLabel)) {
            detailRows.push(['Location Label', locationLabel]);
          }

          if (hasValue(fullLocation)) {
            detailRows.push(['Full Location', fullLocation]);
          }

          const isFlightType = /flight|air/.test(travelType);
          if (isFlightType || hasValue(flightOut) || hasValue(flightIn)) {
            detailRows.push(['Flight Out', flightOut]);
            detailRows.push(['Flight In', flightIn]);
          }

          const isRentalType = /rental/.test(travelType);
          if (isRentalType || hasValue(rentalDriver)) {
            detailRows.push(['Rental Driver', rentalDriver]);
          }

          if (!detailRows.length) {
            detailRows.push(['Details', '-']);
          }

          doc.font('Helvetica').fontSize(9);
          const basicRowHeight = basicRow.reduce((maxHeight, cellText, idx) => {
            const textHeight = doc.heightOfString(cellText, {
              width: widths[idx] - cellPaddingX * 2,
              align: 'left',
            });
            return Math.max(maxHeight, Math.max(minRowHeight, textHeight + cellPaddingY * 2));
          }, minRowHeight);

          doc.font('Helvetica').fontSize(7);
          const detailRowHeights = detailRows.map(([labelText, valueText]) => {
            const labelHeight = doc.heightOfString(labelText, {
              width: detailLabelWidth - subCellPaddingX * 2,
              align: 'left',
            });
            const valueHeight = doc.heightOfString(valueText, {
              width: detailValueWidth - subCellPaddingX * 2,
              align: 'left',
            });
            return Math.max(12, Math.max(labelHeight, valueHeight) + subCellPaddingY * 2);
          });

          const advancedBlockHeight = detailRowHeights.reduce((sum, rowHeight) => sum + rowHeight, 0);
          const groupBlockHeight = basicRowHeight + advancedBlockHeight + subBoxPaddingY * 2;

          if (y + groupBlockHeight > bottom) {
            doc.addPage();
            y = 40;
            drawHeaderRow();
          }

          // Draw one outer border so each trip-detail row and its nested details read as one section.
          doc.rect(left, y, contentWidth, groupBlockHeight).lineWidth(1).strokeColor('#c5d3e8').stroke();

          doc.font('Helvetica').fontSize(9);
          let x = left;
          basicRow.forEach((cellText, idx) => {
            const fill = rowIndex % 2 === 0 ? '#ffffff' : '#f8fbff';
            doc.rect(x, y, widths[idx], basicRowHeight).fillAndStroke(fill, '#d8e1ee');

            doc
              .fillColor('#1d2736')
              .text(cellText, x + cellPaddingX, y + cellPaddingY, {
                width: widths[idx] - cellPaddingX * 2,
                align: 'left',
              })
              .fillColor('#000000');
            x += widths[idx];
          });

          const detailsStartY = y + basicRowHeight;

          doc
            .rect(subLeft, detailsStartY, subWidth, advancedBlockHeight + subBoxPaddingY * 2)
            .fillAndStroke('#f9fbff', '#d8e1ee');

          let subY = detailsStartY + subBoxPaddingY;
          detailRows.forEach(([labelText, valueText], idx) => {
            const rowHeight = detailRowHeights[idx];

            doc
              .rect(subLeft + subBoxPaddingX, subY, detailLabelWidth, rowHeight)
              .fillAndStroke('#f2f6fd', '#d8e1ee');
            doc
              .font('Helvetica-Bold')
              .fontSize(7)
              .fillColor('#4a607f')
              .text(labelText, subLeft + subBoxPaddingX + subCellPaddingX, subY + subCellPaddingY, {
                width: detailLabelWidth - subCellPaddingX * 2,
                align: 'left',
              })
              .fillColor('#000000');

            const valueFill = rowIndex % 2 === 0 ? '#ffffff' : '#f8fbff';
            doc
              .rect(subLeft + subBoxPaddingX + detailLabelWidth, subY, detailValueWidth, rowHeight)
              .fillAndStroke(valueFill, '#d8e1ee');
            doc
              .font('Helvetica')
              .fontSize(7)
              .fillColor('#2a3342')
              .text(valueText, subLeft + subBoxPaddingX + detailLabelWidth + subCellPaddingX, subY + subCellPaddingY, {
                width: detailValueWidth - subCellPaddingX * 2,
                align: 'left',
              })
              .fillColor('#000000');

            subY += rowHeight;
          });

          y += groupBlockHeight;
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

      y += 12;
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
            formatDateTime(dateTime),
            normalize(job.property),
            normalize(address),
          ];
        })
        : [['-', 'No jobs found', '-', '-', '-', '-']];

      drawTable(
        ['FSID', 'Customer', 'Service Type', 'Date/Time', 'Property', 'Address'],
        [52, 108, 86, 124, 94, contentWidth - 464],
        jobsRows,
      );

      y += 12;
      writeSectionHeader('Trip Details');
      if (details.length) {
        drawTripDetailsWithAdvanced(details);
      } else {
        drawTable(
          ['Type', 'FSID', 'Name', 'Start', 'End', 'Confirmation', 'Notes'],
          [70, 52, 104, 96, 96, 76, contentWidth - 494],
          [['-', '-', 'No trip details found', '-', '-', '-', '-']],
        );
      }

      const pageRange = doc.bufferedPageRange();
      for (let i = 0; i < pageRange.count; i += 1) {
        doc.switchToPage(i);
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#6b7280')
          .text(`Page ${i + 1} of ${pageRange.count}`, right - 70, bottom + 4, {
            width: 70,
            align: 'right',
          })
          .fillColor('#000000');
      }

      doc.end();
    });
  }
}
