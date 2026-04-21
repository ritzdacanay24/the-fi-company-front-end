import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateSafetyIncidentDto, UpdateSafetyIncidentDto } from './dto';
import { SafetyIncidentRecord, SafetyIncidentRepository } from './safety-incident.repository';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { UrlBuilder } from '@/shared/url/url-builder';

@Injectable()
export class SafetyIncidentService {
  private readonly logger = new Logger(SafetyIncidentService.name);

  constructor(
    private readonly safetyIncidentRepository: SafetyIncidentRepository,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly urlBuilder: UrlBuilder,
  ) {}

  async getList(params: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll?: boolean;
  }): Promise<SafetyIncidentRecord[]> {
    return this.safetyIncidentRepository.getList(params);
  }

  async getAll(): Promise<SafetyIncidentRecord[]> {
    return this.safetyIncidentRepository.getAll();
  }

  async getById(id: number): Promise<SafetyIncidentRecord> {
    const safetyIncident = await this.safetyIncidentRepository.getById(id);

    if (!safetyIncident) {
      throw new NotFoundException({
        code: 'RC_SAFETY_INCIDENT_NOT_FOUND',
        message: `Safety incident with id ${id} not found`,
      });
    }

    return safetyIncident;
  }

  async find(filters: Record<string, unknown>): Promise<SafetyIncidentRecord[]> {
    return this.safetyIncidentRepository.findMany(filters);
  }

  async findOne(filters: Record<string, unknown>): Promise<SafetyIncidentRecord> {
    const safetyIncident = await this.safetyIncidentRepository.findSingle(filters);

    if (!safetyIncident) {
      throw new NotFoundException({
        code: 'RC_SAFETY_INCIDENT_NOT_FOUND',
        message: 'No safety incident found for given filters',
      });
    }

    return safetyIncident;
  }

  async create(dto: CreateSafetyIncidentDto): Promise<SafetyIncidentRecord> {
    const insertId = await this.safetyIncidentRepository.createIncident(
      dto as Record<string, unknown>,
    );

    await this.sendCreateNotification(insertId);

    const created = await this.safetyIncidentRepository.getById(insertId);

    if (!created) {
      throw new NotFoundException({
        code: 'RC_SAFETY_INCIDENT_NOT_FOUND',
        message: `Created safety incident with id ${insertId} was not found`,
      });
    }

    return created;
  }

  private async sendCreateNotification(insertId: number): Promise<void> {
    try {
      const recipients = await this.safetyIncidentRepository.getCreateNotificationRecipients();
      if (recipients.length === 0) {
        this.logger.warn('No active safety incident recipients configured in safety_incident_config');
        return;
      }

      const link = this.urlBuilder.operations.safetyIncidentEdit(insertId);
      const html = this.emailTemplateService.render('safety-incident-created', {
        insertId,
        link,
      });

      await this.emailService.sendMail({
        to: recipients,
        subject: `Safety Incident - ${insertId}`,
        html,
      });
    } catch (error) {
      this.logger.warn(
        `Safety incident notification email failed for id ${insertId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async updateById(id: number, dto: UpdateSafetyIncidentDto): Promise<SafetyIncidentRecord> {
    const existing = await this.safetyIncidentRepository.getById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'RC_SAFETY_INCIDENT_NOT_FOUND',
        message: `Safety incident with id ${id} not found`,
      });
    }

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException({
        code: 'RC_SAFETY_INCIDENT_EMPTY_UPDATE',
        message: 'No fields provided for update',
      });
    }

    const affectedRows = await this.safetyIncidentRepository.updateIncidentById(
      id,
      dto as Record<string, unknown>,
    );

    if (affectedRows === 0) {
      throw new BadRequestException({
        code: 'RC_SAFETY_INCIDENT_EMPTY_UPDATE',
        message: 'No valid fields provided for update',
      });
    }

    return this.getById(id);
  }

  async deleteById(id: number): Promise<{ success: true; id: number }> {
    const existing = await this.safetyIncidentRepository.getById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'RC_SAFETY_INCIDENT_NOT_FOUND',
        message: `Safety incident with id ${id} not found`,
      });
    }

    await this.safetyIncidentRepository.deleteIncidentById(id);
    return { success: true, id };
  }
}
