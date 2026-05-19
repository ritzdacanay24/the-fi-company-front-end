import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AccessControlService } from '../access-control';
import { CreateSafetyIncidentDto, UpdateSafetyIncidentDto } from './dto';
import { SafetyIncidentRecord, SafetyIncidentRepository } from './safety-incident.repository';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { UrlBuilder } from '@/shared/url/url-builder';
import { EmailNotificationsService } from '../email-notifications';

@Injectable()
export class SafetyIncidentService {
  private readonly logger = new Logger(SafetyIncidentService.name);

  private readonly publicIncidentTypeById: Record<string, string> = {
    '1': 'Serious Personnel Injury (Paramedics called)',
    '2': 'Personal Injury requiring 3rd party medical support (e.g. ER or Doctor visit)',
    '3': 'First Aid Incident',
    '4': 'Buildings or Product Damage',
    '5': 'Near miss (personnel or buildings)',
    '6': 'Safety Procedure non-conformance',
    '7': 'Vehicle Incident / Road Traffic Incident',
    '8': 'Other',
  };

  private readonly publicIncidentLocationById: Record<string, string> = {
    '1': 'Las Vegas Facility',
    '2': 'Customer Job Site',
    '3': 'Road Vehicle Incident',
    '4': 'Other',
  };

  private readonly publicLasVegasAreaById: Record<string, string> = {
    '1': 'Production',
    '2': 'Warehouse',
    '3': 'Proto',
    '4': 'Graphics',
    '5': 'Yard',
    '6': 'Office',
    '7': 'Other',
  };

  constructor(
    private readonly safetyIncidentRepository: SafetyIncidentRepository,
    private readonly accessControlService: AccessControlService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly urlBuilder: UrlBuilder,
    private readonly emailNotificationsService: EmailNotificationsService,
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

  async create(dto: CreateSafetyIncidentDto, userId?: number): Promise<SafetyIncidentRecord> {
    const normalizedDto = this.normalizeCreateDto(dto);

    const payload: Record<string, unknown> = {
      ...(normalizedDto as Record<string, unknown>),
      status: dto.status ?? 'Open',
    };

    if (userId && Number.isInteger(userId) && userId > 0) {
      payload.created_by = userId;
    }

    const insertId = await this.safetyIncidentRepository.createIncident(
      payload,
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

  private normalizeCreateDto(dto: CreateSafetyIncidentDto): CreateSafetyIncidentDto {
    const normalized: CreateSafetyIncidentDto = { ...dto };

    const incidentType = String(normalized.type_of_incident ?? '').trim();
    if (incidentType && this.publicIncidentTypeById[incidentType]) {
      normalized.type_of_incident = this.publicIncidentTypeById[incidentType];
    }

    const incidentLocation = String(normalized.location_of_incident ?? '').trim();
    if (incidentLocation && this.publicIncidentLocationById[incidentLocation]) {
      normalized.location_of_incident = this.publicIncidentLocationById[incidentLocation];
    }

    const lasVegasArea = String(normalized.location_of_incident_las_vegas_facility ?? '').trim();
    if (lasVegasArea && this.publicLasVegasAreaById[lasVegasArea]) {
      normalized.location_of_incident_las_vegas_facility = this.publicLasVegasAreaById[lasVegasArea];
    }

    if (
      normalized.location_of_incident === 'Las Vegas Facility' &&
      (!normalized.location_of_incident_other || String(normalized.location_of_incident_other).trim() === '') &&
      normalized.location_of_incident_las_vegas_facility
    ) {
      normalized.location_of_incident_other = normalized.location_of_incident_las_vegas_facility;
    }

    if (normalized.anonymous) {
      normalized.first_name = '';
      normalized.last_name = '';
      normalized.email = '';
      normalized.phone = '';
    }

    return normalized;
  }

  private async sendCreateNotification(insertId: number): Promise<void> {
    try {
      const recipients = await this.emailNotificationsService.getRecipients('safety_incident');
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

  async updateById(
    id: number,
    dto: UpdateSafetyIncidentDto,
    userId: number,
  ): Promise<SafetyIncidentRecord> {
    const existing = await this.safetyIncidentRepository.getById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'RC_SAFETY_INCIDENT_NOT_FOUND',
        message: `Safety incident with id ${id} not found`,
      });
    }

    const sanitizedUpdate = { ...(dto as Record<string, unknown>) };
    delete sanitizedUpdate.created_by;

    await this.assertCanUpdateIncident(userId, existing, sanitizedUpdate);

    if (Object.keys(sanitizedUpdate).length === 0) {
      throw new BadRequestException({
        code: 'RC_SAFETY_INCIDENT_EMPTY_UPDATE',
        message: 'No fields provided for update',
      });
    }

    const affectedRows = await this.safetyIncidentRepository.updateIncidentById(
      id,
      sanitizedUpdate,
    );

    if (affectedRows === 0) {
      throw new BadRequestException({
        code: 'RC_SAFETY_INCIDENT_EMPTY_UPDATE',
        message: 'No valid fields provided for update',
      });
    }

    return this.getById(id);
  }

  async deleteById(id: number, userId: number): Promise<{ success: true; id: number }> {
    const existing = await this.safetyIncidentRepository.getById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'RC_SAFETY_INCIDENT_NOT_FOUND',
        message: `Safety incident with id ${id} not found`,
      });
    }

