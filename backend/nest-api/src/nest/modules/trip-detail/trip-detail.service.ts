import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

    const techRows = techNames
      .map((name, idx) => `<tr><td>Tech #${idx + 1}</td><td>${name}</td></tr>`)
      .join('');

    const jobRows = jobs
      .map((job) => {
        const jobFsId = String(job.fsId || '');
        const customer = String(job.customer || '');
        const serviceType = String(job.service_type || '');
        const requestDate = String(job.request_date || '');
        const startTime = String(job.start_time || '');
        const property = String(job.property || '');
        const address = [job.job_address_1, job.job_address_2, job.job_city, job.job_state, job.job_zip_code]
          .filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
          .join(' ');

        return `<tr>
          <td>${jobFsId}</td>
          <td>${customer}</td>
          <td>${serviceType}</td>
          <td>${requestDate} ${startTime}</td>
          <td>${property}</td>
          <td>${address}</td>
        </tr>`;
      })
      .join('');

    const detailRows = details
      .map((row) => {
        const type = String(row.type_of_travel || '');
        const itemFsId = String(row.fsId || '');
        const addressName = String(row.address_name || '');
        const start = String(row.start_datetime || '');
        const end = String(row.end_datetime || '');
        const confirmation = String(row.confirmation || '');
        const notes = String(row.notes || '');

        return `<tr>
          <td>${type}</td>
          <td>${itemFsId}</td>
          <td>${addressName}</td>
          <td>${start}</td>
          <td>${end}</td>
          <td>${confirmation}</td>
          <td>${notes}</td>
        </tr>`;
      })
      .join('');

    return `
      <html>
        <body>
          <h3>Service Team Travel & Job Itinerary #${fsId}</h3>
          <h4>Team</h4>
          <table border="1" cellpadding="6" cellspacing="0">
            <tbody>${techRows || '<tr><td colspan="2">No assigned techs</td></tr>'}</tbody>
          </table>

          <h4>Jobs</h4>
          <table border="1" cellpadding="6" cellspacing="0">
            <thead>
              <tr>
                <th>FSID</th>
                <th>Customer</th>
                <th>Service Type</th>
                <th>Date/Time</th>
                <th>Property</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>${jobRows || '<tr><td colspan="6">No jobs found</td></tr>'}</tbody>
          </table>

          <h4>Trip Details</h4>
          <table border="1" cellpadding="6" cellspacing="0">
            <thead>
              <tr>
                <th>Type</th>
                <th>FSID</th>
                <th>Name</th>
                <th>Start</th>
                <th>End</th>
                <th>Confirmation</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>${detailRows}</tbody>
          </table>
        </body>
      </html>
    `;
  }
}