    await this.assertCanDeleteIncident(userId, existing);

    await this.safetyIncidentRepository.deleteIncidentById(id);
    return { success: true, id };
  }

  async archiveById(id: number, userId: number): Promise<SafetyIncidentRecord> {
    const existing = await this.safetyIncidentRepository.getById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'RC_SAFETY_INCIDENT_NOT_FOUND',
        message: `Safety incident with id ${id} not found`,
      });
    }

    if (existing.archived_at) {
      throw new BadRequestException({
        code: 'RC_SAFETY_INCIDENT_ALREADY_ARCHIVED',
        message: 'Safety incident is already archived',
      });
    }

    // Owner can archive their own; manager/supervisor/admin can archive any
    if (!this.isIncidentOwner(existing, userId) && !(await this.userCanManageAnyIncident(userId))) {
      throw new ForbiddenException({
        code: 'RC_SAFETY_INCIDENT_FORBIDDEN',
        message: 'You cannot archive this safety incident',
      });
    }

    await this.safetyIncidentRepository.archiveIncidentById(id, userId);
    const updated = await this.safetyIncidentRepository.getById(id);
    return updated!;
  }

  async unarchiveById(id: number, userId: number): Promise<SafetyIncidentRecord> {
    const canManage = await this.userCanManageAnyIncident(userId);
    if (!canManage) {
      throw new ForbiddenException({
        code: 'RC_SAFETY_INCIDENT_FORBIDDEN',
        message: 'Only supervisors, managers, or admins can unarchive safety incidents',
      });
    }

    const existing = await this.safetyIncidentRepository.getById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'RC_SAFETY_INCIDENT_NOT_FOUND',
        message: `Safety incident with id ${id} not found`,
      });
    }

    await this.safetyIncidentRepository.unarchiveIncidentById(id);
    const updated = await this.safetyIncidentRepository.getById(id);
    return updated!;
  }

  async getArchived(): Promise<SafetyIncidentRecord[]> {
    return this.safetyIncidentRepository.getArchived();
  }

  private async assertCanUpdateIncident(
    userId: number,
    safetyIncident: SafetyIncidentRecord,
    updatePayload: Record<string, unknown>,
  ): Promise<void> {
    if (await this.userCanManageAnyIncident(userId)) {
      return;
    }

    if (!this.isIncidentOwner(safetyIncident, userId)) {
      throw new ForbiddenException({
        code: 'RC_SAFETY_INCIDENT_FORBIDDEN',
        message: 'You can only update your own safety incidents',
      });
    }

    if (!this.isOwnerEditableStatus(safetyIncident)) {
      throw new ForbiddenException({
        code: 'RC_SAFETY_INCIDENT_LOCKED',
        message: 'This safety incident can no longer be edited by the submitter',
      });
    }

    const nextStatus = this.normalizeStatus(updatePayload.status);
    if (nextStatus && nextStatus !== 'open') {
      throw new ForbiddenException({
        code: 'RC_SAFETY_INCIDENT_STATUS_FORBIDDEN',
        message: 'Only supervisors, managers, or admins can change the incident status',
      });
    }
  }

  private async assertCanDeleteIncident(
    userId: number,
    safetyIncident: SafetyIncidentRecord,
  ): Promise<void> {
    if (this.isIncidentOwner(safetyIncident, userId) && this.isOwnerEditableStatus(safetyIncident)) {
      return;
    }

    const requiredPermission = 'delete';
    const moduleKey = 'safety-incident';
    const mappedModuleDomain = await this.accessControlService.getModuleDomain(moduleKey);
    const requiredDomain = String(mappedModuleDomain || '').trim();

    if (!requiredDomain) {
      throw new ForbiddenException({
        code: 'RC_SAFETY_INCIDENT_DOMAIN_CONFIG_MISSING',
        message: 'Safety Incident module domain is not configured',
        failedCheck: 'permission',
        requiredPermissions: [requiredPermission],
        requiredDomain: null,
        moduleKey,
        configuredModuleDomain: null,
      });
    }

    const canDeleteAcrossDomain = await this.accessControlService.userHasPermissionForDomain(
      userId,
      requiredPermission,
      requiredDomain,
    );

    if (canDeleteAcrossDomain) {
      return;
    }

    throw new ForbiddenException({
      code: 'RC_SAFETY_INCIDENT_DELETE_FORBIDDEN',
      message: 'You cannot delete this safety incident',
      failedCheck: 'permission',
      requiredPermissions: [requiredPermission],
      requiredDomain,
      moduleKey,
      configuredModuleDomain: mappedModuleDomain,
    });
  }

  private async userCanManageAnyIncident(userId: number): Promise<boolean> {
    return this.accessControlService.userHasRoles(userId, ['admin', 'manager', 'supervisor']);
  }

  private isIncidentOwner(safetyIncident: SafetyIncidentRecord, userId: number): boolean {
    return Number(safetyIncident.created_by) === userId;
  }

  private isOwnerEditableStatus(safetyIncident: SafetyIncidentRecord): boolean {
    const status = this.normalizeStatus(safetyIncident.status);
    return status === '' || status === 'open';
  }

  private normalizeStatus(status: unknown): string {
    return typeof status === 'string' ? status.trim().toLowerCase() : '';
  }
}
